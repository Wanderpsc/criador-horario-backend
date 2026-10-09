export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PROMPT_READY_EVENT = 'pwa-install-prompt-ready';
let capturedPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;

export function initializePwaInstallPromptCapture(): void {
  if (initialized) return;
  initialized = true;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    capturedPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event(PROMPT_READY_EVENT));
  });
}

export function getCapturedPwaInstallPrompt(): BeforeInstallPromptEvent | null {
  return capturedPrompt;
}

export function clearCapturedPwaInstallPrompt(): void {
  capturedPrompt = null;
}

export function subscribeToPwaInstallPrompt(listener: () => void): () => void {
  window.addEventListener(PROMPT_READY_EVENT, listener);
  return () => window.removeEventListener(PROMPT_READY_EVENT, listener);
}
