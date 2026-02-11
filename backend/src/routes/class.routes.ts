/**
 * Rotas de Turmas/Classes
 * © 2025 Wander Pires Silva Coelho
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { auth } from '../middleware/auth';
import Class from '../models/Class';
import Grade from '../models/Grade';

const router = express.Router();

// Listar todas as turmas do usuário
router.get('/', auth, async (req: any, res: any) => {
  try {
    const classes = await Class.find({ userId: req.user.id, isActive: true })
      .populate('gradeId')
      .populate('subjectIds')
      .sort({ name: 1 });
    
    console.log(`📋 Encontradas ${classes.length} turmas`);
    
    // Transformar para o formato esperado pelo frontend
    const transformedClasses = classes.map((c: any) => {
      console.log(`\n🏫 Turma: ${c.name}`);
      console.log(`  - subjectIds (raw):`, c.subjectIds);
      console.log(`  - subjectIds length:`, c.subjectIds?.length);
      
      const subjectIdsArray = c.subjectIds ? c.subjectIds.map((s: any) => {
        const id = s._id ? s._id.toString() : s.toString();
        console.log(`    - Subject ID: ${id}`);
        return id;
      }) : [];
      
      console.log(`  - subjectIds (final):`, subjectIdsArray);
      
      // Convert subjectWeeklyHours Map to Object with string keys
      let subjectWeeklyHoursObj: { [key: string]: number } = {};
      if (c.subjectWeeklyHours) {
        if (c.subjectWeeklyHours instanceof Map) {
          // Convert Map to Object and ensure keys are strings
          c.subjectWeeklyHours.forEach((value: number, key: any) => {
            const stringKey = key.toString();
            subjectWeeklyHoursObj[stringKey] = value;
          });
        } else {
          // Already an object, but ensure keys are strings
          Object.entries(c.subjectWeeklyHours).forEach(([key, value]) => {
            subjectWeeklyHoursObj[key.toString()] = value as number;
          });
        }
      }
      
      return {
        id: c._id,
        userId: c.userId,
        gradeId: c.gradeId._id,
        grade: {
          id: c.gradeId._id,
          name: c.gradeId.name,
          level: c.gradeId.level
        },
        name: c.name,
        shift: c.shift,
        capacity: c.capacity,
        subjectIds: subjectIdsArray,
        subjectWeeklyHours: subjectWeeklyHoursObj,
        subjects: c.subjectIds ? c.subjectIds.map((s: any) => ({
          id: s._id ? s._id : s,
          name: s.name || 'Unknown',
          color: s.color
        })) : [],
        isActive: c.isActive,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      };
    });
    
    res.json({ data: transformedClasses });
  } catch (error: any) {
    console.error('❌ Erro ao listar turmas:', error);
    res.status(500).json({ message: error.message });
  }
});

// Buscar turma por ID
router.get('/:id', auth, async (req: any, res: any) => {
  try {
    const classItem = await Class.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    }).populate('gradeId').populate('subjectIds');
    
    if (!classItem) {
      return res.status(404).json({ message: 'Turma não encontrada' });
    }
    
    console.log(`🔍 GET /classes/${req.params.id}`);
    console.log(`   - name: "${classItem.name}"`);
    console.log(`   - gradeId (populated):`, classItem.gradeId);
    console.log(`   - gradeId.name: "${(classItem.gradeId as any)?.name}"`);
    
    // Convert subjectWeeklyHours Map to Object with string keys
    let subjectWeeklyHoursObj: { [key: string]: number } = {};
    if (classItem.subjectWeeklyHours) {
      if (classItem.subjectWeeklyHours instanceof Map) {
        // Convert Map to Object and ensure keys are strings
        classItem.subjectWeeklyHours.forEach((value: number, key: any) => {
          const stringKey = key.toString();
          subjectWeeklyHoursObj[stringKey] = value;
        });
      } else {
        // Already an object, but ensure keys are strings
        Object.entries(classItem.subjectWeeklyHours).forEach(([key, value]) => {
          subjectWeeklyHoursObj[key.toString()] = value as number;
        });
      }
    }
    
    const transformed = {
      ...classItem.toObject(),
      id: classItem._id,
      gradeName: (classItem.gradeId as any)?.name || undefined, // ← ADICIONAR CAMPO gradeName
      grade: classItem.gradeId ? {
        id: (classItem.gradeId as any)._id,
        name: (classItem.gradeId as any).name,
        level: (classItem.gradeId as any).level
      } : undefined,
      subjectWeeklyHours: subjectWeeklyHoursObj
    };
    
    console.log(`   ✅ Retornando gradeName: "${transformed.gradeName}"`);
    
    res.json({ data: transformed });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Criar nova turma
router.post('/',
  auth,
  [
    body('gradeId').notEmpty().withMessage('Ano/Série é obrigatório'),
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('shift').isIn(['morning', 'afternoon', 'evening', 'full']).withMessage('Turno inválido'),
    body('capacity').optional().isInt({ min: 1 }).withMessage('Capacidade deve ser um número positivo')
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { gradeId, name, shift, capacity } = req.body;

      console.log('📝 Tentando criar turma:', { userId: req.user.id, gradeId, name, shift, capacity });

      // Verificar se a série existe e pertence ao usuário
      const grade = await Grade.findOne({ 
        _id: gradeId, 
        userId: req.user.id 
      });
      
      if (!grade) {
        console.log('❌ Série não encontrada:', gradeId);
        return res.status(404).json({ message: 'Ano/Série não encontrado' });
      }

      console.log('✅ Série encontrada:', grade.name);

      // Verificar se já existe uma turma ATIVA com esse nome para essa série
      const existing = await Class.findOne({ 
        userId: req.user.id, 
        gradeId,
        name,
        isActive: true
      });
      
      if (existing) {
        console.log('⚠️ Turma já existe:', existing.name);
        return res.status(400).json({ message: 'Já existe uma turma com este nome para esta série' });
      }

      const classItem = new Class({
        userId: req.user.id,
        gradeId,
        name,
        shift,
        capacity
      });

      console.log('💾 Salvando turma...');
      await classItem.save();
      console.log('✅ Turma salva com sucesso:', classItem._id);
      
      const populated = await Class.findById(classItem._id).populate('gradeId');
      res.status(201).json({ data: populated });
    } catch (error: any) {
      console.error('❌ Erro ao criar turma:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Atualizar turma
router.put('/:id',
  auth,
  [
    body('gradeId').optional().notEmpty().withMessage('Ano/Série não pode ser vazio'),
    body('name').optional().notEmpty().withMessage('Nome não pode ser vazio'),
    body('shift').optional().isIn(['morning', 'afternoon', 'evening', 'full']).withMessage('Turno inválido'),
    body('capacity').optional().isInt({ min: 1 }).withMessage('Capacidade deve ser um número positivo')
  ],
  async (req: any, res: any) => {
    try {
      console.log('📝 Atualizando turma:', req.params.id);
      console.log('📦 Dados recebidos:', JSON.stringify(req.body, null, 2));
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Erros de validação:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const classItem = await Class.findOne({ 
        _id: req.params.id, 
        userId: req.user.id 
      });
      
      if (!classItem) {
        console.log('❌ Turma não encontrada');
        return res.status(404).json({ message: 'Turma não encontrada' });
      }

      console.log('🔍 Turma encontrada:', classItem.name);
      const { gradeId, name, shift, capacity, isActive, subjectIds, subjectWeeklyHours } = req.body;

      // Verificar se o novo nome já existe para outra turma
      if (name && name !== classItem.name) {
        const existing = await Class.findOne({
          userId: req.user.id,
          gradeId: gradeId || classItem.gradeId,
          name: name,
          isActive: true,
          _id: { $ne: req.params.id } // Excluir a turma atual
        });
        
        if (existing) {
          console.log('⚠️ Já existe outra turma com este nome');
          return res.status(400).json({ message: 'Já existe uma turma com este nome para esta série' });
        }
      }

      if (gradeId) classItem.gradeId = gradeId;
      if (name) classItem.name = name;
      if (shift) classItem.shift = shift;
      if (capacity !== undefined) classItem.capacity = capacity;
      if (isActive !== undefined) classItem.isActive = isActive;
      if (subjectIds !== undefined) {
        console.log('📚 Atualizando subjectIds:', subjectIds);
        classItem.subjectIds = subjectIds;
      }
      if (subjectWeeklyHours !== undefined) {
        console.log('📊 Atualizando subjectWeeklyHours:', subjectWeeklyHours);
        // Atribuir diretamente o objeto
        classItem.subjectWeeklyHours = subjectWeeklyHours;
        console.log('✅ subjectWeeklyHours atualizado:', classItem.subjectWeeklyHours);
      }

      console.log('💾 Salvando turma...');
      await classItem.save();
      console.log('✅ Turma salva com sucesso');
      
      const populated = await Class.findById(classItem._id).populate('gradeId').populate('subjectIds');
      
      if (!populated) {
        return res.status(404).json({ message: 'Turma não encontrada após atualização' });
      }
      
      // Convert subjectWeeklyHours Map to Object with string keys
      let subjectWeeklyHoursObj: { [key: string]: number } = {};
      if (populated.subjectWeeklyHours) {
        if (populated.subjectWeeklyHours instanceof Map) {
          populated.subjectWeeklyHours.forEach((value: number, key: any) => {
            const stringKey = key.toString();
            subjectWeeklyHoursObj[stringKey] = value;
          });
        } else {
          Object.entries(populated.subjectWeeklyHours).forEach(([key, value]) => {
            subjectWeeklyHoursObj[key.toString()] = value as number;
          });
        }
      }
      
      const transformed = {
        ...populated.toObject(),
        id: populated._id,
        subjectWeeklyHours: subjectWeeklyHoursObj
      };
      
      res.json({ data: transformed });
    } catch (error: any) {
      console.error('❌ Erro ao atualizar turma:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({ message: error.message });
    }
  }
);

// Deletar turma (soft delete)
router.delete('/:id', auth, async (req: any, res: any) => {
  try {
    const classItem = await Class.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!classItem) {
      return res.status(404).json({ message: 'Turma não encontrada' });
    }

    classItem.isActive = false;
    await classItem.save();
    
    res.json({ message: 'Turma excluída com sucesso' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
