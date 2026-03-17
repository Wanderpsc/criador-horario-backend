/**
 * Rotas de Grades/Séries
 * © 2025 Wander Pires Silva Coelho
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { auth } from '../middleware/auth';
import Grade from '../models/Grade';

const router = express.Router();

const getScopedUserIds = (req: any): string[] => {
  const ownerUserId = req.user?.schoolId || req.user?.id;
  const actorUserId = req.user?.id;
  return Array.from(new Set([ownerUserId, actorUserId].filter(Boolean).map((id) => String(id))));
};

const getOwnerUserId = (req: any): string => String(req.user?.schoolId || req.user?.id || '');

// Listar todas as séries do usuário
router.get('/', auth, async (req: any, res: any) => {
  try {
    const scopedUserIds = getScopedUserIds(req);
    const grades = await Grade.find({ userId: { $in: scopedUserIds }, isActive: true })
      .sort({ order: 1 });
    
    res.json({ data: grades });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Listar todas as séries de um usuário específico
router.get('/user/:userId', auth, async (req: any, res: any) => {
  try {
    const scopedUserIds = getScopedUserIds(req);
    const grades = await Grade.find({ userId: { $in: scopedUserIds }, isActive: true })
      .sort({ order: 1 });
    
    res.json({ data: grades });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Buscar série por ID
router.get('/:id', auth, async (req: any, res: any) => {
  try {
    const scopedUserIds = getScopedUserIds(req);
    const grade = await Grade.findOne({ 
      _id: req.params.id, 
      userId: { $in: scopedUserIds }
    });
    
    if (!grade) {
      return res.status(404).json({ message: 'Série não encontrada' });
    }
    
    res.json({ data: grade });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Criar nova série
router.post('/',
  auth,
  [
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('level').notEmpty().withMessage('Nível é obrigatório'),
    body('order').optional().isInt().withMessage('Ordem deve ser um número')
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const scopedUserIds = getScopedUserIds(req);
      const ownerUserId = getOwnerUserId(req);
      const { name, level, order } = req.body;

      // Verificar se já existe
      const existing = await Grade.findOne({ 
        userId: { $in: scopedUserIds },
        name: name 
      });
      
      if (existing) {
        return res.status(400).json({ message: 'Já existe uma série com este nome' });
      }

      const grade = new Grade({
        userId: ownerUserId,
        name,
        level,
        order: order || 0
      });

      await grade.save();
      res.status(201).json({ data: grade });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Atualizar série
router.put('/:id',
  auth,
  [
    body('name').optional().notEmpty().withMessage('Nome não pode ser vazio'),
    body('level').optional().notEmpty().withMessage('Nível não pode ser vazio'),
    body('order').optional().isInt().withMessage('Ordem deve ser um número')
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const scopedUserIds = getScopedUserIds(req);
      const grade = await Grade.findOne({ 
        _id: req.params.id, 
        userId: { $in: scopedUserIds }
      });
      
      if (!grade) {
        return res.status(404).json({ message: 'Série não encontrada' });
      }

      const { name, level, order, isActive } = req.body;

      if (name) grade.name = name;
      if (level) grade.level = level;
      if (order !== undefined) grade.order = order;
      if (isActive !== undefined) grade.isActive = isActive;

      await grade.save();
      res.json({ data: grade });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Deletar série (soft delete)
router.delete('/:id', auth, async (req: any, res: any) => {
  try {
    const scopedUserIds = getScopedUserIds(req);
    const grade = await Grade.findOne({ 
      _id: req.params.id, 
      userId: { $in: scopedUserIds }
    });
    
    if (!grade) {
      return res.status(404).json({ message: 'Série não encontrada' });
    }

    grade.isActive = false;
    await grade.save();
    
    res.json({ message: 'Série excluída com sucesso' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
