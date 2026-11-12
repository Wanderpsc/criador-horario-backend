/**
 * Segredo JWT centralizado.
 * Em produção o servidor se recusa a subir sem JWT_SECRET definido —
 * nunca usar um valor padrão embutido no código (qualquer um poderia forjar tokens).
 * Fora de produção, se faltar, gera um segredo aleatório por execução
 * (os logins caem a cada reinício, mas nada é forjável).
 */
import crypto from 'crypto';

let cachedSecret: string | null = null;

export function getJwtSecret(): string {
  if (cachedSecret) return cachedSecret;
  const envSecret = process.env.JWT_SECRET;
  if (envSecret && envSecret.trim().length >= 16) {
    cachedSecret = envSecret;
    return cachedSecret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET não definido (ou muito curto) no ambiente de produção. ' +
      'Configure a variável JWT_SECRET no Render antes de iniciar o servidor.'
    );
  }
  console.warn('⚠️ JWT_SECRET ausente — usando segredo aleatório temporário (apenas desenvolvimento).');
  cachedSecret = crypto.randomBytes(32).toString('hex');
  return cachedSecret;
}
