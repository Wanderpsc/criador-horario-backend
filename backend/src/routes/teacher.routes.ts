import express from 'express';
import { body, validationResult } from 'express-validator';
import Teacher from '../models/Teacher';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Criar professor
router.post('/', auth,
  [
    body('cpf').notEmpty().withMessage('CPF é obrigatório'),
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('academicBackground').notEmpty().withMessage('Formação acadêmica é obrigatória'),
    body('schoolId').notEmpty().withMessage('Escola é obrigatória')
  ],
  async (req: AuthRequest, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const teacher = new Teacher({
        ...req.body,
        userId: req.user!.id
      });

      await teacher.save();
      res.status(201).json(teacher);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Listar professores por escola
router.get('/school/:schoolId', auth, async (req: AuthRequest, res) => {
  try {
    const teachers = await Teacher.find({ 
      schoolId: req.params.schoolId,
      userId: req.user!.id 
    });
    res.json({ success: true, data: teachers });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Listar professores por usuário (para compatibilidade)
// Listar todos os professores do usuário
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    console.log('📊 GET /teachers - req.user.id:', req.user!.id);
    console.log('📊 Tipo de req.user.id:', typeof req.user!.id);
    
    // Buscar com ambos os formatos (string e ObjectId)
    const teachers = await Teacher.find({ 
      $or: [
        { userId: req.user!.id },
        { userId: req.user!.id.toString() }
      ]
    });
    
    console.log('📊 Professores encontrados:', teachers.length);
    if (teachers.length > 0) {
      console.log('📊 Exemplo de userId no banco:', teachers[0].userId, 'tipo:', typeof teachers[0].userId);
    } else {
      console.log('⚠️ Nenhum professor encontrado com userId:', req.user!.id);
    }
    
    res.json(teachers);
  } catch (error: any) {
    console.error('❌ Erro em GET /teachers:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.get('/user/:userId', auth, async (req: AuthRequest, res) => {
  try {
    const teachers = await Teacher.find({ 
      $or: [
        { userId: req.user!.id },
        { userId: req.user!.id.toString() }
      ]
    });
    res.json({ success: true, data: teachers });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Obter professor por ID
router.get('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const teacher = await Teacher.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!teacher) {
      return res.status(404).json({ message: 'Professor não encontrado' });
    }
    res.json(teacher);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Atualizar professor
router.put('/:id', auth, async (req: AuthRequest, res) => {
  try {
    console.log('📝 Atualizando professor:', req.params.id);
    console.log('📦 Dados recebidos:', JSON.stringify(req.body, null, 2));
    console.log('🔑 contractType:', req.body.contractType, '- Tipo:', typeof req.body.contractType);
    console.log('⏰ weeklyWorkload:', req.body.weeklyWorkload, '- Tipo:', typeof req.body.weeklyWorkload);
    console.log('📅 availability:', req.body.availability ? 'SIM' : 'NÃO');
    if (req.body.availability) {
      console.log('📅 Availability DETALHADA:', JSON.stringify(req.body.availability, null, 2));
    }
    
    const teacher = await Teacher.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    console.log('✅ Professor atualizado:', {
      contractType: teacher?.contractType,
      weeklyWorkload: teacher?.weeklyWorkload,
      hasAvailability: !!teacher?.availability,
      availability: teacher?.availability
    });
    
    if (!teacher) {
      return res.status(404).json({ message: 'Professor não encontrado' });
    }
    res.json(teacher);
  } catch (error: any) {
    console.error('❌ Erro ao atualizar:', error);
    res.status(500).json({ message: error.message });
  }
});

// Deletar professor
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const teacher = await Teacher.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    if (!teacher) {
      return res.status(404).json({ message: 'Professor não encontrado' });
    }
    res.json({ message: 'Professor deletado com sucesso' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
