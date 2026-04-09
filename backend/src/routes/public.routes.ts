import { Router } from 'express';
import GeneratedTimetable from '../models/GeneratedTimetable';
import EmergencySchedule from '../models/EmergencySchedule';
import Class from '../models/Class';
import Subject from '../models/Subject';
import Teacher from '../models/Teacher';
import Grade from '../models/Grade';

const router = Router();

// GET /api/public/timetable/:id - Buscar horário gerado por ID ou título (público, sem autenticação)
router.get('/timetable/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);

    // Remover possível sufixo de data (ex: " (29/03/2026)") gerado pelo frontend
    const titleWithoutDateSuffix = id.replace(/\s*\(\d{2}\/\d{2}\/\d{4}\)\s*$/, '').trim();

    // Construir query baseado no tipo do id
    const orConditions: any[] = [{ scheduleId: id }, { title: id }];
    if (titleWithoutDateSuffix !== id) {
      orConditions.push({ title: titleWithoutDateSuffix });
    }
    if (isValidObjectId) {
      orConditions.unshift({ _id: id });
    }

    let timetables = await GeneratedTimetable.find({ $or: orConditions })
      .sort({ createdAt: -1 }).limit(50).lean();

    if (!timetables.length && isValidObjectId) {
      const single = await GeneratedTimetable.findById(id).lean();
      if (single) {
        timetables = await GeneratedTimetable.find({
          school: single.school,
          title: single.title
        }).sort({ createdAt: -1 }).limit(50).lean();
      }
    }

    if (!timetables.length) {
      return res.status(404).json({ success: false, message: 'Horário não encontrado' });
    }

    // --- BATCH LOAD: coletar IDs únicos de uma vez ---
    const subjectIds = new Set<string>();
    const teacherIds  = new Set<string>();
    const classIds    = new Set<string>();

    for (const tt of timetables) {
      for (const slot of tt.slots) {
        if (slot.subjectId) subjectIds.add(slot.subjectId);
        if (slot.teacherId) teacherIds.add(slot.teacherId);
        if (slot.classId)   classIds.add(slot.classId);
      }
    }

    const [subjects, teachers, classes] = await Promise.all([
      Subject.find({ _id: { $in: Array.from(subjectIds) } }).lean(),
      Teacher.find({ _id: { $in: Array.from(teacherIds) } }).lean(),
      Class.find({ _id: { $in: Array.from(classIds) } }).lean(),
    ]);

    const gradeIds = new Set<string>();
    for (const c of classes) {
      if ((c as any).gradeId) gradeIds.add(String((c as any).gradeId));
    }
    const grades = await Grade.find({ _id: { $in: Array.from(gradeIds) } }).lean();

    // Construir mapas para lookup O(1)
    const subjectMap = new Map(subjects.map((s: any) => [String(s._id), s]));
    const teacherMap = new Map(teachers.map((t: any) => [String(t._id), t]));
    const gradeMap   = new Map(grades.map((g: any) => [String(g._id), g]));
    const classMap   = new Map(classes.map((c: any) => {
      const grade = (c as any).gradeId ? gradeMap.get(String((c as any).gradeId)) : null;
      return [String(c._id), { ...c, gradeName: (grade as any)?.name || '' }];
    }));

    // Agrupar por título usando maps em memória (sem queries adicionais)
    const groupedByTitle: any = {};
    for (const tt of timetables) {
      const title = tt.title || 'Sem título';
      if (!groupedByTitle[title]) {
        groupedByTitle[title] = {
          _id: String(tt._id),
          title,
          scheduleId: tt.scheduleId,
          createdAt: tt.createdAt,
          timetable: {},
        };
      }

      const populatedSlots = tt.slots.map((slot: any) => {
        const subject = subjectMap.get(String(slot.subjectId));
        const teacher = teacherMap.get(String(slot.teacherId));
        const classDoc = classMap.get(String(slot.classId));
        return {
          ...slot,
          subjectName: (subject as any)?.name || 'Disciplina',
          teacherName: (teacher as any)?.name || 'Professor',
          className:   (classDoc as any)?.name || 'Turma',
          gradeName:   (classDoc as any)?.gradeName || '',
          subjectColor:(subject as any)?.color || '#3B82F6',
        };
      });

      groupedByTitle[title].timetable[tt.classId] = populatedSlots;
    }

    const formattedTimetables = Object.values(groupedByTitle).map((group: any) => ({
      _id: String(group._id),
      name: String(group.title),
      createdAt: group.createdAt ? new Date(group.createdAt).toISOString() : new Date().toISOString(),
      timetable: group.timetable,
      classCount: Object.keys(group.timetable).length,
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
