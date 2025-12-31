/**
 * Copyright (c) 2025 Wander Pires Silva Coelho (wanderpsc@gmail.com)
 * PROPRIEDADE EXCLUSIVA - Todos os direitos reservados
 * USO NÃO AUTORIZADO É PROIBIDO POR LEI
 */

/**
 * Utilitário de Proteção Frontend
 * Adiciona camadas de segurança e identificação no código cliente
 */

/**
 * Gera fingerprint do navegador para rastreamento de instalação
 */
export function generateBrowserFingerprint(): string {
  const data = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    cores: navigator.hardwareConcurrency,
    screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    memory: (navigator as any).deviceMemory || 0,
  };

  const str = JSON.stringify(data);
  return btoa(str).substring(0, 32);
}

/**
 * Adiciona marca d'água invisível no DOM
 */
export function addDOMWatermark(): void {
  const watermark = document.createElement('div');
  watermark.id = '_wm_' + Date.now();
  watermark.style.cssText = 'position:fixed;bottom:-100px;left:-100px;font-size:1px;color:transparent;pointer-events:none;';
  watermark.textContent = `Protected by Wander Pires Silva Coelho - ${window.location.hostname} - ${new Date().toISOString()}`;
  document.body.appendChild(watermark);
}

/**
 * Desabilita ferramentas de desenvolvedor (básico)
 */
export function disableDevTools(): void {
  // Detecta abertura de DevTools
  const threshold = 160;
  const devtools = { open: false, orientation: null as any };

  const checkDevTools = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if (widthThreshold || heightThreshold) {
      if (!devtools.open) {
        console.log('\n');
        console.log('%c⚠️ AVISO DE SEGURANÇA', 'color: red; font-size: 24px; font-weight: bold;');
        console.log('%c🔒 Este sistema é protegido por direitos autorais', 'color: orange; font-size: 16px;');
        console.log('%cCopyright © 2025 Wander Pires Silva Coelho', 'color: blue; font-size: 14px;');
        console.log('%c📧 wanderpsc@gmail.com', 'color: blue; font-size: 14px;');
        console.log('\n%c⚖️ Tentativas de engenharia reversa são ILEGAIS', 'color: red; font-size: 14px; font-weight: bold;');
        console.log('%cO uso não autorizado pode resultar em ações legais.', 'color: orange; font-size: 12px;');
        console.log('\n');
      }
      devtools.open = true;
    } else {
      devtools.open = false;
    }
  };

  setInterval(checkDevTools, 1000);

  // Desabilita atalhos de DevTools
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if ((e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase()))) {
      e.preventDefault();
      return false;
    }
    // Ctrl+U (view source)
    if (e.ctrlKey && e.key.toUpperCase() === 'U') {
      e.preventDefault();
      return false;
    }
  });

  // Desabilita menu de contexto
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });
}

/**
 * Registra tentativas de cópia de código
 */
export function trackCopyAttempts(): void {
  let copyCount = 0;
  
  document.addEventListener('copy', () => {
    copyCount++;
    console.warn(`⚠️ Tentativa de cópia detectada (#${copyCount})`);
    console.warn('Este conteúdo é protegido por direitos autorais.');
    
    // Envia log para o backend
    fetch('/api/security/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'copy_attempt',
        count: copyCount,
        timestamp: new Date().toISOString(),
        url: window.location.href
      })
    }).catch(() => {});
  });
}

/**
 * Adiciona headers de copyright em todas as requisições
 */
export function addCopyrightHeaders(): void {
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const init = args[1] || {};
    init.headers = {
      ...init.headers,
      'X-Client-ID': generateBrowserFingerprint(),
      'X-Copyright': 'Wander Pires Silva Coelho',
      'X-Protected': 'true'
    };
    args[1] = init;
    return originalFetch.apply(this, args as any);
  };
}

/**
 * Inicializa todas as proteções
 */
export function initSecurityProtection(): void {
  // Adiciona marca d'água
  addDOMWatermark();
  
  // Adiciona headers
  addCopyrightHeaders();
  
  // Rastreia cópias
  trackCopyAttempts();
  
  // Desabilita DevTools (comentado por padrão - pode atrapalhar desenvolvimento)
  // disableDevTools();
  
  // Aviso no console
  console.log('\n');
  console.log('%c🔒 SISTEMA PROTEGIDO', 'color: white; background: red; font-size: 20px; padding: 10px; font-weight: bold;');
  console.log('%cCopyright © 2025 Wander Pires Silva Coelho', 'color: blue; font-size: 14px;');
  console.log('%c📧 wanderpsc@gmail.com', 'color: blue; font-size: 14px;');
  console.log('\n%c⚠️ AVISO LEGAL:', 'color: red; font-size: 16px; font-weight: bold;');
  console.log('%cEste software é protegido por leis de direitos autorais.', 'color: orange; font-size: 12px;');
  console.log('%cCópia, modificação ou distribuição não autorizadas são PROIBIDAS.', 'color: orange; font-size: 12px;');
  console.log('%cO uso não autorizado pode resultar em ações civis e criminais.', 'color: red; font-size: 12px; font-weight: bold;');
  console.log('\n');
}
