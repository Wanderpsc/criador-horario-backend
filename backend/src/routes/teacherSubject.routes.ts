import express from 'express';
import TeacherSubject from '../models/TeacherSubject';
import GeneratedTimetable from '../models/GeneratedTimetable';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// ─── Helper: limpa slots dos horários gerados após mudança de lotação ───────
async function syncTimetablesOnWorkloadChange(
  schoolId: string,
  deletedAssocs: Array<{ teacherId: string; subjectId?: string; classId?: string }>
): Promise<void> {
  if (!deletedAssocs.length || !schoolId) return;
  try {
    for (const assoc of deletedAssocs) {
      const query: Record<string, any> = { school: schoolId };
      if (assoc.classId) query.classId = assoc.classId;

      const timetables = await GeneratedTimetable.find(query);
      for (const tt of timetables) {
        const before = tt.slots.length;
        const filtered = tt.slots.filter((slot) => {
          const sameTeacher = String(slot.teacherId) === assoc.teacherId;
          if (!sameTeacher) return true;
          if (assoc.subjectId) {
            return String(slot.subjectId) !== assoc.subjectId;
          }
          return false; // teacher sem filtro de subject → remove qualquer slot desse professor
        });
        if (filtered.length !== before) {
          tt.set('slots', filtered);
          await tt.save();
          console.log(
            `🔄 Lotação sync: ${before - filtered.length} slot(s) removidos de "${tt.title}" turma ${tt.classId}`
          );
        }
      }
    }
  } catch (err: any) {
    console.error('⚠️ syncTimetablesOnWorkloadChange erro:', err.message);
  }
}
// ────────────────────────────────────────────────────────────────────────────

const getScopedUserIds = (req: any): string[] => {
  const ownerUserId = req.user?.schoolId || req.user?.id;
  const actorUserId = req.user?.id;
  return Array.from(new Set([ownerUserId, actorUserId].filter(Boolean).map((id) => String(id))));
};

const getOwnerUserId = (req: any): string => String(req.user?.schoolId || req.user?.id || '');

// Todas as rotas requerem autenticação
router.use(authenticate);

