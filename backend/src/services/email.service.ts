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

// ─── Notificação de Ponto Eletrônico ─────────────────────────────────────────
export interface PontoNotificationData {
  personName: string;
  personEmail: string;
  schoolName: string;
  action: 'entry' | 'exit' | 'confirm';
  time: string;        // HH:mm
  date: string;        // DD/MM/YYYY
  locationValid?: boolean;
  lateArrivalMinutes?: number;
  earlyDepartureMinutes?: number;
}

export const sendPontoNotificationEmail = async (data: PontoNotificationData): Promise<void> => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) return; // silencioso se não configurado
  try {
    const actionLabel = data.action === 'entry' ? '📥 Entrada' : data.action === 'exit' ? '📤 Saída' : '✅ Presença';
    const actionColor = data.action === 'entry' ? '#16a34a' : data.action === 'exit' ? '#dc2626' : '#7c3aed';
    let statusLine = '';
    if (data.lateArrivalMinutes && data.lateArrivalMinutes > 0) {
      statusLine = `<p style="color:#dc2626;margin:8px 0;">⚠️ Atraso de <strong>${data.lateArrivalMinutes} min</strong></p>`;
    } else if (data.earlyDepartureMinutes && data.earlyDepartureMinutes > 0) {
      statusLine = `<p style="color:#d97706;margin:8px 0;">⚠️ Saída antecipada em <strong>${data.earlyDepartureMinutes} min</strong></p>`;
    } else if (data.action !== 'confirm') {
      statusLine = `<p style="color:#16a34a;margin:8px 0;">✅ No horário</p>`;
    }

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:20px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
    <div style="background:${actionColor};padding:24px;text-align:center;color:#fff;">
      <h1 style="margin:0;font-size:22px;">${actionLabel} Registrado</h1>
      <p style="margin:6px 0 0;font-size:14px;opacity:.9;">${data.schoolName}</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 4px;color:#6b7280;font-size:13px;">Funcionário / Professor</p>
      <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#111;">${data.personName}</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px;background:#f9fafb;border-radius:8px 8px 0 0;color:#374151;font-size:14px;border-bottom:1px solid #e5e7eb;">
            <strong>Data:</strong> ${data.date}
          </td>
        </tr>
        <tr>
          <td style="padding:10px;background:#f9fafb;border-radius:0 0 8px 8px;color:#374151;font-size:14px;">
            <strong>Horário:</strong> ${data.time}
          </td>
        </tr>
      </table>
      ${statusLine}
      ${data.locationValid === false ? '<p style="color:#dc2626;margin:8px 0;font-size:13px;">📍 Localização não validada</p>' : ''}
      <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        Este é um e-mail automático do Sistema de Ponto Eletrônico.<br>
        © 2025 Wander Pires Silva Coelho
      </p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Ponto Eletrônico" <${process.env.EMAIL_USER}>`,
      to: data.personEmail,
      subject: `${actionLabel} às ${data.time} — ${data.schoolName}`,
      html,
    });
    console.log(`✅ Notificação de ponto enviada para ${data.personEmail}`);
  } catch (err: any) {
    console.error('⚠️ Falha ao enviar notificação de ponto (não crítico):', err.message);
  }
};
