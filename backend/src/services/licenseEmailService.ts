/**
 * Serviço de Notificações por Email de Licenças
 * © 2025 Wander Pires Silva Coelho
 */

import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

interface LicenseData {
  key: string;
  userEmail: string;
  userName: string;
  expiresAt?: Date;
  maxSchools?: number;
  price?: number;
}

/**
 * Envia email de boas-vindas quando licença é criada
 */
export const sendLicenseCreatedEmail = async (data: LicenseData) => {
  const { userEmail, userName, key, expiresAt, maxSchools, price } = data;
  
  const expiryDate = expiresAt ? format(expiresAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Sem vencimento';
  
  const mailOptions = {
    from: `"EduSync-PRO - Sistema de Horários" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: '🎉 Sua Licença EduSync-PRO foi Criada!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .license-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
          .license-key { font-size: 18px; font-weight: bold; color: #667eea; font-family: monospace; letter-spacing: 2px; }
          .info-row { margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
          .info-label { font-weight: bold; color: #666; }
          .info-value { color: #333; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bem-vindo ao EduSync-PRO!</h1>
            <p>Sua licença foi criada com sucesso</p>
          </div>
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            <p>Sua licença do EduSync-PRO foi criada com sucesso! Aqui estão os detalhes:</p>
            
            <div class="license-box">
              <div class="info-row">
                <span class="info-label">🔑 Chave da Licença:</span><br>
                <span class="license-key">${key}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">📅 Data de Vencimento:</span><br>
                <span class="info-value">${expiryDate}</span>
              </div>
              
              ${maxSchools ? `
              <div class="info-row">
                <span class="info-label">🏫 Número Máximo de Escolas:</span><br>
                <span class="info-value">${maxSchools} escola(s)</span>
              </div>
              ` : ''}
              
              ${price ? `
              <div class="info-row">
                <span class="info-label">💰 Valor da Licença:</span><br>
                <span class="info-value">R$ ${price.toFixed(2)}</span>
              </div>
              ` : ''}
            </div>
            
            <p><strong>O que fazer agora?</strong></p>
            <ul>
              <li>Use a chave acima para ativar sua licença no sistema</li>
              <li>Acesse o painel administrativo e comece a criar horários escolares</li>
              <li>Em caso de dúvidas, entre em contato conosco</li>
            </ul>
            
            <center>
              <a href="${process.env.FRONTEND_URL}/login" class="button">Acessar Sistema</a>
            </center>
          </div>
          <div class="footer">
            <p>© 2025 Wander Pires Silva Coelho<br>
            wanderpsc@gmail.com - Todos os direitos reservados</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Envia email quando licença está próxima do vencimento (7 dias antes)
 */
export const sendLicenseExpiringEmail = async (data: LicenseData) => {
  const { userEmail, userName, key, expiresAt } = data;
  
  const expiryDate = expiresAt ? format(expiresAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '';
  const daysRemaining = expiresAt ? Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
  
  const mailOptions = {
    from: `"EduSync-PRO - Renovação" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `⏰ Sua Licença EduSync-PRO Vence em ${daysRemaining} Dias`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .license-key { font-family: monospace; background: #e0e0e0; padding: 5px 10px; border-radius: 4px; }
          .button { background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Atenção: Licença Próxima do Vencimento</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <div class="alert-box">
              <h3>⚠️ Sua licença está próxima do vencimento!</h3>
              <p><strong>Licença:</strong> <span class="license-key">${key}</span></p>
              <p><strong>Vence em:</strong> ${expiryDate} (${daysRemaining} dias)</p>
            </div>
            
            <p><strong>O que acontece quando a licença vence?</strong></p>
            <ul>
              <li>Você perderá acesso ao sistema</li>
              <li>Não poderá criar ou editar horários</li>
              <li>Seus dados serão mantidos por 30 dias para recuperação</li>
            </ul>
            
            <p><strong>Como renovar?</strong></p>
            <ul>
              <li>Entre em contato conosco para renovação</li>
              <li>Adquira uma nova licença</li>
              <li>Mantenha seu acesso ininterrupto</li>
            </ul>
            
            <center>
              <a href="mailto:wanderpsc@gmail.com" class="button">Renovar Agora</a>
            </center>
          </div>
          <div class="footer">
            <p>© 2025 Wander Pires Silva Coelho<br>
            wanderpsc@gmail.com - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Envia email quando licença expirou
 */
export const sendLicenseExpiredEmail = async (data: LicenseData) => {
  const { userEmail, userName, key, expiresAt } = data;
  
  const expiryDate = expiresAt ? format(expiresAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '';
  
  const mailOptions = {
    from: `"EduSync-PRO - Aviso Importante" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: '❌ Sua Licença EduSync-PRO Expirou',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .alert-box { background: #f8d7da; border-left: 4px solid #dc3545; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Licença Expirada</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <div class="alert-box">
              <h3>Sua licença expirou</h3>
              <p><strong>Licença:</strong> ${key}</p>
              <p><strong>Expirou em:</strong> ${expiryDate}</p>
            </div>
            
            <p><strong>Seu acesso foi suspenso temporariamente.</strong></p>
            <p>Seus dados permanecerão salvos por 30 dias. Para reativar seu acesso e continuar usando o EduSync-PRO, renove sua licença agora.</p>
            
            <center>
              <a href="mailto:wanderpsc@gmail.com?subject=Renovação de Licença - ${key}" class="button">Renovar Licença</a>
            </center>
          </div>
          <div class="footer">
            <p>© 2025 Wander Pires Silva Coelho<br>
            wanderpsc@gmail.com - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Envia email de renovação bem-sucedida
 */
export const sendLicenseRenewedEmail = async (data: LicenseData) => {
  const { userEmail, userName, key, expiresAt, price } = data;
  
  const expiryDate = expiresAt ? format(expiresAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '';
  
  const mailOptions = {
    from: `"EduSync-PRO - Confirmação" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: '✅ Licença EduSync-PRO Renovada com Sucesso!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Renovação Confirmada!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <div class="success-box">
              <h3>🎉 Sua licença foi renovada com sucesso!</h3>
              <p><strong>Licença:</strong> ${key}</p>
              <p><strong>Nova Data de Vencimento:</strong> ${expiryDate}</p>
              ${price ? `<p><strong>Valor Pago:</strong> R$ ${price.toFixed(2)}</p>` : ''}
            </div>
            
            <p>Agora você pode continuar aproveitando todos os recursos do EduSync-PRO sem interrupções!</p>
            
            <center>
              <a href="${process.env.FRONTEND_URL}/login" class="button">Acessar Sistema</a>
            </center>
          </div>
          <div class="footer">
            <p>© 2025 Wander Pires Silva Coelho<br>
            wanderpsc@gmail.com - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export default {
  sendLicenseCreatedEmail,
  sendLicenseExpiringEmail,
  sendLicenseExpiredEmail,
  sendLicenseRenewedEmail,
};