// Listar todas as associações do usuário com dados completos (para impressão/geração de horários)
router.get('/complete/:userId', async (req, res) => {
  try {
    const scopedUserIds = getScopedUserIds(req);
    const Teacher = require('../models/Teacher').default;
    const Subject = require('../models/Subject').default;
    const Class = require('../models/Class').default;
    
    const associations = await TeacherSubject.find({ userId: { $in: scopedUserIds } });
    
    // Buscar dados completos
    const teacherIds = [...new Set(associations.map(a => a.teacherId))];
    const subjectIds = [...new Set(associations.map(a => a.subjectId))];
    const classIds = [...new Set(associations.map(a => a.classId).filter(Boolean))];
    
    const teachers = await Teacher.find({ _id: { $in: teacherIds } });
    const subjects = await Subject.find({ _id: { $in: subjectIds } });
    const classes = await Class.find({ _id: { $in: classIds } }).populate('gradeId');
    
    // Mapear dados completos
    const completeData = associations.map(assoc => {
      const teacher = teachers.find((t: any) => t._id.toString() === assoc.teacherId);
      const subject = subjects.find((s: any) => s._id.toString() === assoc.subjectId);
      const classItem = classes.find((c: any) => c._id.toString() === assoc.classId);
      
      return {
        id: assoc._id,
        teacherId: assoc.teacherId,
        teacherName: teacher?.name || 'Não encontrado',
        subjectId: assoc.subjectId,
        subjectName: subject?.name || 'Não encontrado',
        classId: assoc.classId,
        className: classItem?.name || null,
        gradeName: classItem?.gradeId?.name || null,
        shift: classItem?.shift || null,
        createdAt: assoc.createdAt,
        updatedAt: assoc.updatedAt
      };
    });
    
    res.json({ success: true, data: completeData });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Listar todas as associações do usuário
router.get('/:userId', async (req, res) => {
  try {
    const scopedUserIds = getScopedUserIds(req);
    const associations = await TeacherSubject.find({ userId: { $in: scopedUserIds } });
    res.json({ success: true, data: associations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Buscar disciplinas de um professor
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const associations = await TeacherSubject.find({ teacherId });
    res.json({ success: true, data: associations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Buscar professores de uma disciplina
router.get('/subject/:subjectId', async (req, res) => {
  try {
    const { subjectId } = req.params;
    const associations = await TeacherSubject.find({ subjectId });
    res.json({ success: true, data: associations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Criar associação
router.post('/', async (req, res) => {
  try {
    const ownerUserId = getOwnerUserId(req);
    const { teacherId, subjectId, classId } = req.body;
    const userId = ownerUserId;
    const schoolId = ownerUserId;
    
    // Importar models necessários
    const Subject = require('../models/Subject').default;
    const Teacher = require('../models/Teacher').default;
    const Class = require('../models/Class').default;
    
    // Verificar se o professor existe
    let teacher = await Teacher.findById(teacherId);
    
    // Se não existir, criar automaticamente
    if (!teacher) {
      console.log(`⚠️ Professor ${teacherId} não encontrado. Criando automaticamente...`);
      
      teacher = new Teacher({
        _id: teacherId,
        name: 'Professor Importado', // Nome padrão - será atualizado depois
        userId: userId,
        schoolId,
        cpf: '',
        email: '',
        phone: '',
        academicBackground: '',
        specialization: '',
        contractType: '40h',
        weeklyWorkload: 26,
        isActive: true
      });
      
      await teacher.save();
      console.log(`✅ Professor criado: ${teacher.name}`);
    }
    
    // Verificar se o componente curricular existe
    let subject = await Subject.findById(subjectId);
    
    // Se não existir, criar automaticamente
    if (!subject) {
      console.log(`⚠️ Componente curricular ${subjectId} não encontrado. Criando automaticamente...`);
      
      // Buscar informações da turma para obter o gradeId
      const classItem = classId ? await Class.findById(classId) : null;
      
      subject = new Subject({
        _id: subjectId,
        name: 'Componente Importado', // Nome padrão - será atualizado depois
        userId: userId,
        schoolId,
        weeklyHours: 2, // Valor padrão
        workloadHours: 80, // Valor padrão
        gradeIds: classItem?.gradeId ? [classItem.gradeId] : [],
        classIds: classId ? [classId] : [],
        isActive: true
      });
      
      await subject.save();
      console.log(`✅ Componente curricular criado: ${subject.name}`);
    } else {
      // Se existir, atualizar os arrays classIds e gradeIds se necessário
      let updated = false;
      
      if (classId && !subject.classIds?.includes(classId)) {
        subject.classIds = subject.classIds || [];
        subject.classIds.push(classId);
        updated = true;
      }
      
      if (classId) {
        const classItem = await Class.findById(classId);
        if (classItem?.gradeId && !subject.gradeIds?.includes(classItem.gradeId.toString())) {
          subject.gradeIds = subject.gradeIds || [];
          subject.gradeIds.push(classItem.gradeId);
          updated = true;
        }
      }
      
      if (updated) {
        await subject.save();
        console.log(`✅ Componente curricular atualizado com nova turma/série`);
      }
    }
    
    // Criar a associação
    const association = new TeacherSubject({
      ...req.body,
      userId,
      schoolId
    });
    await association.save();
    res.status(201).json({ success: true, data: association });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ 
        success: false, 
        message: 'Esta associação já existe' 
      });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
});

// Criar múltiplas associações (em massa)
router.post('/bulk', async (req, res) => {
  try {
    const ownerUserId = getOwnerUserId(req);
    const { teacherId, subjectIds, classIds } = req.body;
    const schoolId = ownerUserId;
    const userId = ownerUserId;
    
    // Importar models necessários
    const Subject = require('../models/Subject').default;
    const Teacher = require('../models/Teacher').default;
    const Class = require('../models/Class').default;
    
    // Verificar se o professor existe
    let teacher = await Teacher.findById(teacherId);
    
    // Se não existir, criar automaticamente
    if (!teacher) {
      console.log(`⚠️ Professor ${teacherId} não encontrado. Criando automaticamente...`);
      
      teacher = new Teacher({
        _id: teacherId,
        name: 'Professor Importado',
        userId: userId,
        schoolId,
        cpf: '',
        email: '',
        phone: '',
        academicBackground: '',
        specialization: '',
        contractType: '40h',
        weeklyWorkload: 26,
        isActive: true
      });
      
      await teacher.save();
      console.log(`✅ Professor criado: ${teacher.name}`);
    }
    
    // Processar cada subject para garantir que existe
    for (const subjectId of subjectIds) {
      let subject = await Subject.findById(subjectId);
      
      if (!subject) {
        console.log(`⚠️ Componente curricular ${subjectId} não encontrado. Criando automaticamente...`);
        
        // Buscar informações das turmas para obter os gradeIds
        const classItems = classIds?.length ? await Class.find({ _id: { $in: classIds } }) : [];
        const gradeIds = [...new Set(classItems.map((c: any) => c.gradeId?.toString()).filter(Boolean))];
        
        subject = new Subject({
          _id: subjectId,
          name: 'Componente Importado',
          userId: userId,
          schoolId,
          weeklyHours: 2,
          workloadHours: 80,
          gradeIds: gradeIds,
          classIds: classIds || [],
          isActive: true
        });
        
        await subject.save();
        console.log(`✅ Componente curricular criado: ${subject.name}`);
      } else {
        // Atualizar classIds e gradeIds se necessário
        let updated = false;
        
        if (classIds?.length) {
          for (const classId of classIds) {
            if (!subject.classIds?.includes(classId)) {
              subject.classIds = subject.classIds || [];
              subject.classIds.push(classId);
              updated = true;
            }
            
            const classItem = await Class.findById(classId);
            if (classItem?.gradeId && !subject.gradeIds?.includes(classItem.gradeId.toString())) {
              subject.gradeIds = subject.gradeIds || [];
              subject.gradeIds.push(classItem.gradeId);
              updated = true;
            }
          }
        }
        
        if (updated) {
          await subject.save();
        }
      }
      
      // Atualizar as turmas com o subjectId
      if (classIds?.length) {
        for (const classId of classIds) {
          const classItem = await Class.findById(classId);
          if (classItem) {
            classItem.subjectIds = classItem.subjectIds || [];
            if (!classItem.subjectIds.includes(subjectId)) {
              classItem.subjectIds.push(subjectId);
              await classItem.save();
              console.log(`✅ Turma ${classItem.name} atualizada com componente ${subject.name}`);
            }
          }
        }
      }
    }
    
    // Criar as associações
    const associations = [];
    for (const subjectId of subjectIds) {
      if (classIds?.length) {
        for (const classId of classIds) {
          associations.push({
            teacherId,
            subjectId,
            classId,
            schoolId,
            userId
          });
        }
      } else {
        associations.push({
          teacherId,
          subjectId,
          schoolId,
          userId
        });
      }
    }

    const result = await TeacherSubject.insertMany(associations, { ordered: false });
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    // Ignorar erros de duplicatas
    if (error.code === 11000) {
      res.json({ 
        success: true, 
        message: 'Associações criadas (duplicatas ignoradas)'
      });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
});

// 🔥 BULK DELETE - Deletar TODAS as associações de um usuário de uma vez
router.delete('/bulk/:userId', async (req, res) => {
  try {
    const scopedUserIds = getScopedUserIds(req);
    const schoolId = getOwnerUserId(req);

    // Buscar associações antes de deletar para sincronizar os horários
    const assocs = await TeacherSubject.find({ userId: { $in: scopedUserIds } });

    const result = await TeacherSubject.deleteMany({ userId: { $in: scopedUserIds } });

    console.log(`✅ BULK DELETE: ${result.deletedCount} associações removidas para escopo`, scopedUserIds);

    // Limpar todos os slots correspondentes nos horários gerados
    const deletedAssocs = assocs.map((a) => ({ teacherId: a.teacherId, subjectId: a.subjectId, classId: a.classId }));
    await syncTimetablesOnWorkloadChange(schoolId, deletedAssocs);

    res.json({ 
      success: true, 
      message: `${result.deletedCount} lotações excluídas com sucesso`,
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    console.error('❌ Erro no BULK DELETE:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Deletar associação individual
router.delete('/:id', async (req, res) => {
  try {
    const scopedUserIds = getScopedUserIds(req);
    const schoolId = getOwnerUserId(req);

    // Buscar a associação antes de deletar para sincronizar os horários
    const assoc = await TeacherSubject.findOne({ _id: req.params.id, userId: { $in: scopedUserIds } });
    if (assoc) {
      await assoc.deleteOne();
      // Limpar slots dos horários gerados correspondentes a esta lotação
      await syncTimetablesOnWorkloadChange(schoolId, [{
        teacherId: assoc.teacherId,
        subjectId: assoc.subjectId,
        classId: assoc.classId
      }]);
    }
    res.json({ success: true, message: 'Associação removida' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Deletar todas associações de um professor
router.delete('/teacher/:teacherId', async (req, res) => {
  try {
    const scopedUserIds = getScopedUserIds(req);
    const schoolId = getOwnerUserId(req);
    const { teacherId } = req.params;

    // Buscar associações antes de deletar para sincronizar os horários
    const assocs = await TeacherSubject.find({ teacherId, userId: { $in: scopedUserIds } });
    await TeacherSubject.deleteMany({ teacherId, userId: { $in: scopedUserIds } });

    // Limpar todos os slots deste professor nos horários gerados
    const deletedAssocs = assocs.map((a) => ({ teacherId: a.teacherId, subjectId: a.subjectId, classId: a.classId }));
    await syncTimetablesOnWorkloadChange(schoolId, deletedAssocs);

    res.json({ success: true, message: 'Associações removidas' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
