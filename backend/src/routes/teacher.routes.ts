import express from 'express';
import { body, validationResult } from 'express-validator';
import Teacher from '../models/Teacher';
import GeneratedTimetable from '../models/GeneratedTimetable';
import TeacherSubject from '../models/TeacherSubject';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

const getScopedUserIds = (req: AuthRequest): string[] => {
  const ownerUserId = req.user?.schoolId || req.user?.id;
  const actorUserId = req.user?.id;
  return Array.from(new Set([ownerUserId, actorUserId].filter(Boolean).map((id) => String(id))));
};

const getOwnerUserId = (req: AuthRequest): string => String(req.user?.schoolId || req.user?.id || '');

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

      const ownerUserId = getOwnerUserId(req);

      const teacher = new Teacher({
        ...req.body,
        userId: ownerUserId,
        schoolId: ownerUserId
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
    const scopedUserIds = getScopedUserIds(req);
    const teachers = await Teacher.find({ 
      userId: { $in: scopedUserIds }
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
    const scopedUserIds = getScopedUserIds(req);
    console.log('📊 GET /teachers - scoped userIds:', scopedUserIds);
    
    const teachers = await Teacher.find({ userId: { $in: scopedUserIds } });
    
    console.log('📊 Professores encontrados:', teachers.length);
    if (teachers.length > 0) {
      console.log('📊 Exemplo de userId no banco:', teachers[0].userId, 'tipo:', typeof teachers[0].userId);
    } else {
      console.log('⚠️ Nenhum professor encontrado no escopo:', scopedUserIds);
    }
    
    res.json(teachers);
  } catch (error: any) {
    console.error('❌ Erro em GET /teachers:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.get('/user/:userId', auth, async (req: AuthRequest, res) => {
  try {
    const scopedUserIds = getScopedUserIds(req);
    const teachers = await Teacher.find({ userId: { $in: scopedUserIds } });
    res.json({ success: true, data: teachers });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Obter professor por ID
router.get('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const scopedUserIds = getScopedUserIds(req);
    const teacher = await Teacher.findOne({ _id: req.params.id, userId: { $in: scopedUserIds } });
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
    
    const scopedUserIds = getScopedUserIds(req);
    const teacher = await Teacher.findOneAndUpdate(
      { _id: req.params.id, userId: { $in: scopedUserIds } },
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
    const scopedUserIds = getScopedUserIds(req);
    const schoolId = getOwnerUserId(req);
    const teacher = await Teacher.findOneAndDelete({ _id: req.params.id, userId: { $in: scopedUserIds } });
    if (!teacher) {
      return res.status(404).json({ message: 'Professor não encontrado' });
    }

    // Limpar slots deste professor nos horários gerados (vaga → teacherId = '')
    const teacherId = String(teacher._id);
    const timetables = await GeneratedTimetable.find({ school: schoolId });
    for (const tt of timetables) {
      let changed = false;
      for (const slot of tt.slots as any[]) {
        if (String(slot.teacherId) === teacherId) {
          slot.teacherId = '';
          changed = true;
        }
      }
      if (changed) {
        tt.markModified('slots');
        await tt.save();
        console.log(`🔄 Professor removido: slots vagos em "${tt.title}" turma ${tt.classId}`);
      }
    }

    // Remover também as lotações associadas
    await TeacherSubject.deleteMany({ teacherId, userId: { $in: scopedUserIds } });

    res.json({ message: 'Professor deletado com sucesso' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
