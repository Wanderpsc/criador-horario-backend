/**
 * ============================================
 * PROTEÇÃO DE CÓDIGO E DIREITOS AUTORAIS
 * ============================================
 * 
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * E-mail: wanderpsc@gmail.com
 * 
 * TODOS OS DIREITOS RESERVADOS
 * 
 * Este código-fonte é propriedade exclusiva do autor e está protegido
 * por leis de direitos autorais brasileiras e internacionais.
 * 
 * ⚠️ PROIBIDO:
 * - Copiar, modificar ou distribuir este código
 * - Usar comercialmente sem autorização expressa
 * - Remover este aviso de copyright
 * - Realizar engenharia reversa
 * 
 * ✅ PERMITIDO APENAS:
 * - Uso interno pelo proprietário e equipe autorizada
 * - Consulta para fins de manutenção contratada
 * 
 * Qualquer violação será tratada judicialmente conforme Lei nº 9.609/98.
 * 
 * Para licenciamento comercial: wanderpsc@gmail.com
 * ============================================
 */

export const COPYRIGHT = {
  owner: 'Wander Pires Silva Coelho',
  email: 'wanderpsc@gmail.com',
  year: 2025,
  rights: 'Todos os direitos reservados',
  license: 'Proprietary License',
  
  display: () => {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  Sistema Criador de Horário de Aula Escolar              ║');
    console.log('║  © 2025 Wander Pires Silva Coelho                        ║');
    console.log('║  Todos os direitos reservados.                           ║');
    console.log('║                                                           ║');
    console.log('║  ⚠️  CÓDIGO PROPRIETÁRIO - USO NÃO AUTORIZADO PROIBIDO  ║');
    console.log('║  📧 wanderpsc@gmail.com                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  },
  
  getHeader: () => {
    return `
/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * E-mail: wanderpsc@gmail.com
 * Todos os direitos reservados.
 */
`;
  }
};

export const SECURITY_INFO = {
  version: '1.0.0',
  lastUpdate: '2025-01-04',
  
  protections: [
    '✅ JWT Authentication',
    '✅ Bcrypt Password Hashing',
    '✅ Rate Limiting',
    '✅ Helmet.js Security Headers',
    '✅ CORS Protection',
    '✅ NoSQL Injection Prevention',
    '✅ XSS Protection',
    '✅ HPP Protection',
    '✅ Input Validation',
    '✅ MongoDB Atlas Encryption',
    '✅ Environment Variables Protection',
  ],
  
  display: () => {
    console.log('\n🔒 MEDIDAS DE SEGURANÇA ATIVAS:');
    SECURITY_INFO.protections.forEach(p => console.log(`   ${p}`));
    console.log('');
  }
};

// Impedir que o módulo seja modificado
Object.freeze(COPYRIGHT);
Object.freeze(SECURITY_INFO);
