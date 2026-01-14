import { Router, Response, Request } from 'express';
import Payment from '../models/Payment';
import User from '../models/User';
import mercadoPagoService from '../services/mercadoPago.service';
import { auth, AuthRequest } from '../middleware/auth';
import { sendPaymentConfirmationEmail, sendPaymentNotificationToAdmin } from '../services/email.service';

const router = Router();

// Preços dos planos
const PLAN_PRICES: Record<string, number> = {
  basico: 119.90,
  profissional: 249.90
};

/**
 * POST /api/payments/create-public
 * Cria pagamento SEM autenticação (para cadastro inicial)
 */
router.post('/create-public', async (req: any, res: Response) => {
  try {
    const { plan, durationMonths, paymentMethod, email, schoolName } = req.body;

    if (!email || !schoolName) {
      return res.status(400).json({ 
        message: 'Email e nome da escola são obrigatórios' 
      });
    }

    // Buscar usuário pelo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        message: 'Escola não encontrada. Faça o cadastro primeiro.' 
      });
    }

    // Calcular valor total com descontos
    let basePrice = PLAN_PRICES[plan] || 0;
    let subtotal = basePrice * durationMonths;
    
    // Aplicar descontos por duração
    let discount = 0;
    if (durationMonths === 3) discount = 0.05; // 5%
    else if (durationMonths === 6) discount = 0.10; // 10%
    else if (durationMonths === 12) discount = 0.15; // 15%
    
    const totalAmount = subtotal * (1 - discount);

    // Gerar referência única
    const externalReference = `PAY-${Date.now()}-${user._id}`;

    // Criar registro de pagamento
    const payment = new Payment({
      schoolId: user._id,
      schoolName: user.schoolName || user.name,
      schoolEmail: user.email,
      plan,
      durationMonths,
      amount: totalAmount,
      paymentMethod,
      status: 'pending',
      externalReference,
      metadata: {}
    });

    await payment.save();

    // Configurar dados para Mercado Pago
    const notificationUrl = process.env.WEBHOOK_URL 
      ? `${process.env.WEBHOOK_URL}/api/payments/webhook`
      : undefined;

    const backUrls = {
      success: `${process.env.FRONTEND_URL}/payment-success?ref=${externalReference}`,
      failure: `${process.env.FRONTEND_URL}/payment-failure?ref=${externalReference}`,
      pending: `${process.env.FRONTEND_URL}/payment-pending?ref=${externalReference}`
    };

    let paymentData: any = {};

    if (paymentMethod === 'pix') {
      // Criar pagamento PIX
      try {
        const pixResult = await mercadoPagoService.createPixPayment({
          transaction_amount: totalAmount,
          description: `${plan.toUpperCase()} - ${durationMonths} mês(es) - ${user.schoolName || user.name}`,
          payment_method_id: 'pix',
          payer: {
            email: user.email,
            first_name: user.name || user.schoolName
          },
          external_reference: externalReference,
          notification_url: notificationUrl
        });

        if (!pixResult.success) {
          console.error('❌ [PUBLIC] Erro Mercado Pago PIX:', pixResult.error);
          
          // Criar pagamento "manual" para não bloquear o cadastro
          payment.status = 'pending_manual';
          payment.metadata = {
            ...payment.metadata,
            errorReason: 'Mercado Pago não disponível',
            errorDetails: pixResult.error,
            paymentMethod: 'pix'
          };
          await payment.save();
          
          return res.status(200).json({ 
            success: false,
            fallbackMode: true,
            paymentId: payment._id,
            message: '⚠️ Sistema de pagamento temporariamente indisponível. Seu cadastro foi salvo!',
            instructions: [
              '1. Seu cadastro foi registrado com sucesso',
              '2. Entre em contato conosco para finalizar o pagamento',
              '3. Sua licença será liberada após confirmação',
              '4. Email: wanderpsc@gmail.com',
              `5. Referência: ${externalReference}`
            ],
            contact: {
              email: 'wanderpsc@gmail.com',
              whatsapp: '(00) 00000-0000'
            },
            paymentInfo: {
              plan: plan.toUpperCase(),
              amount: totalAmount,
              duration: `${durationMonths} mês(es)`,
              reference: externalReference
            }
          });
        }

        // Atualizar payment com dados do PIX
        if (pixResult.data) {
          payment.mercadoPagoId = pixResult.data.id;
          payment.mercadoPagoStatus = pixResult.data.status;
          payment.pixQRCode = pixResult.data.qrCode;
          payment.pixQRCodeBase64 = pixResult.data.qrCodeBase64;
          payment.pixCopyPaste = pixResult.data.qrCode;
          await payment.save();

          paymentData = {
            success: true,
            paymentId: payment._id,
            externalReference,
            method: 'pix',
            amount: totalAmount,
            qrCode: pixResult.data.qrCode,
            qrCodeBase64: pixResult.data.qrCodeBase64,
            mercadoPagoId: pixResult.data.id
          };
        }

        return res.json(paymentData);
      
      } catch (pixError: any) {
        console.error('❌ [PUBLIC] Exceção ao criar PIX:', pixError);
        
        // Fallback em caso de exceção
        payment.status = 'pending_manual';
        payment.metadata = {
          ...payment.metadata,
          errorReason: 'Exceção no Mercado Pago',
          errorMessage: pixError.message
        };
        await payment.save();
        
        return res.status(200).json({ 
          success: false,
          fallbackMode: true,
          paymentId: payment._id,
          message: '⚠️ Sistema de pagamento temporariamente indisponível',
          instructions: [
            'Seu cadastro foi registrado com sucesso',
            'Entre em contato: wanderpsc@gmail.com',
            `Referência: ${externalReference}`
          ],
          contact: { email: 'wanderpsc@gmail.com' },
          paymentInfo: {
            plan: plan.toUpperCase(),
            amount: totalAmount,
            duration: `${durationMonths} mês(es)`
          }
        });
      }

    } else {
      // Criar preferência para cartão
      try {
        console.log('🔵 [PAYMENT] Criando preferência de cartão...');
        console.log('💳 [PAYMENT] External Reference:', externalReference);
        console.log('💳 [PAYMENT] Valor:', totalAmount);
        console.log('💳 [PAYMENT] Notification URL:', notificationUrl || 'não configurado');
      
      const preferenceData: any = {
        items: [{
          title: `Plano ${plan.toUpperCase()}`,
          description: `Assinatura ${durationMonths} mês(es)`,
          quantity: 1,
          unit_price: totalAmount,
          currency_id: 'BRL'
        }],
        payer: {
          name: user.name || user.schoolName,
          email: user.email
        },
        external_reference: externalReference
      };

      // Adicionar back_urls e auto_return apenas se FRONTEND_URL estiver configurado
      if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost')) {
        preferenceData.back_urls = backUrls;
        preferenceData.auto_return = 'approved';
      }

      // Adicionar notification_url apenas se estiver configurado
      if (notificationUrl) {
        preferenceData.notification_url = notificationUrl;
      }

      const preferenceResult = await mercadoPagoService.createPreference(preferenceData);

      if (!preferenceResult.success) {
        console.error('❌ [PAYMENT] Erro na preferência:', preferenceResult.error);
        console.error('❌ [PAYMENT] Detalhes:', preferenceResult.details);
        return res.status(500).json({ 
          success: false,
          message: 'Erro ao criar preferência de pagamento',
          error: preferenceResult.error,
          details: preferenceResult.details
        });
      }

      console.log('✅ [PAYMENT] Preferência criada!');
      console.log('✅ [PAYMENT] Init Point:', preferenceResult.data.init_point);

      // Atualizar payment
      if (preferenceResult.data) {
        payment.mercadoPagoId = preferenceResult.data.id;
        await payment.save();

        paymentData = {
          success: true,
          paymentId: payment._id,
          externalReference,
          method: 'credit_card',
          amount: totalAmount,
          initPoint: preferenceResult.data.init_point,
          preferenceId: preferenceResult.data.id
        };
      }

      return res.json(paymentData);
      
      } catch (cardError: any) {
        console.error('❌ [PUBLIC] Exceção ao criar preferência de cartão:', cardError);
        
        // Fallback em caso de exceção no cartão
        payment.status = 'pending_manual';
        payment.metadata = {
          ...payment.metadata,
          errorReason: 'Exceção no Mercado Pago (Cartão)',
          errorMessage: cardError.message
        };
        await payment.save();
        
        return res.status(200).json({ 
          success: false,
          fallbackMode: true,
          paymentId: payment._id,
          message: '⚠️ Sistema de pagamento temporariamente indisponível',
          instructions: [
            'Seu cadastro foi registrado com sucesso',
            'Entre em contato: wanderpsc@gmail.com',
            `Referência: ${externalReference}`
          ],
          contact: { email: 'wanderpsc@gmail.com' },
          paymentInfo: {
            plan: plan.toUpperCase(),
            amount: totalAmount,
            duration: `${durationMonths} mês(es)`
          }
        });
      }
    }
  } catch (error: any) {
    console.error('Erro ao criar pagamento público:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar pagamento',
      error: error.message
    });
  }
});

