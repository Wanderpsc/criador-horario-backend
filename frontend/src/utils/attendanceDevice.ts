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

export async function getAttendanceDeviceSecret(token: string): Promise<string | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(token);
    request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function saveAttendanceDeviceSecret(token: string, secret: string): Promise<void> {
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

export async function getAttendanceDeviceHeaders(token: string): Promise<Record<string, string>> {
  const secret = await getAttendanceDeviceSecret(token);
  return secret ? { 'X-Attendance-Device': secret } : {};
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
    if (existingSecret) {
      if (standalone) clearActivationTokenFromAddress();
      return;
    }

    const response = await axios.post(
      `${apiUrl}/attendance-links/public/${token}/device/bind`,
      { activationToken, installationTransfer: standalone }
    );
    await saveAttendanceDeviceSecret(token, response.data.deviceSecret);
    if (standalone) clearActivationTokenFromAddress();
  })();

  pendingActivations.set(activationKey, activation);
  void activation.then(
    () => pendingActivations.delete(activationKey),
    () => pendingActivations.delete(activationKey)
  );
  return activation;
}
