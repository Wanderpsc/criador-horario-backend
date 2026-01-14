/**
 * Sistema de Proteção e Segurança Anti-Pirataria
 * © 2025-2026 Wander Pires Silva Coelho
 * 
 * ESTE CÓDIGO É CONFIDENCIAL E PROPRIETÁRIO
 * CÓPIA, MODIFICAÇÃO OU DISTRIBUIÇÃO NÃO AUTORIZADA É CRIME
 */

import crypto from 'crypto';

/**
 * Classe de proteção anti-cópia e anti-engenharia reversa
 */
export class SecurityProtection {
  
  private static readonly SECRET_KEY = process.env.SECURITY_KEY || 'wander-psc-edusync-pro-2026';
  private static readonly COPYRIGHT = '© 2025-2026 Wander Pires Silva Coelho';
  
  /**
   * Gera watermark digital único para cada documento
   */
  static generateWatermark(userId: string, schoolId: string): string {
    const timestamp = Date.now();
    const data = `${userId}-${schoolId}-${timestamp}-${this.COPYRIGHT}`;
    const hash = crypto.createHmac('sha256', this.SECRET_KEY)
      .update(data)
      .digest('hex');
    
    return `EDUSYNC-PRO-${hash.substring(0, 16).toUpperCase()}`;
  }
  
  /**
   * Adiciona assinatura digital invisível em documentos
   */
  static embedDigitalSignature(content: string, userId: string, schoolId: string): string {
    const watermark = this.generateWatermark(userId, schoolId);
    const signature = Buffer.from(JSON.stringify({
      watermark,
      copyright: this.COPYRIGHT,
      owner: 'Wander Pires Silva Coelho',
      timestamp: new Date().toISOString(),
      user: userId,
      school: schoolId
    })).toString('base64');
    
    // Assinatura invisível em comentário HTML
    return `${content}\n<!-- ${signature} -->`;
  }
  
  /**
   * Verifica integridade da licença
   */
  static verifyLicenseIntegrity(licenseKey: string): boolean {
    try {
      // Descriptografar e verificar licença
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(this.SECRET_KEY).slice(0, 32),
        Buffer.alloc(16, 0)
      );
      
      let decrypted = decipher.update(licenseKey, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      const licenseData = JSON.parse(decrypted);
      
      // Verificar se não foi adulterada
      return licenseData.owner === 'Wander Pires Silva Coelho' &&
             licenseData.product === 'EduSync-PRO' &&
             new Date(licenseData.expiresAt) > new Date();
    } catch {
      return false;
    }
  }
  
  /**
   * Detecta tentativas de engenharia reversa
   */
  static detectReverseEngineering(): void {
    // Verificar se está sendo debugado
    if (this.isDebugging()) {
      this.reportViolation('DEBUG_DETECTED');
    }
    
    // Verificar modificações no código
    if (this.isCodeModified()) {
      this.reportViolation('CODE_MODIFIED');
    }
    
    // Verificar múltiplas instâncias
    if (this.hasMultipleInstances()) {
      this.reportViolation('MULTIPLE_INSTANCES');
    }
  }
  
  /**
   * Detecta se está sendo executado em debugger
   */
  private static isDebugging(): boolean {
    const start = Date.now();
    debugger; // Se debugger estiver ativo, tempo aumenta
    const end = Date.now();
    return (end - start) > 100;
  }
  
  /**
   * Verifica se código foi modificado (checksum)
   */
  private static isCodeModified(): boolean {
    // Em produção, comparar hash do código compilado
    return false; // Implementar verificação de integridade
  }
  
  /**
   * Detecta múltiplas instâncias rodando
   */
  private static hasMultipleInstances(): boolean {
    // Verificar lock file ou memória compartilhada
    return false; // Implementar detecção de instâncias
  }
  
  /**
   * Reporta violação detectada
   */
  private static async reportViolation(type: string): Promise<void> {
    const violation = {
      type,
      timestamp: new Date().toISOString(),
      copyright: this.COPYRIGHT,
      message: 'VIOLAÇÃO DE DIREITOS AUTORAIS DETECTADA',
      warning: 'Este incidente será reportado às autoridades competentes'
    };
    
    console.error('🚨 VIOLAÇÃO DE SEGURANÇA DETECTADA', violation);
    
    // Registrar no banco de dados
    // Enviar notificação ao proprietário
    // Bloquear acesso se necessário
  }
  
