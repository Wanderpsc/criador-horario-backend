import axios from 'axios';

const DATABASE_NAME = 'edusync-attendance-device';
const STORE_NAME = 'credentials';
const DATABASE_VERSION = 1;
const pendingActivations = new Map<string, Promise<void>>();

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const LOCAL_FALLBACK_PREFIX = 'edusync-attendance-device:';

function readLocalFallbackSecret(token: string): string | null {
  try {
    return localStorage.getItem(`${LOCAL_FALLBACK_PREFIX}${token}`);
  } catch {
    return null;
  }
}

function writeLocalFallbackSecret(token: string, secret: string): boolean {
  try {
    localStorage.setItem(`${LOCAL_FALLBACK_PREFIX}${token}`, secret);
    return true;
  } catch {
    return false;
  }
}

async function readIndexedDbSecret(token: string): Promise<string | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(token);
    request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function writeIndexedDbSecret(token: string, secret: string): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(secret, token);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

// O segredo fica gravado no IndexedDB E no localStorage: em alguns celulares
// (modo privado, WebView, limpeza parcial de dados) um dos dois falha ou some,
// e perder o segredo faz o ponto aparecer como "link inválido".
export async function getAttendanceDeviceSecret(token: string): Promise<string | null> {
  let secret: string | null = null;
  try {
    secret = await readIndexedDbSecret(token);
  } catch (error) {
    console.error('IndexedDB indisponível para ler o segredo do dispositivo.', error);
  }
  if (secret) {
    writeLocalFallbackSecret(token, secret);
    return secret;
  }
  const fallback = readLocalFallbackSecret(token);
  if (fallback) {
    try {
      await writeIndexedDbSecret(token, fallback);
    } catch {
      // IndexedDB indisponível — o localStorage continua valendo
    }
  }
  return fallback;
}

export async function saveAttendanceDeviceSecret(token: string, secret: string): Promise<void> {
  const savedLocally = writeLocalFallbackSecret(token, secret);
  try {
    await writeIndexedDbSecret(token, secret);
  } catch (error) {
    console.error('IndexedDB indisponível para salvar o segredo do dispositivo.', error);
    if (!savedLocally) throw error;
  }
}

export async function getAttendanceDeviceHeaders(token: string): Promise<Record<string, string>> {
  try {
    const secret = await getAttendanceDeviceSecret(token);
    return secret ? { 'X-Attendance-Device': secret } : {};
  } catch {
    return {};
  }
}

export function getActivationTokenFromHash(): string {
  const searchToken = new URLSearchParams(window.location.search).get('activation');
  if (searchToken) return searchToken;
  const query = window.location.hash.split('?')[1] || '';
  return new URLSearchParams(query).get('activation') || '';
}

export function isEmbeddedMobileBrowser(): boolean {
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent)
    && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA\//i.test(userAgent);
  const isEmbedded = /;\s*wv\)|\bwv\b|WhatsApp|FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|GSA\//i.test(userAgent);
  return isEmbedded || (isIOS && !isSafari);
}

export function clearActivationTokenFromAddress(): void {
  const cleanHash = window.location.hash.split('?')[0];
  const search = new URLSearchParams(window.location.search);
  search.delete('activation');
  const cleanSearch = search.toString();
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${cleanHash}`
  );
}

export function isAttendancePwaStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;
}

export function activateAttendanceDevice(
  apiUrl: string,
  token: string,
  activationToken: string
): Promise<void> {
  const activationKey = `${token}:${activationToken}`;
  const pendingActivation = pendingActivations.get(activationKey);
  if (pendingActivation) return pendingActivation;

  const activation = (async () => {
    const standalone = isAttendancePwaStandalone();
    const existingSecret = await getAttendanceDeviceSecret(token);
    try {
      const response = await axios.post(
        `${apiUrl}/attendance-links/public/${token}/device/bind`,
        { activationToken, installationTransfer: standalone }
      );
      await saveAttendanceDeviceSecret(token, response.data.deviceSecret);
    } catch (error) {
      const alreadyRegistered = axios.isAxiosError(error)
        && error.response?.status === 409
        && error.response.data?.code === 'DEVICE_ALREADY_REGISTERED';
      if (!existingSecret || !alreadyRegistered) throw error;
    }
    if (standalone) clearActivationTokenFromAddress();
  })();

  pendingActivations.set(activationKey, activation);
  void activation.then(
    () => pendingActivations.delete(activationKey),
    () => pendingActivations.delete(activationKey)
  );
  return activation;
}
