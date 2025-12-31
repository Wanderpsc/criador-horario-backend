import { Router, Response } from 'express';
import Payment from '../models/Payment';
import User from '../models/User';
import mercadoPagoService from '../services/mercadoPago.service';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();

// Preços dos planos
const PLAN_PRICES: Record<string, number> = {
  trial: 0,
  micro: 49.90,
  basico: 99.00,
  profissional: 199.00,
  personalizado: 450.00, // Taxa base + R$150 por horário (calculado depois)
  enterprise: 0 // Sob consulta
};

/**
 * POST /api/payments/create
 * Cria uma nova solicitação de pagamento
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

    // Calcular valor total
    let basePrice = PLAN_PRICES[plan] || 0;
    
    // Para plano personalizado, adicionar custo de horários
    if (plan === 'personalizado' && timetableCount) {
      basePrice += timetableCount * 150;
    }

    const totalAmount = basePrice * durationMonths;

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
          installments: plan === 'enterprise' ? 12 : 6
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
    if (req.user?.role !== 'admin') {
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

export default router;