/**
 * POST /api/payments/create
 * Cria uma nova solicitação de pagamento (COM autenticação)
 */
router.post('/create', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { plan, durationMonths, paymentMethod, timetableCount } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Buscar dados do usuário/escola
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Calcular valor total com descontos
    let basePrice = PLAN_PRICES[plan] || 0;
    let subtotal = basePrice * durationMonths;
    
    // Aplicar descontos por duração
    let discount = 0;
    if (durationMonths === 3) discount = 0.05; // 5%
    else if (durationMonths === 6) discount = 0.10; // 10%
    else if (durationMonths === 12) discount = 0.15; // 15%
    
    const totalAmount = subtotal * (1 - discount);

    // Gerar referência única
    const externalReference = `PAY-${Date.now()}-${userId}`;

    // Criar registro de pagamento
    const payment = new Payment({
      schoolId: userId,
      schoolName: user.schoolName || user.name,
      schoolEmail: user.email,
      plan,
      durationMonths,
      amount: totalAmount,
      paymentMethod,
      status: 'pending',
      externalReference,
      metadata: { timetableCount }
    });

    await payment.save();

    // Configurar dados para Mercado Pago
    const notificationUrl = process.env.WEBHOOK_URL 
      ? `${process.env.WEBHOOK_URL}/api/payments/webhook`
      : undefined;

    const backUrls = {
      success: `${process.env.FRONTEND_URL}/payment-success?ref=${externalReference}`,
      failure: `${process.env.FRONTEND_URL}/payment-failure?ref=${externalReference}`,
      pending: `${process.env.FRONTEND_URL}/payment-pending?ref=${externalReference}`
    };

    let paymentData: any = {};

    if (paymentMethod === 'pix') {
      // Criar pagamento PIX
      const pixResult = await mercadoPagoService.createPixPayment({
        transaction_amount: totalAmount,
        description: `${plan.toUpperCase()} - ${durationMonths} mês(es) - ${user.schoolName || user.name}`,
        payment_method_id: 'pix',
        payer: {
          email: user.email,
          first_name: user.name || user.schoolName
        },
        external_reference: externalReference,
        notification_url: notificationUrl
      });

      if (!pixResult.success) {
        return res.status(500).json({ 
          message: 'Erro ao gerar PIX',
          error: pixResult.error 
        });
      }

      // Atualizar payment com dados do PIX
      if (pixResult.data) {
        payment.mercadoPagoId = pixResult.data.id;
        payment.mercadoPagoStatus = pixResult.data.status;
        payment.pixQRCode = pixResult.data.qrCode;
        payment.pixQRCodeBase64 = pixResult.data.qrCodeBase64;
        payment.pixCopyPaste = pixResult.data.qrCode;
        await payment.save();

        paymentData = {
          paymentId: payment._id,
          externalReference,
          method: 'pix',
          amount: totalAmount,
          qrCode: pixResult.data.qrCode,
          qrCodeBase64: pixResult.data.qrCodeBase64,
          mercadoPagoId: pixResult.data.id
        };
      }

    } else {
      // Criar preferência para cartão/boleto
      const preferenceResult = await mercadoPagoService.createPreference({
        items: [{
          title: `Plano ${plan.toUpperCase()}`,
          description: `Assinatura ${durationMonths} mês(es) - ${user.schoolName || user.name}`,
          quantity: 1,
          unit_price: totalAmount,
          currency_id: 'BRL'
        }],
        payer: {
          name: user.name || user.schoolName,
          email: user.email
        },
        back_urls: backUrls,
        auto_return: 'approved',
        external_reference: externalReference,
        notification_url: notificationUrl,
        payment_methods: {
          installments: 6
        }
      });

      if (!preferenceResult.success) {
        return res.status(500).json({ 
          message: 'Erro ao criar preferência de pagamento',
          error: preferenceResult.error 
        });
      }

      // Atualizar payment com dados da preferência
      payment.preferenceId = preferenceResult.data.id;
      payment.paymentLink = preferenceResult.data.init_point;
      await payment.save();

      paymentData = {
        paymentId: payment._id,
        externalReference,
        method: paymentMethod,
        amount: totalAmount,
        preferenceId: preferenceResult.data.id,
        paymentLink: preferenceResult.data.init_point,
        sandboxLink: preferenceResult.data.sandbox_init_point
      };
    }

    res.json({
      success: true,
      message: 'Pagamento criado com sucesso',
      data: paymentData
    });

  } catch (error: any) {
    console.error('Erro ao criar pagamento:', error);
    res.status(500).json({ 
      message: 'Erro ao criar pagamento',
      error: error.message 
    });
  }
});

