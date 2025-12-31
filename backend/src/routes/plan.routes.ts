/**
 * Rotas de Planos de Assinatura
 * © 2025 Wander Pires Silva Coelho
 */

import express from 'express';
import { body } from 'express-validator';
import Plan from '../models/Plan';
import { auth, adminOnly, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Listar todos os planos (público)
router.get('/', async (req, res) => {
  try {
    const plans = await Plan.find().sort({ monthlyPrice: 1 });
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Listar planos ativos (público)
router.get('/active', async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ monthlyPrice: 1 });
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Buscar plano por ID
router.get('/:id', async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plano não encontrado' });
    }
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Criar plano (apenas admin)
router.post('/', auth, adminOnly,
  [
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('monthlyPrice').isNumeric().withMessage('Preço mensal deve ser numérico')
  ],
  async (req: AuthRequest, res: any) => {
    try {
      const plan = new Plan(req.body);
      await plan.save();
      res.status(201).json({ success: true, data: plan });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Atualizar plano (apenas admin)
router.put('/:id', auth, adminOnly, async (req: AuthRequest, res: any) => {
  try {
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plano não encontrado' });
    }
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Deletar plano (apenas admin)
router.delete('/:id', auth, adminOnly, async (req: AuthRequest, res: any) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plano não encontrado' });
    }
    res.json({ success: true, message: 'Plano excluído com sucesso' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
