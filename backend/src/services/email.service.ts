/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * E-mail: wanderpsc@gmail.com
 * Todos os direitos reservados.
 */

import nodemailer from 'nodemailer';

// Configurar transporter usando Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export interface PaymentConfirmationData {
  schoolName: string;
  schoolEmail: string;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  planName: string;
  planDuration: number;
  licenseExpiryDate: Date;
}

export const sendPaymentConfirmationEmail = async (data: PaymentConfirmationData): Promise<boolean> => {
  try {
    const formattedDate = data.paymentDate.toLocaleDateString('pt-BR');
    const formattedAmount = data.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formattedExpiry = data.licenseExpiryDate.toLocaleDateString('pt-BR');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .info-label { font-weight: bold; color: #667eea; }
    .highlight { background: #667eea; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Pagamento Confirmado!</h1>
      <p>Sistema Criador de Horário de Aula Escolar</p>
    </div>
    
    <div class="content">
      <p>Olá <strong>${data.schoolName}</strong>,</p>
      
      <p>É com grande satisfação que confirmamos o recebimento do seu pagamento! 🎉</p>
      
      <div class="info-box">
        <h3 style="color: #667eea; margin-top: 0;">📋 Detalhes do Pagamento</h3>
        <div class="info-row">
          <span class="info-label">Valor Pago:</span>
          <span><strong>${formattedAmount}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Data:</span>
          <span>${formattedDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Método:</span>
          <span>${data.paymentMethod}</span>
        </div>
      </div>

      <div class="info-box">
        <h3 style="color: #667eea; margin-top: 0;">🎯 Sua Licença</h3>
        <div class="info-row">
          <span class="info-label">Plano:</span>
          <span><strong>${data.planName}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Duração:</span>
          <span>${data.planDuration} ${data.planDuration === 1 ? 'mês' : 'meses'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Válido até:</span>
          <span><strong>${formattedExpiry}</strong></span>
        </div>
      </div>

      <div class="highlight">
        <h3 style="margin: 0;">🚀 Seu sistema já está ativo!</h3>
        <p style="margin: 10px 0 0 0;">Acesse agora mesmo e comece a criar seus horários</p>
      </div>

      <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>🌐 Acesso ao Sistema:</strong></p>
        <p style="margin: 5px 0;">Login: <strong>${data.schoolEmail}</strong></p>
        <p style="margin: 5px 0;">Use sua senha cadastrada</p>
      </div>

      <p>Se tiver alguma dúvida, não hesite em nos contatar.</p>
      
      <p>Obrigado por escolher nosso sistema! 💙</p>
      
      <p style="margin-top: 30px;">
        <strong>Equipe Sistema Criador de Horário Escolar</strong><br>
        📧 wanderpsc@gmail.com
      </p>
    </div>

    <div class="footer">
      <p>© 2025 Wander Pires Silva Coelho - Todos os direitos reservados</p>
      <p>Este é um e-mail automático, por favor não responda.</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"Sistema de Horários Escolares" <${process.env.EMAIL_USER}>`,
      to: data.schoolEmail,
      subject: '✅ Pagamento Confirmado - Sua Licença está Ativa!',
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ E-mail de confirmação enviado para:', data.schoolEmail);
    return true;
  } catch (error: any) {
    console.error('❌ Erro ao enviar e-mail:', error);
    return false;
  }
};

/**
 * Envia notificação para o admin quando há um novo pagamento
 */
export const sendPaymentNotificationToAdmin = async (
  schoolName: string,
  schoolEmail: string,
  amount: number,
  plan: string,
  paymentMethod: string
): Promise<boolean> => {
  try {
    const formattedAmount = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const now = new Date().toLocaleString('pt-BR');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #28a745; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .info-label { font-weight: bold; color: #28a745; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Novo Pagamento Aprovado!</h1>
      <p>Sistema Criador de Horário de Aula Escolar</p>
    </div>
    
    <div class="content">
      <h3 style="color: #28a745;">📋 Dados do Cliente</h3>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Escola:</span>
          <span><strong>${schoolName}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">E-mail:</span>
          <span>${schoolEmail}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Valor Pago:</span>
          <span><strong>${formattedAmount}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Plano:</span>
          <span><strong>${plan.toUpperCase()}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Método:</span>
          <span>${paymentMethod === 'pix' ? 'PIX' : 'Cartão de Crédito'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Data/Hora:</span>
          <span>${now}</span>
        </div>
      </div>

      <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb;">
        <p style="margin: 0;"><strong>✅ Licença ativada automaticamente</strong></p>
        <p style="margin: 5px 0 0 0;">O cliente já pode acessar o sistema.</p>
      </div>

      <p style="margin-top: 30px;">
        <strong>Sistema Criador de Horário Escolar</strong><br>
        Notificação Automática
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"Sistema de Horários - Admin" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Envia para o próprio admin
      subject: `💰 Novo Pagamento: ${schoolName} - ${formattedAmount}`,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Notificação de pagamento enviada para admin');
    return true;
  } catch (error: any) {
    console.error('❌ Erro ao enviar notificação para admin:', error);
    return false;
  }
};

export const sendPaymentProofNotification = async (schoolName: string, adminEmail: string): Promise<boolean> => {
  try {
    const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #667eea;">📬 Novo Comprovante de Pagamento Recebido</h2>
    <p>A escola <strong>${schoolName}</strong> enviou um comprovante de pagamento para análise.</p>
    <p>Acesse o painel administrativo para revisar e confirmar o pagamento.</p>
    <p style="margin-top: 30px;">
      <strong>Sistema Criador de Horário Escolar</strong>
    </p>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"Sistema de Horários Escolares" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: '📬 Novo Comprovante de Pagamento - ' + schoolName,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Notificação enviada para admin:', adminEmail);
    return true;
  } catch (error: any) {
    console.error('❌ Erro ao enviar notificação:', error);
    return false;
  }
};
