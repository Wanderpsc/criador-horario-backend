import { Router, Request, Response } from 'express';
import Payment from '../models/Payment';
import User from '../models/User';
import mercadoPagoService from '../services/mercadoPago.service';

const router = Router();

/**
 * POST /api/payments/webhook
 * Recebe notificações do Mercado Pago sobre mudanças no status de pagamento
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    console.log('📨 Webhook recebido:', JSON.stringify(req.body, null, 2));
    
    const { type, data, action } = req.body;

    // Mercado Pago envia type e data.id
    if (!type || !data?.id) {
      console.log('⚠️ Webhook inválido: faltando type ou data.id');
      return res.status(400).json({ message: 'Dados inválidos' });
    }

    // Buscar informações completas do pagamento no Mercado Pago
    const result = await mercadoPagoService.processWebhookNotification(type, data.id);

    if (!result.success) {
      console.error('❌ Erro ao processar notificação:', result.error);
      return res.status(500).json({ message: result.error });
    }

    const mpPayment = result.data;
    console.log('💰 Dados do pagamento MP:', {
      id: mpPayment.id,
      status: mpPayment.status,
      external_reference: mpPayment.external_reference
    });

    // Buscar payment no banco pelo external_reference ou mercadoPagoId
    let payment = await Payment.findOne({
      $or: [
        { externalReference: mpPayment.external_reference },
        { mercadoPagoId: mpPayment.id?.toString() }
      ]
    });

    if (!payment) {
      console.log('⚠️ Pagamento não encontrado no banco:', mpPayment.external_reference);
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }

    console.log('✅ Pagamento encontrado:', payment._id);

    // Atualizar status do pagamento
    const oldStatus = payment.status;
    payment.mercadoPagoId = mpPayment.id?.toString();
    payment.mercadoPagoStatus = mpPayment.status;

    // Processar baseado no status
    if (mpPayment.status === 'approved' && payment.status !== 'approved') {
      console.log('🎉 Pagamento APROVADO! Ativando licença...');
      
      payment.status = 'approved';
      payment.approvedAt = new Date();
      await payment.save();

      // ATIVAR LICENÇA AUTOMATICAMENTE
      await activateLicenseForPayment(payment);

    } else if (mpPayment.status === 'rejected') {
      console.log('❌ Pagamento REJEITADO');
      
      payment.status = 'rejected';
      payment.rejectedReason = mpPayment.status_detail || 'Pagamento rejeitado';
      await payment.save();

    } else if (mpPayment.status === 'cancelled') {
      console.log('🚫 Pagamento CANCELADO');
      
      payment.status = 'cancelled';
      await payment.save();

    } else if (mpPayment.status === 'refunded') {
      console.log('💸 Pagamento REEMBOLSADO');
      
      payment.status = 'refunded';
      await payment.save();

      // SUSPENDER LICENÇA
      await suspendLicenseForPayment(payment);

    } else {
      console.log(`ℹ️ Status: ${mpPayment.status} (sem ação)`);
      await payment.save();
    }

    console.log(`📝 Status atualizado: ${oldStatus} → ${payment.status}`);

    // Retornar 200 OK para o Mercado Pago
    res.status(200).json({ success: true, message: 'Webhook processado' });

  } catch (error: any) {
    console.error('💥 Erro no webhook:', error);
    res.status(500).json({ 
      message: 'Erro ao processar webhook',
      error: error.message 
    });
  }
});

/**
 * Ativa a licença da escola após pagamento aprovado
 */
async function activateLicenseForPayment(payment: any) {
  try {
    const user = await User.findById(payment.schoolId);
    if (!user) {
      console.error('❌ Usuário não encontrado:', payment.schoolId);
      return;
    }

    // Calcular data de expiração baseada na duração
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + payment.durationMonths);

    // Atualizar usuário
    user.registrationStatus = 'approved';
    (user as any).plan = payment.plan;
    user.licenseExpiryDate = expiryDate;
    user.paymentStatus = 'paid';
    
    await user.save();

    console.log('✅ Licença ativada!', {
      school: user.schoolName,
      plan: payment.plan,
      expiryDate: expiryDate.toISOString()
    });

    // TODO: Enviar email de confirmação
    // await sendPaymentConfirmationEmail(user.email, payment);

  } catch (error) {
    console.error('❌ Erro ao ativar licença:', error);
  }
}

/**
 * Suspende a licença da escola após reembolso
 */
async function suspendLicenseForPayment(payment: any) {
  try {
    const user = await User.findById(payment.schoolId);
    if (!user) {
      console.error('❌ Usuário não encontrado:', payment.schoolId);
      return;
    }

    // Suspender acesso
    user.registrationStatus = 'suspended';
    user.paymentStatus = 'cancelled';
    
    await user.save();

    console.log('🚫 Licença suspensa:', user.schoolName);

    // TODO: Enviar email de notificação
    // await sendRefundNotificationEmail(user.email, payment);

  } catch (error) {
    console.error('❌ Erro ao suspender licença:', error);
  }
}

/**
 * GET /api/payments/webhook/test
 * Endpoint para testar o webhook localmente
 */
router.get('/webhook/test', async (req: Request, res: Response) => {
  res.json({
    message: 'Webhook endpoint está funcionando!',
    info: 'Configure esta URL no painel do Mercado Pago',
    url: `${process.env.WEBHOOK_URL || 'http://localhost:5000'}/api/payments/webhook`
  });
});

export default router;