/**
 * GET /api/payments/:id
 * Consulta status de um pagamento
 */
router.get('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }

    // Verificar se o usuário tem permissão
    if (payment.schoolId.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Se tiver mercadoPagoId, buscar status atualizado
    if (payment.mercadoPagoId) {
      const statusResult = await mercadoPagoService.getPaymentStatus(payment.mercadoPagoId);
      
      if (statusResult.success) {
        const mpStatus = statusResult.data.status;
        
        // Atualizar status se mudou
        if (mpStatus === 'approved' && payment.status !== 'approved') {
          payment.status = 'approved';
          payment.mercadoPagoStatus = mpStatus;
          payment.approvedAt = new Date();
          await payment.save();
        } else if (mpStatus === 'rejected' && payment.status !== 'rejected') {
          payment.status = 'rejected';
          payment.mercadoPagoStatus = mpStatus;
          payment.rejectedReason = statusResult.data.status_detail;
          await payment.save();
        }
      }
    }

    res.json({ success: true, data: payment });

  } catch (error: any) {
    console.error('Erro ao buscar pagamento:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar pagamento',
      error: error.message 
    });
  }
});

/**
 * GET /api/payments/school/:schoolId
 * Lista todos os pagamentos de uma escola
 */
router.get('/school/:schoolId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId } = req.params;

    // Verificar permissão
    if (schoolId !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const payments = await Payment.find({ schoolId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: payments });

  } catch (error: any) {
    console.error('Erro ao listar pagamentos:', error);
    res.status(500).json({ 
      message: 'Erro ao listar pagamentos',
      error: error.message 
    });
  }
});