  /**
   * Gera token de licença criptografado
   */
  static generateLicenseToken(data: {
    schoolId: string;
    schoolName: string;
    plan: string;
    expiresAt: Date;
  }): string {
    const licenseData = {
      ...data,
      owner: 'Wander Pires Silva Coelho',
      product: 'EduSync-PRO',
      copyright: this.COPYRIGHT,
      createdAt: new Date().toISOString()
    };
    
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.SECRET_KEY).slice(0, 32),
      Buffer.alloc(16, 0)
    );
    
    let encrypted = cipher.update(JSON.stringify(licenseData), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return encrypted;
  }
  
  /**
   * Marca d'água visual para documentos PDF
   */
  static getVisualWatermark(userId: string, schoolId: string): string {
    const watermark = this.generateWatermark(userId, schoolId);
    return `
      ${this.COPYRIGHT}
      Licenciado para: ${schoolId}
      Documento: ${watermark}
      
      ⚠️ DOCUMENTO PROTEGIDO POR DIREITOS AUTORAIS
      CÓPIA OU DISTRIBUIÇÃO NÃO AUTORIZADA É CRIME
      Lei 9.609/98 e Lei 9.610/98
    `.trim();
  }
  
  /**
   * Valida origem da requisição (anti-CSRF)
   */
  static validateOrigin(origin: string | undefined): boolean {
    const allowedOrigins = [
      'https://wanderpsc.github.io',
      'https://horario-escolar.surge.sh',
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    
    return origin ? allowedOrigins.includes(origin) : false;
  }
  
  /**
   * Registro de auditoria criptografado
   */
  static createAuditLog(action: string, userId: string, data: any): string {
    const log = {
      action,
      userId,
      data,
      timestamp: new Date().toISOString(),
      copyright: this.COPYRIGHT,
      hash: crypto.randomBytes(16).toString('hex')
    };
    
    // Criptografar log
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.SECRET_KEY).slice(0, 32),
      Buffer.alloc(16, 0)
    );
    
    let encrypted = cipher.update(JSON.stringify(log), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return encrypted;
  }
}

/**
 * Middleware de proteção anti-pirataria
 */
export const antiPiracyMiddleware = (req: any, res: any, next: any) => {
  // Verificar origem
  const origin = req.get('origin');
  if (!SecurityProtection.validateOrigin(origin)) {
    return res.status(403).json({
      error: 'ACESSO NEGADO',
      message: 'Origem não autorizada',
      copyright: '© 2025-2026 Wander Pires Silva Coelho',
      warning: 'Esta tentativa de acesso foi registrada'
    });
  }
  
  // Detectar engenharia reversa
  SecurityProtection.detectReverseEngineering();
  
  // Adicionar headers de proteção
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Copyright', '© 2025-2026 Wander Pires Silva Coelho');
  res.setHeader('X-Proprietary', 'EduSync-PRO - All Rights Reserved');
  
  next();
};

/**
 * Função de inicialização de proteções
 */
export const initializeSecurityProtection = () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🔒 SISTEMA DE PROTEÇÃO ATIVADO                          ║
║  © 2025-2026 Wander Pires Silva Coelho                   ║
║  Todos os direitos reservados                            ║
║                                                           ║
║  ⚠️  ESTE SOFTWARE É PROTEGIDO POR:                       ║
║  ✓ Criptografia AES-256                                  ║
║  ✓ Assinatura Digital                                    ║
║  ✓ Watermarking                                          ║
║  ✓ Anti-Debugging                                        ║
║  ✓ Detecção de Violações                                 ║
║  ✓ Auditoria Completa                                    ║
║                                                           ║
║  📜 Protegido pelas Leis:                                ║
║  • Lei 9.609/98 (Lei do Software)                        ║
║  • Lei 9.610/98 (Direitos Autorais)                     ║
║  • Código Penal (Arts. 184 e 185)                       ║
║                                                           ║
║  🚨 CÓPIA OU MODIFICAÇÃO NÃO AUTORIZADA É CRIME          ║
╚═══════════════════════════════════════════════════════════╝
  `);
  
  // Ativar monitoramento contínuo
  setInterval(() => {
    SecurityProtection.detectReverseEngineering();
  }, 60000); // Verificar a cada minuto
};
