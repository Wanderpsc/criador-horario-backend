import { Router } from 'express';
import GeneratedTimetable from '../models/GeneratedTimetable';
import EmergencySchedule from '../models/EmergencySchedule';
import Class from '../models/Class';
import Subject from '../models/Subject';
import Teacher from '../models/Teacher';
import Grade from '../models/Grade';

const router = Router();

// GET /api/public/timetable/:id - Buscar horário gerado por ID (público, sem autenticação)
router.get('/timetable/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const timetables = await GeneratedTimetable.find({ 
      $or: [
        { _id: id },
        { scheduleId: id }
      ]
    }).sort({ createdAt: -1 }).limit(50);

    if (!timetables.length) {
      // Tentar buscar pelo título agrupado — o id pode ser de um dos documentos do grupo
      const single = await GeneratedTimetable.findById(id);
      if (single) {
        // Buscar todos do mesmo título e escola
        const grouped = await GeneratedTimetable.find({
          school: single.school,
          title: single.title
        }).sort({ createdAt: -1 }).limit(50);
        if (grouped.length) {
          timetables.push(...grouped);
        }
      }
    }

    if (!timetables.length) {
      return res.status(404).json({ success: false, message: 'Horário não encontrado' });
    }

    // Agrupar por título
    const groupedByTitle: any = {};
    for (const tt of timetables) {
      const title = tt.title || 'Sem título';
      if (!groupedByTitle[title]) {
        groupedByTitle[title] = {
          _id: tt._id.toString(),
          title,
          scheduleId: tt.scheduleId,
          createdAt: tt.createdAt,
          timetable: {},
          ids: [tt._id.toString()]
        };
      } else {
        groupedByTitle[title].ids.push(tt._id.toString());
      }

      const populatedSlots = [];
      for (const slot of tt.slots) {
        try {
          const [subject, teacher, classDoc] = await Promise.all([
            Subject.findById(slot.subjectId),
            Teacher.findById(slot.teacherId),
            Class.findById(slot.classId)
          ]);
          let grade = null;
          if (classDoc && classDoc.gradeId) {
            grade = await Grade.findById(classDoc.gradeId);
          }
          populatedSlots.push({
            ...((slot as any).toObject ? (slot as any).toObject() : slot),
            subjectName: subject?.name || 'Disciplina',
            teacherName: teacher?.name || 'Professor',
            className: classDoc?.name || 'Turma',
            gradeName: grade?.name || '',
            subjectColor: subject?.color || '#3B82F6'
          });
        } catch {
          populatedSlots.push({
            ...slot,
            subjectName: 'Erro',
            teacherName: 'Erro',
            className: 'Erro',
            gradeName: '',
            subjectColor: '#EF4444'
          });
        }
      }
      groupedByTitle[title].timetable[tt.classId] = populatedSlots;
    }

    const formattedTimetables = Object.values(groupedByTitle).map((group: any) => ({
      _id: String(group._id),
      name: String(group.title),
      createdAt: group.createdAt ? new Date(group.createdAt).toISOString() : new Date().toISOString(),
      timetable: group.timetable,
      classCount: Object.keys(group.timetable).length
    }));

    res.json({ success: true, data: formattedTimetables });
  } catch (error: any) {
    console.error('Erro na rota pública de horário:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar horário' });
  }
});

// GET /api/public/emergency-schedule/:id - Buscar horário emergencial por ID (público)
router.get('/emergency-schedule/:id', async (req, res) => {
  try {
    const schedule = await EmergencySchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Horário emergencial não encontrado' });
    }
    res.json({ success: true, data: [schedule] });
  } catch (error: any) {
    console.error('Erro na rota pública de horário emergencial:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar horário emergencial' });
  }
});

// GET /api/public/class/:id - Buscar turma por ID (público)
router.get('/class/:id', async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id).populate('gradeId');
    if (!classItem) {
      return res.status(404).json({ message: 'Turma não encontrada' });
    }
    res.json({
      data: {
        ...classItem.toObject(),
        id: classItem._id,
        gradeName: (classItem.gradeId as any)?.name || undefined,
        grade: classItem.gradeId ? {
          id: (classItem.gradeId as any)._id,
          name: (classItem.gradeId as any).name,
          level: (classItem.gradeId as any).level
        } : undefined
      }
    });
  } catch (error: any) {
    console.error('Erro na rota pública de turma:', error);
    res.status(500).json({ message: 'Erro ao buscar turma' });
  }
});

export default router;
