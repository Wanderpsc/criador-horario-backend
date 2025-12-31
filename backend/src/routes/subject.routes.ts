import express from 'express';
import { body, validationResult } from 'express-validator';
import Subject from '../models/Subject';
import Grade from '../models/Grade';
import Class from '../models/Class';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Criar componente curricular
router.post('/', auth,
  [
    body('name').notEmpty().withMessage('Nome é obrigatório')
  ],
  async (req: AuthRequest, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const subject = new Subject({
        ...req.body,
        userId: req.user!.id
      });

      await subject.save();
      res.status(201).json(subject);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Listar componentes curriculares
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    console.log('📚 GET /subjects - req.user.id:', req.user!.id);
    const subjects = await Subject.find({ userId: req.user!.id });
    const Class = require('../models/Class').default;
    
    // Adicionar informações das turmas com suas séries
    const subjectsWithClasses = await Promise.all(
      subjects.map(async (subject) => {
        const subjectObj = subject.toObject();
        
        // Se tiver classIds (array), buscar turmas e suas séries
        if (subjectObj.classIds && subjectObj.classIds.length > 0) {
          const classes = await Class.find({ _id: { $in: subjectObj.classIds } }).populate('gradeId');
          
          const classGrades = classes.map((c: any) => ({
            className: c.name,
            gradeName: c.gradeId?.name || ''
          })).sort((a: any, b: any) => a.className.localeCompare(b.className));
          
          return { ...subjectObj, classGrades };
        }
        
        return { ...subjectObj, classGrades: [] };
      })
    );
    
    res.json(subjectsWithClasses);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Listar apenas componentes curriculares ATIVOS para o gerador de horário
router.get('/active', auth, async (req: AuthRequest, res) => {
  try {
    const activeSubjects = await Subject.find({ 
      userId: req.user!.id,
      isActive: { $ne: false } // Pega todos onde isActive não seja false (true ou undefined)
    });
    
    // Buscar informações das turmas e séries para cada componente
    const subjectsWithClasses = await Promise.all(
      activeSubjects.map(async (subject) => {
        const subjectObj = subject.toObject();
        
        if (subjectObj.classIds && subjectObj.classIds.length > 0) {
          const classes = await Class.find({
            _id: { $in: subjectObj.classIds }
          }).populate('gradeId');
          
          const classGrades = classes.map((c: any) => ({
            className: c.name,
            gradeName: c.gradeId?.name || 'Sem série'
          }));
          
          return { ...subjectObj, classGrades };
        }
        
        return subjectObj;
      })
    );
    
    res.json(subjectsWithClasses);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Listar componentes curriculares por usuário (para compatibilidade)
router.get('/user/:userId', auth, async (req: AuthRequest, res) => {
  try {
    const subjects = await Subject.find({ userId: req.params.userId });
    
    // Adicionar informações do nível (Grade) se existir gradeId
    const subjectsWithGrade = await Promise.all(
      subjects.map(async (subject) => {
        const subjectObj = subject.toObject();
        if (subjectObj.gradeId) {
          const grade = await Grade.findById(subjectObj.gradeId);
          return { ...subjectObj, gradeName: grade?.name || '' };
        }
        return subjectObj;
      })
    );
    
    res.json({ success: true, data: subjectsWithGrade });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Obter componente curricular por ID
router.get('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!subject) {
      return res.status(404).json({ message: 'Componente curricular não encontrado' });
    }
    res.json(subject);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Atualizar componente curricular
router.put('/:id', auth, async (req: AuthRequest, res) => {
  try {
    console.log('📥 Recebendo atualização de subject:', req.body);
    console.log('📥 weeklyHours recebido:', req.body.weeklyHours, 'tipo:', typeof req.body.weeklyHours);
    
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!subject) {
      return res.status(404).json({ message: 'Componente curricular não encontrado' });
    }
    console.log('📤 Subject atualizado retornando:', subject.toObject());
    console.log('📤 weeklyHours salvo:', subject.weeklyHours, 'tipo:', typeof subject.weeklyHours);
    res.json(subject);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Deletar componente curricular
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const subject = await Subject.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    if (!subject) {
      return res.status(404).json({ message: 'Componente curricular não encontrado' });
    }
    res.json({ message: 'Componente curricular deletado com sucesso' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