/**
 * GET /api/payments/admin/all
 * Lista todos os pagamentos (apenas admin)
 */
router.get('/admin/all', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super-admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const { status, page = 1, limit = 50 } = req.query;
    
    const query: any = {};
    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Payment.countDocuments(query);

    res.json({ 
      success: true, 
      data: payments,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error: any) {
    console.error('Erro ao listar pagamentos admin:', error);
    res.status(500).json({ 
      message: 'Erro ao listar pagamentos',
      error: error.message 
    });
  }
});

/**
 * POST /api/payments/webhook
 * Webhook do Mercado Pago para notificações de pagamento
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    console.log('📩 Webhook recebido:', JSON.stringify(req.body, null, 2));
    
    const { type, data } = req.body;
    
    // Mercado Pago envia notificações do tipo "payment"
    if (type === 'payment') {
      const paymentId = data.id;
      
      console.log('💰 Consultando pagamento:', paymentId);
      
      // Buscar detalhes do pagamento no Mercado Pago
      const mpResponse = await mercadoPagoService.getPaymentStatus(paymentId);
      
      console.log('✅ Status do MP:', mpResponse.status);
      
      // Atualizar no banco de dados
      const payment = await Payment.findOne({ mercadoPagoId: paymentId.toString() });
      
      if (payment) {
        payment.status = mpResponse.status;
        
        // Se aprovado, ativar licença da escola
        if (mpResponse.status === 'approved' && payment.status !== 'approved') {
          payment.approvedAt = new Date();
          
          // Buscar escola pelo email
          const school = await User.findOne({ email: payment.schoolEmail });
          
          if (school) {
            // Ativar licença
            school.approvedByAdmin = true;
            school.registrationStatus = 'approved';
            school.licenseActive = true;
            
            // Calcular data de expiração
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + payment.durationMonths);
            school.licenseExpiryDate = expiryDate;
            
            school.plan = payment.plan;
            
            await school.save();
            
            console.log('✅ Licença ativada automaticamente para:', school.email);
            
            // Enviar email de confirmação para o cliente
            await sendPaymentConfirmationEmail({
              schoolName: school.schoolName || school.name,
              schoolEmail: school.email,
              amount: payment.amount,
              paymentMethod: payment.paymentMethod === 'pix' ? 'PIX' : 'Cartão de Crédito',
              paymentDate: new Date(),
              planName: payment.plan.toUpperCase(),
              planDuration: payment.durationMonths,
              licenseExpiryDate: expiryDate
            });
            
            // Enviar notificação para o admin
            await sendPaymentNotificationToAdmin(
              school.schoolName || school.name,
              school.email,
              payment.amount,
              payment.plan,
              payment.paymentMethod
            );
          }
        }
        
        await payment.save();
        console.log('✅ Pagamento atualizado no banco');
      }
    }
    
    // Sempre retornar 200 para o Mercado Pago
    res.status(200).json({ success: true });
    
  } catch (error: any) {
    console.error('❌ Erro no webhook:', error);
    // Retornar 200 mesmo com erro para não reenviar
    res.status(200).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/payments/:id/approve
 * Aprovar pagamento manualmente e ativar licença
 */
