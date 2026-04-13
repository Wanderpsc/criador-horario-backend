import { Router } from 'express';
import GeneratedTimetable from '../models/GeneratedTimetable';
import EmergencySchedule from '../models/EmergencySchedule';
import Schedule from '../models/Schedule';
import Class from '../models/Class';
import Subject from '../models/Subject';
import Teacher from '../models/Teacher';
import Grade from '../models/Grade';
import TeacherAttendance from '../models/TeacherAttendance';

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

    // Se encontrou por _id (1 documento), expandir para todos os irmãos pelo mesmo scheduleId
    if (isValidObjectId && timetables.length > 0) {
      const scheduleIds = [...new Set(timetables.map((tt: any) => String(tt.scheduleId)).filter(Boolean))];
      if (scheduleIds.length > 0) {
        const siblings = await GeneratedTimetable.find({
          scheduleId: { $in: scheduleIds }
        }).sort({ createdAt: -1 }).limit(500).lean();
        if (siblings.length > timetables.length) {
          timetables = siblings;
        }
      }
    }

    if (!timetables.length && isValidObjectId) {
      const single = await GeneratedTimetable.findById(id).lean();
      if (single) {
        timetables = await GeneratedTimetable.find({
          school: (single as any).school,
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

    // Coletar scheduleIds únicos para buscar horários de períodos
    const scheduleIdSet = new Set<string>();
    for (const tt of timetables) {
      if (tt.scheduleId) scheduleIdSet.add(String(tt.scheduleId));
      for (const slot of tt.slots) {
        if (slot.subjectId) subjectIds.add(slot.subjectId);
        if (slot.teacherId) teacherIds.add(slot.teacherId);
        if (slot.classId)   classIds.add(slot.classId);
      }
    }

    // Buscar schedules para obter startTime/endTime por período
    const schedules = await Schedule.find({ _id: { $in: Array.from(scheduleIdSet) } }).lean();
    // Mapa: scheduleId -> { period -> { startTime, endTime } }
    const schedulePeriodMap = new Map<string, Map<number, { startTime: string; endTime: string }>>();
    const scheduleBreaksMap = new Map<string, Array<{ label: string; startTime: string; endTime: string }>>();
    for (const sched of schedules) {
      const periodMap = new Map<number, { startTime: string; endTime: string }>();
      if ((sched as any).periods && Array.isArray((sched as any).periods)) {
        for (const p of (sched as any).periods) {
          if (p.period != null && p.startTime && p.endTime) {
            periodMap.set(Number(p.period), { startTime: p.startTime, endTime: p.endTime });
          }
        }
      }
      schedulePeriodMap.set(String((sched as any)._id), periodMap);
      if ((sched as any).breaks && Array.isArray((sched as any).breaks)) {
        scheduleBreaksMap.set(String((sched as any)._id), (sched as any).breaks.map((b: any) => ({
          label: b.label || 'Intervalo',
          startTime: b.startTime,
          endTime: b.endTime,
        })));
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
          school: (tt as any).school || (tt as any).userId || '',
          createdAt: tt.createdAt,
          timetable: {},
        };
      }

      const populatedSlots = tt.slots.map((slot: any) => {
        const subject = subjectMap.get(String(slot.subjectId));
        const teacher = teacherMap.get(String(slot.teacherId));
        const classDoc = classMap.get(String(slot.classId));
        // Popular startTime/endTime do Schedule se o slot não os tiver
        const periodMap = tt.scheduleId ? schedulePeriodMap.get(String(tt.scheduleId)) : undefined;
        const periodTimes = periodMap?.get(Number(slot.period));
        return {
          ...slot,
          startTime: slot.startTime || periodTimes?.startTime || '',
          endTime:   slot.endTime   || periodTimes?.endTime   || '',
          subjectName: (subject as any)?.name || 'Disciplina',
          teacherName: (teacher as any)?.name || 'Professor',
          className:   (classDoc as any)?.name || 'Turma',
          gradeName:   (classDoc as any)?.gradeName || '',
          subjectColor:(subject as any)?.color || '#3B82F6',
        };
      });

      groupedByTitle[title].timetable[tt.classId] = populatedSlots;
    }

    const formattedTimetables = Object.values(groupedByTitle).map((group: any) => {
      // Incluir periodTimes (mapa period -> {startTime, endTime}) no primeiro schedule encontrado
      const schedId = group.scheduleId ? String(group.scheduleId) : '';
      const pMap = schedId ? schedulePeriodMap.get(schedId) : undefined;
      const periodTimes: Record<number, { startTime: string; endTime: string }> = {};
      if (pMap) pMap.forEach((v, k) => { periodTimes[k] = v; });
      const breaks = schedId ? (scheduleBreaksMap.get(schedId) || []) : [];
      return {
        _id: String(group._id),
        name: String(group.title),
        schoolId: group.school || '',
        createdAt: group.createdAt ? new Date(group.createdAt).toISOString() : new Date().toISOString(),
        timetable: group.timetable,
        classCount: Object.keys(group.timetable).length,
        periodTimes,
        breaks,
      };
    });

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

// GET /api/public/absent-teachers?schoolId=...&date=YYYY-MM-DD
// Rota pública (sem auth) para o DisplayPanel exibir ausências no painel de TV
router.get('/absent-teachers', async (req, res) => {
  try {
    const { schoolId, date } = req.query as { schoolId?: string; date?: string };
    if (!schoolId || !date) {
      return res.json([]);
    }
    const records = await TeacherAttendance.find({ schoolId, date }).lean();
    const absentTeacherIds: string[] = [];
    for (const r of records) {
      if (r.classes && (r.classes as any[]).some((c: any) => c.status === 'absent')) {
        absentTeacherIds.push(String(r.teacherId));
      }
    }
    res.json(absentTeacherIds);
  } catch (error: any) {
    console.error('Erro na rota pública de professores ausentes:', error);
    res.status(500).json([]);
  }
});

export default router;
