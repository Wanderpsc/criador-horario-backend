/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Rotas de Gerenciamento de Créditos e Precificação
 */

import express from 'express';
import User from '../models/User';
import Pricing from '../models/Pricing';
import CreditTransaction from '../models/CreditTransaction';
import { auth, isPlatformAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/pricing
 * Lista todas as faixas de preço ativas
 */
router.get('/pricing', async (req: any, res) => {
  try {
    const pricingTiers = await Pricing.find({ active: true }).sort({ minClasses: 1 });
    res.json(pricingTiers);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/pricing/calculate
 * Calcula o preço para um número específico de turmas
 */
router.post('/pricing/calculate', async (req: any, res) => {
  try {
    const { numberOfClasses } = req.body;

    if (!numberOfClasses || numberOfClasses < 1) {
      return res.status(400).json({ message: 'Número de turmas inválido' });
    }

    const price = await Pricing.calculatePrice(numberOfClasses);

    res.json({
      numberOfClasses,
      price,
      currency: 'BRL'
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/credits/balance
 * Consulta saldo de créditos do usuário
 */
router.get('/credits/balance', auth, async (req: any, res) => {
  try {
    const userId = req.user.schoolId || req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json({
      credits: user.credits,
      paymentModel: user.paymentModel,
      totalTimetablesGenerated: user.totalTimetablesGenerated
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/credits/transactions
 * Lista histórico de transações de créditos
 */
router.get('/credits/transactions', auth, async (req: any, res) => {
  try {
    const userId = req.user.schoolId || req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const transactions = await CreditTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .skip((parseInt(page as string) - 1) * parseInt(limit as string));

    const total = await CreditTransaction.countDocuments({ userId });

    res.json({
      transactions,
      currentPage: parseInt(page as string),
      totalPages: Math.ceil(total / parseInt(limit as string)),
      totalTransactions: total
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/credits/purchase
 * SEGURANÇA: desativado para o usuário final — permitia creditar saldo sem
 * pagamento verificado. Créditos entram pelo fluxo de pagamento (webhook)
 * ou manualmente pelo admin da plataforma em /admin/credits/add.
 */
router.post('/credits/purchase', auth, async (req: any, res) => {
  return res.status(410).json({
    message: 'Compra direta de créditos foi desativada. Use o fluxo de pagamento do sistema ou contate o suporte.',
  });
});

/**
 * POST /api/admin/credits/add (Admin only)
 * Adicionar créditos manualmente para um usuário
 */
router.post('/admin/credits/add', auth, async (req: any, res) => {
  try {
    if (!isPlatformAdmin(req.user)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const { userId, amount, description } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Dados inválidos' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const balanceBefore = user.credits;
    user.credits += amount;
    const balanceAfter = user.credits;

    await user.save();

    // Registrar transação
    const transaction = new CreditTransaction({
      userId,
      type: 'bonus',
      amount,
      balanceBefore,
      balanceAfter,
      description: description || `Bônus de ${amount} crédito(s) adicionado pelo admin`
    });

    await transaction.save();

    res.json({
      success: true,
      message: 'Créditos adicionados com sucesso',
      newBalance: balanceAfter,
      transaction
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/admin/pricing (Admin only)
 * Criar nova faixa de preço
 */
router.post('/admin/pricing', auth, async (req: any, res) => {
  try {
    if (!isPlatformAdmin(req.user)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const { name, description, minClasses, maxClasses, pricePerTimetable } = req.body;

    const pricing = new Pricing({
      name,
      description,
      minClasses,
      maxClasses,
      pricePerTimetable,
      active: true
    });

    await pricing.save();

    res.status(201).json({
      success: true,
      message: 'Faixa de preço criada com sucesso',
      pricing
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/admin/pricing/:id (Admin only)
 * Atualizar faixa de preço
 */
router.put('/admin/pricing/:id', auth, async (req: any, res) => {
  try {
    if (!isPlatformAdmin(req.user)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const { id } = req.params;
    const updates = req.body;

    const pricing = await Pricing.findByIdAndUpdate(id, updates, { new: true });

    if (!pricing) {
      return res.status(404).json({ message: 'Faixa de preço não encontrada' });
    }

    res.json({
      success: true,
      message: 'Faixa de preço atualizada com sucesso',
      pricing
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
