import express from 'express';
import { body, validationResult } from 'express-validator';
import Timetable from '../models/Timetable';
import Teacher from '../models/Teacher';
import Subject from '../models/Subject';
import User from '../models/User';
import Pricing from '../models/Pricing';
import CreditTransaction from '../models/CreditTransaction';
import { auth, AuthRequest } from '../middleware/auth';
import { generateTimetable } from '../services/timetableGenerator';

const router = express.Router();

// Criar grade de horário
router.post('/', auth,
  [
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('year').isNumeric().withMessage('Ano deve ser um número'),
    body('semester').notEmpty().withMessage('Semestre é obrigatório'),
    body('scheduleId').notEmpty().withMessage('ID do horário é obrigatório')
  ],
  async (req: AuthRequest, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const timetable = new Timetable({
        ...req.body,
        userId: req.user!.id,
        grid: []
      });

      await timetable.save();
      res.status(201).json(timetable);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Gerar horário automaticamente
router.post('/:id/generate', auth, async (req: AuthRequest, res) => {
  try {
    const timetable = await Timetable.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!timetable) {
      return res.status(404).json({ message: 'Grade de horário não encontrada' });
    }

    // Buscar usuário para verificar modelo de pagamento
    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Se modelo é pay-per-use, verificar e cobrar créditos
    if (user.paymentModel === 'pay-per-use') {
      const { numberOfClasses } = req.body;

      if (!numberOfClasses || numberOfClasses < 1) {
        return res.status(400).json({ 
          message: 'Número de turmas é obrigatório para modelo pay-per-use',
          code: 'CLASSES_REQUIRED'
        });
      }

      // Calcular preço baseado no número de turmas
      const price = await Pricing.calculatePrice(numberOfClasses);

      // Verificar se tem créditos suficientes
      if (user.credits < price) {
        return res.status(402).json({ 
          message: `Créditos insuficientes. Necessário: R$ ${price.toFixed(2)}, Disponível: R$ ${user.credits.toFixed(2)}`,
          code: 'INSUFFICIENT_CREDITS',
          required: price,
          available: user.credits,
          deficit: price - user.credits
        });
      }

      // Descontar créditos ANTES de gerar
      const balanceBefore = user.credits;
      user.credits -= price;
      const balanceAfter = user.credits;
      user.totalTimetablesGenerated += 1;
      await user.save();

      // Registrar transação
      const transaction = new CreditTransaction({
        userId: user._id,
        type: 'usage',
        amount: -price,
        balanceBefore,
        balanceAfter,
        description: `Geração de horário para ${numberOfClasses} turma(s)`,
        numberOfClasses
      });
      await transaction.save();
    }

    // Chamar o novo serviço de geração
    const result = await generateTimetable({
      userId: req.user!.id,
      scheduleId: timetable.scheduleId.toString(),
      name: timetable.name,
      year: timetable.year,
      semester: timetable.semester,
      daysOfWeek: timetable.daysOfWeek,
      periodsPerDay: timetable.periodsPerDay,
      saturdayEquivalent: timetable.saturdayEquivalent,
      avoidConsecutive: true,
      distributeEvenly: true
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message, conflicts: result.conflicts });
    }

    // Buscar horário gerado
    const generatedTimetable = await Timetable.findById(result.timetableId);

    res.json({
      success: true,
      message: result.message,
      timetable: generatedTimetable,
      stats: result.stats,
      conflicts: result.conflicts
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Listar grades de horário
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    console.log('📅 GET /timetables - req.user.id:', req.user!.id);
    const timetables = await Timetable.find({ userId: req.user!.id })
      .populate('scheduleId');
    res.json(timetables);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Obter grade de horário por ID
router.get('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const timetable = await Timetable.findOne({ _id: req.params.id, userId: req.user!.id })
      .populate('scheduleId')
      .populate('grid.teacherId')
      .populate('grid.subjectId');
    if (!timetable) {
      return res.status(404).json({ message: 'Grade de horário não encontrada' });
    }
    res.json(timetable);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Atualizar grade de horário
router.put('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const timetable = await Timetable.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!timetable) {
      return res.status(404).json({ message: 'Grade de horário não encontrada' });
    }
    res.json(timetable);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Deletar grade de horário
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const timetable = await Timetable.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    if (!timetable) {
      return res.status(404).json({ message: 'Grade de horário não encontrada' });
    }
    res.json({ message: 'Grade de horário deletada com sucesso' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