router.put('/:id/approve', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super-admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }

    // Atualizar status do pagamento
    payment.status = 'approved';
    payment.approvedAt = new Date();
    await payment.save();

    // Buscar e ativar licença da escola
    const school = await User.findOne({ email: payment.schoolEmail });
    
    if (school) {
      school.approvedByAdmin = true;
      school.registrationStatus = 'approved';
      school.licenseActive = true;
      
      // Calcular data de expiração
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + payment.durationMonths);
      school.licenseExpiryDate = expiryDate;
      
      school.plan = payment.plan;
      
      await school.save();
      
      console.log('✅ Licença ativada manualmente para:', school.email);
      
      // Enviar email de confirmação para o cliente
      await sendPaymentConfirmationEmail({
        schoolName: school.schoolName || school.name,
        schoolEmail: school.email,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod === 'pix' ? 'PIX' : 'Cartão de Crédito',
        paymentDate: new Date(),
        planName: payment.plan.toUpperCase(),
        planDuration: payment.durationMonths,
        licenseExpiryDate: expiryDate
      });
      
      // Enviar notificação para o admin
      await sendPaymentNotificationToAdmin(
        school.schoolName || school.name,
        school.email,
        payment.amount,
        payment.plan,
        payment.paymentMethod
      );
    }

    res.json({ 
      success: true,
      message: 'Pagamento aprovado e licença ativada com sucesso',
      data: payment
    });

  } catch (error: any) {
    console.error('Erro ao aprovar pagamento:', error);
    res.status(500).json({ 
      message: 'Erro ao aprovar pagamento',
      error: error.message 
    });
  }
});

/**
 * DELETE /api/payments/:id
 * Excluir pagamento (admin)
 */
router.delete('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se é admin
    if (req.user?.role !== 'admin' && req.user?.role !== 'super-admin') {
      return res.status(403).json({ 
        message: 'Acesso negado. Apenas administradores podem excluir pagamentos.' 
      });
    }

    const payment = await Payment.findById(id);
    
    if (!payment) {
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }

    await Payment.findByIdAndDelete(id);
    
    console.log('🗑️  Pagamento excluído:', {
      id,
      schoolName: payment.schoolName,
      amount: payment.amount,
      status: payment.status
    });

    res.json({ 
      success: true,
      message: 'Pagamento excluído com sucesso' 
    });

  } catch (error: any) {
    console.error('Erro ao excluir pagamento:', error);
    res.status(500).json({ 
      message: 'Erro ao excluir pagamento',
      error: error.message 
    });
  }
});

export default router;
