/**
 * Logger Condicional - Só loga em desenvolvimento
 * Evita vazamento de informações sensíveis em produção
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = {
  /**
   * Log informativo - apenas em development
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log de erro - sempre exibe, mas sem detalhes sensíveis em produção
   */
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args);
    } else {
      // Em produção, log simplificado sem stack traces ou dados sensíveis
      console.error('[ERROR]', new Date().toISOString());
    }
  },

  /**
   * Log de aviso - sempre exibe
   */
  warn: (...args: any[]) => {
    console.warn(...args);
  },

  /**
   * Log de debug - APENAS em development
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug('🐛 [DEBUG]', ...args);
    }
  },

  /**
   * Log de sucesso - apenas em development
   */
  success: (...args: any[]) => {
    if (isDevelopment) {
      console.log('✅', ...args);
    }
  },

  /**
   * Log de informação estruturada - apenas em development
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info('ℹ️', ...args);
    }
  },

  /**
   * Log de operação crítica - sempre exibe (para auditoria)
   */
  audit: (action: string, details: any) => {
    const timestamp = new Date().toISOString();
    if (isDevelopment) {
      console.log(`📝 [AUDIT] ${timestamp} - ${action}`, details);
    } else {
      // Em produção, apenas log da ação sem detalhes sensíveis
      console.log(`[AUDIT] ${timestamp} - ${action}`);
    }
  }
};

export default logger;
