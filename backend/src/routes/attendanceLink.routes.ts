/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Rotas: Ponto Eletrônico (AttendanceLink)
 */
import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import AttendanceLink from '../models/AttendanceLink';
import SchoolPontoLink from '../models/SchoolPontoLink';
import Employee from '../models/Employee';
import Teacher from '../models/Teacher';
import EmployeeAttendance from '../models/EmployeeAttendance';
import TeacherAttendance from '../models/TeacherAttendance';
import GeneratedTimetable from '../models/GeneratedTimetable';
import Subject from '../models/Subject';
import Class from '../models/Class';
import User from '../models/User';
import { auth, AuthRequest } from '../middleware/auth';
import { sendPontoNotificationEmail } from '../services/email.service';

const router = express.Router();

// ─── helpers ─────────────────────────────────────────────────────────────────

const DAYS_PT: Record<string, string> = {
  sunday: 'Domingo',
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
};

const DAYS_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function todayDayKey(): string {
  return DAYS_EN[new Date().getDay()];
}

function nowHHmm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROTAS ADMIN (requerem autenticação)
// ─────────────────────────────────────────────────────────────────────────────

// POST / — criar link de ponto para um professor ou funcionário
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { personType, personId } = req.body;

    if (!personType || !['teacher', 'employee'].includes(personType)) {
      return res.status(400).json({ message: 'personType deve ser "teacher" ou "employee".' });
    }
    if (!personId || !mongoose.isValidObjectId(personId)) {
      return res.status(400).json({ message: 'personId inválido.' });
    }

    // Buscar nome da escola
    const schoolUser = await User.findById(schoolId).select('schoolName name');
    const schoolName = (schoolUser as any)?.schoolName || (schoolUser as any)?.name || '';

    let personName = '';
    let cargo = '';
    let setor = '';

    if (personType === 'teacher') {
      const teacher = await Teacher.findOne({ _id: personId, schoolId });
      if (!teacher) return res.status(404).json({ message: 'Professor não encontrado.' });
      personName = teacher.name;
    } else {
      const employee = await Employee.findOne({ _id: personId, schoolId });
      if (!employee) return res.status(404).json({ message: 'Funcionário não encontrado.' });
      personName = employee.name;
      cargo = employee.cargo || '';
      setor = employee.setor || '';
    }

    // Verificar se já existe link ativo para esta pessoa
    const existing = await AttendanceLink.findOne({ schoolId, personType, personId, isActive: true });
    if (existing) {
      return res.status(200).json({ ...existing.toObject(), alreadyExisted: true });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const link = new AttendanceLink({
      token,
      schoolId,
      schoolName,
      personType,
      personId,
      personName,
      cargo,
      setor,
      isActive: true,
      createdBy: req.user!.id,
    });

    await link.save();
    res.status(201).json(link);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET / — listar todos os links da escola
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { personType } = req.query;
    const filter: Record<string, unknown> = { schoolId };
    if (personType) filter.personType = personType;
    const links = await AttendanceLink.find(filter).sort({ createdAt: -1 }).limit(500);
    res.json(links);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /:id — desativar link
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const link = await AttendanceLink.findOneAndUpdate(
      { _id: req.params.id, schoolId },
      { isActive: false },
      { new: true }
    );
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });
    res.json({ message: 'Link desativado.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROTAS PÚBLICAS (sem autenticação)
// ─────────────────────────────────────────────────────────────────────────────

// GET /public/:token — identifica a pessoa e retorna a situação de hoje
router.get('/public/:token', async (req, res) => {
  try {
    const link = await AttendanceLink.findOne({ token: req.params.token });
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });
    if (!link.isActive) return res.status(410).json({ message: 'Este link foi desativado.' });

    const today = todayISO();
    const dayKey = todayDayKey();
    const dayLabel = DAYS_PT[dayKey] || dayKey;

    const baseInfo = {
      schoolName: link.schoolName,
      personType: link.personType,
      personId: link.personId,
      personName: link.personName,
      cargo: link.cargo,
      setor: link.setor,
      today,
      dayLabel,
    };

    // ── PROFESSOR ──────────────────────────────────────────────────────────
    if (link.personType === 'teacher') {
      // Buscar horário gerado do professor para hoje
      const timetables = await GeneratedTimetable.find({
        school: link.schoolId,
      }).lean();

      // Filtrar slots do professor neste dia
      const teacherSlots: any[] = [];
      for (const tt of timetables) {
        for (const slot of (tt as any).slots) {
          if (String(slot.teacherId) === String(link.personId) && slot.day === dayKey) {
            teacherSlots.push({ ...slot, classId: tt.classId });
          }
        }
      }

      // Enriquecer com nomes de disciplinas e turmas
      const subjectIds = [...new Set(teacherSlots.map((s: any) => s.subjectId))];
      const classIds = [...new Set(teacherSlots.map((s: any) => s.classId))];

      const [subjects, classes] = await Promise.all([
        Subject.find({ _id: { $in: subjectIds } }).select('_id name').lean(),
        Class.find({ _id: { $in: classIds } }).select('_id name grade').lean(),
      ]);

      const subjectMap = Object.fromEntries(subjects.map((s: any) => [String(s._id), s.name]));
      const classMap = Object.fromEntries(classes.map((c: any) => [String(c._id), `${c.name}${c.grade ? ' – ' + c.grade : ''}`]));

      const schedule = teacherSlots
        .sort((a: any, b: any) => a.period - b.period)
        .map((s: any) => ({
          period: s.period,
          startTime: s.startTime || '',
          endTime: s.endTime || '',
          subjectName: subjectMap[s.subjectId] || s.subjectId,
          className: classMap[s.classId] || s.classId,
          subjectId: s.subjectId,
          classId: s.classId,
        }));

      // Situação de frequência hoje
      const attendance = await TeacherAttendance.findOne({
        teacherId: link.personId,
        date: today,
      }).lean();

      return res.json({
        ...baseInfo,
        schedule,
        attendance: attendance || null,
      });
    }

    // ── FUNCIONÁRIO ────────────────────────────────────────────────────────
    const employee = await Employee.findOne({ _id: link.personId, schoolId: link.schoolId })
      .select('jornadaTrabalho cargaHorariaSemanal setor cargo workSchedule')
      .lean();

    const attendance = await EmployeeAttendance.findOne({
      employeeId: link.personId,
      date: today,
    }).lean();

    const ws = (employee as any)?.workSchedule;
    return res.json({
      ...baseInfo,
      jornadaTrabalho: (employee as any)?.jornadaTrabalho || '',
      workSchedule: ws ? {
        entryTime: ws.entryTime,
        exitTime: ws.exitTime,
        workDays: ws.workDays,
        toleranceMinutes: ws.toleranceMinutes ?? 10,
      } : null,
      attendance: attendance || null,
    });

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /public/:token/mark — registrar ponto (entrada/saída ou presença de professor)
router.post('/public/:token/mark', async (req, res) => {
  try {
    const link = await AttendanceLink.findOne({ token: req.params.token });
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });
    if (!link.isActive) return res.status(410).json({ message: 'Este link foi desativado.' });

    const today = todayISO();
    const dayKey = todayDayKey();
    const now = nowHHmm();
    const { action } = req.body; // 'entry' | 'exit' | 'confirm' (professor)

    // ── PROFESSOR: confirmar presença em todas as aulas do dia ─────────────
    if (link.personType === 'teacher') {
      // Buscar slots do professor hoje
      const timetables = await GeneratedTimetable.find({ school: link.schoolId }).lean();
      const teacherSlots: any[] = [];
      for (const tt of timetables) {
        for (const slot of (tt as any).slots) {
          if (String(slot.teacherId) === String(link.personId) && slot.day === dayKey) {
            teacherSlots.push({ ...slot, classId: tt.classId });
          }
        }
      }

      if (teacherSlots.length === 0) {
        return res.status(400).json({ message: 'Nenhuma aula programada para hoje.' });
      }

      // Enriquecer
      const subjectIds = [...new Set(teacherSlots.map((s: any) => s.subjectId))];
      const classIds = [...new Set(teacherSlots.map((s: any) => s.classId))];
      const [subjects, classes] = await Promise.all([
        Subject.find({ _id: { $in: subjectIds } }).select('_id name').lean(),
        Class.find({ _id: { $in: classIds } }).select('_id name grade').lean(),
      ]);
      const subjectMap = Object.fromEntries(subjects.map((s: any) => [String(s._id), s.name]));
      const classMap = Object.fromEntries(classes.map((c: any) => [String(c._id), `${c.name}${c.grade ? ' – ' + c.grade : ''}`]));

      const teacher = await Teacher.findById(link.personId).select('name').lean();
      const teacherName = (teacher as any)?.name || link.personName;

      const classesArr = teacherSlots.sort((a: any, b: any) => a.period - b.period).map((s: any) => ({
        period: s.period,
        startTime: s.startTime || '',
        endTime: s.endTime || '',
        subjectId: s.subjectId,
        subjectName: subjectMap[s.subjectId] || s.subjectId,
        classId: s.classId,
        className: classMap[s.classId] || s.classId,
        grade: (classes.find((c: any) => String(c._id) === s.classId) as any)?.grade || '',
        status: 'present',
        markedAt: new Date(),
      }));

      const existing = await TeacherAttendance.findOne({ teacherId: link.personId, date: today });

      if (existing) {
        // Marcar aulas pendentes como presentes
        let changed = false;
        for (const cls of (existing as any).classes) {
          if (cls.status === 'pending') {
            cls.status = 'present';
            cls.markedAt = new Date();
            changed = true;
          }
        }
        if (changed) {
          (existing as any).totalPresentClasses = (existing as any).classes.filter((c: any) => c.status === 'present').length;
          await existing.save();
        }
        return res.json({ message: 'Presença confirmada.', attendance: existing });
      }

      // Criar novo registro
      const attendance = new TeacherAttendance({
        teacherId: link.personId,
        teacherName,
        schoolId: link.schoolId,
        date: today,
        dayOfWeek: dayKey,
        classes: classesArr,
        totalScheduledClasses: classesArr.length,
        totalPresentClasses: classesArr.length,
        totalAbsentClasses: 0,
      });
      await attendance.save();
      return res.json({ message: 'Presença confirmada.', attendance });
    }

    // ── FUNCIONÁRIO: marcar entrada ou saída ───────────────────────────────
    const employee = await Employee.findOne({ _id: link.personId, schoolId: link.schoolId })
      .select('workSchedule jornadaTrabalho cargo setor')
      .lean();
    const ws = (employee as any)?.workSchedule;

    // Helper para verificar geolocalização (AttendanceLink individual não tem geo — apenas link geral)
    const { lat, lng, photoData } = req.body;

    const existing = await EmployeeAttendance.findOne({ employeeId: link.personId, date: today });

    if (existing) {
      // Segundo toque = saída (se ainda não tem saída)
      if (!action || action === 'exit') {
        if ((existing as any).exitTime) {
          return res.status(400).json({
            message: 'Saída já registrada hoje.',
            attendance: existing,
          });
        }
        (existing as any).exitTime = now;
        (existing as any).status = 'present';

        // Calcular minutos trabalhados
        if ((existing as any).entryTime) {
          const [eh, em] = (existing as any).entryTime.split(':').map(Number);
          const [xh, xm] = now.split(':').map(Number);
          const worked = (xh * 60 + xm) - (eh * 60 + em);
          (existing as any).workedMinutes = worked;

          // Calcular déficit/saldo usando workSchedule
          if (ws?.entryTime && ws?.exitTime) {
            const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
            const expected = toMin(ws.exitTime) - toMin(ws.entryTime);
            (existing as any).expectedMinutes = expected;
            (existing as any).expectedEntryTime = ws.entryTime;
            (existing as any).expectedExitTime = ws.exitTime;
            // Atraso na entrada
            const entryMin = toMin((existing as any).entryTime);
            const expectedEntry = toMin(ws.entryTime);
            const tolerance = ws.toleranceMinutes ?? 10;
            const late = entryMin - expectedEntry - tolerance;
            (existing as any).lateArrivalMinutes = late > 0 ? late : 0;
            // Saída antecipada
            const exitMin = toMin(now);
            const expectedExit = toMin(ws.exitTime);
            const early = expectedExit - exitMin;
            (existing as any).earlyDepartureMinutes = early > 0 ? early : 0;
            // Hora extra
            const overtime = worked - expected;
            (existing as any).overtimeMinutes = overtime > 0 ? overtime : 0;
          }
        }
        if (photoData) (existing as any).photoData = photoData;
        if (lat != null) (existing as any).latitude = lat;
        if (lng != null) (existing as any).longitude = lng;
        await existing.save();
        return res.json({ message: 'Saída registrada com sucesso.', attendance: existing });
      }
    }

    if (action === 'exit') {
      return res.status(400).json({ message: 'Nenhuma entrada registrada hoje. Registre a entrada primeiro.' });
    }

    // Primeiro toque = entrada
    const toMin2 = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const lateArr = (ws?.entryTime) ? Math.max(0, toMin2(now) - toMin2(ws.entryTime) - (ws.toleranceMinutes ?? 10)) : 0;

    const attendance = new EmployeeAttendance({
      schoolId: link.schoolId,
      employeeId: link.personId,
      employeeName: link.personName,
      cargo: link.cargo || (employee as any)?.cargo || '',
      setor: link.setor || (employee as any)?.setor || '',
      date: today,
      dayOfWeek: dayKey,
      shift: 'integral',
      status: 'present',
      entryTime: now,
      expectedEntryTime: ws?.entryTime || '',
      expectedExitTime: ws?.exitTime || '',
      expectedMinutes: (ws?.entryTime && ws?.exitTime) ? toMin2(ws.exitTime) - toMin2(ws.entryTime) : 0,
      lateArrivalMinutes: lateArr,
      markedById: 'self',
      markedByName: link.personName,
      photoData: photoData || undefined,
      latitude: lat != null ? lat : undefined,
      longitude: lng != null ? lng : undefined,
    });
    await attendance.save();
    return res.json({ message: 'Entrada registrada com sucesso.', attendance });

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LINK GERAL DA ESCOLA (um único link para todos)
// ─────────────────────────────────────────────────────────────────────────────

// POST /school-link — criar ou retornar link geral da escola
router.post('/school-link', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const schoolUser = await User.findById(schoolId).select('schoolName name');
    const schoolName = (schoolUser as any)?.schoolName || (schoolUser as any)?.name || '';

    const existing = await SchoolPontoLink.findOne({ schoolId, isActive: true });
    if (existing) return res.json({ ...existing.toObject(), alreadyExisted: true });

    const token = crypto.randomBytes(24).toString('hex');
    const link = new SchoolPontoLink({ schoolId, schoolName, token, isActive: true, createdBy: req.user!.id });
    await link.save();
    res.status(201).json(link);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /school-public/:token — lista todos funcionários e professores
router.get('/school-public/:token', async (req, res) => {
  try {
    const link = await SchoolPontoLink.findOne({ token: req.params.token, isActive: true });
    if (!link) return res.status(404).json({ message: 'Link não encontrado ou inativo.' });

    const [employees, teachers] = await Promise.all([
      Employee.find({ schoolId: link.schoolId }).select('_id name cargo setor').lean(),
      Teacher.find({ schoolId: link.schoolId }).select('_id name').lean(),
    ]);

    const people = [
      ...employees.map((e: any) => ({ _id: e._id, name: e.name, type: 'employee', cargo: e.cargo || '', setor: e.setor || '' })),
      ...teachers.map((t: any) => ({ _id: t._id, name: t.name, type: 'teacher' })),
    ].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    res.json({
      schoolName: link.schoolName,
      people,
      requireGeolocation: link.requireGeolocation || false,
      latitude: link.latitude,
      longitude: link.longitude,
      areaM2: link.areaM2 || 1000,
      requirePhoto: link.requirePhoto || false,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /school-public/:token/person-info — retorna situação da pessoa hoje
router.post('/school-public/:token/person-info', async (req, res) => {
  try {
    const link = await SchoolPontoLink.findOne({ token: req.params.token, isActive: true });
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });

    const { personType, personId } = req.body;
    if (!personType || !personId || !mongoose.isValidObjectId(personId)) {
      return res.status(400).json({ message: 'Dados inválidos.' });
    }

    const today = todayISO();
    const dayKey = todayDayKey();
    const dayLabel = DAYS_PT[dayKey] || dayKey;

    if (personType === 'teacher') {
      const teacher = await Teacher.findOne({ _id: personId, schoolId: link.schoolId }).lean();
      if (!teacher) return res.status(404).json({ message: 'Professor não encontrado.' });

      const timetables = await GeneratedTimetable.find({ school: link.schoolId }).lean();
      const teacherSlots: any[] = [];
      for (const tt of timetables) {
        for (const slot of (tt as any).slots) {
          if (String(slot.teacherId) === String(personId) && slot.day === dayKey) {
            teacherSlots.push({ ...slot, classId: tt.classId });
          }
        }
      }

      const subjectIds = [...new Set(teacherSlots.map((s: any) => s.subjectId))];
      const classIds   = [...new Set(teacherSlots.map((s: any) => s.classId))];
      const [subjects, classes] = await Promise.all([
        Subject.find({ _id: { $in: subjectIds } }).select('_id name').lean(),
        Class.find({ _id: { $in: classIds } }).select('_id name grade').lean(),
      ]);
      const subjectMap = Object.fromEntries(subjects.map((s: any) => [String(s._id), s.name]));
      const classMap   = Object.fromEntries(classes.map((c: any) => [String(c._id), `${c.name}${c.grade ? ' – ' + c.grade : ''}`]));

      const schedule = teacherSlots
        .sort((a: any, b: any) => a.period - b.period)
        .map((s: any) => ({
          period: s.period,
          startTime: s.startTime || '',
          endTime: s.endTime || '',
          subjectName: subjectMap[s.subjectId] || s.subjectId,
          className: classMap[s.classId] || s.classId,
        }));

      const attendance = await TeacherAttendance.findOne({ teacherId: personId, date: today }).lean();

      return res.json({
        schoolName: link.schoolName,
        personType: 'teacher',
        personName: (teacher as any).name,
        today,
        dayLabel,
        schedule,
        attendance: attendance || null,
      });
    }

    // employee
    const employee = await Employee.findOne({ _id: personId, schoolId: link.schoolId })
      .select('name cargo setor jornadaTrabalho workSchedule email').lean();
    if (!employee) return res.status(404).json({ message: 'Funcionário não encontrado.' });

    const attendance = await EmployeeAttendance.findOne({ employeeId: personId, date: today }).lean();
    const ws = (employee as any).workSchedule;

    return res.json({
      schoolName: link.schoolName,
      personType: 'employee',
      personName: (employee as any).name,
      cargo: (employee as any).cargo || '',
      setor: (employee as any).setor || '',
      jornadaTrabalho: (employee as any).jornadaTrabalho || '',
      workSchedule: ws ? {
        entryTime: ws.entryTime,
        exitTime: ws.exitTime,
        workDays: ws.workDays,
        toleranceMinutes: ws.toleranceMinutes ?? 10,
      } : null,
      requiresEmail: !!((employee as any).email), // indica ao frontend se deve pedir e-mail
      today,
      dayLabel,
      attendance: attendance || null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /school-public/:token/mark — registrar ponto via link geral
router.post('/school-public/:token/mark', async (req, res) => {
  try {
    const link = await SchoolPontoLink.findOne({ token: req.params.token, isActive: true });
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });

    const { personType, personId, action } = req.body;
    if (!personType || !personId || !mongoose.isValidObjectId(personId)) {
      return res.status(400).json({ message: 'Selecione uma pessoa.' });
    }

    const today  = todayISO();
    const dayKey = todayDayKey();
    const now    = nowHHmm();

    // ── PROFESSOR ──────────────────────────────────────────────────────────
    if (personType === 'teacher') {
      const timetables = await GeneratedTimetable.find({ school: link.schoolId }).lean();
      const teacherSlots: any[] = [];
      for (const tt of timetables) {
        for (const slot of (tt as any).slots) {
          if (String(slot.teacherId) === String(personId) && slot.day === dayKey) {
            teacherSlots.push({ ...slot, classId: tt.classId });
          }
        }
      }

      if (teacherSlots.length === 0) {
        return res.status(400).json({ message: 'Nenhuma aula programada para hoje.' });
      }

      const subjectIds = [...new Set(teacherSlots.map((s: any) => s.subjectId))];
      const classIds   = [...new Set(teacherSlots.map((s: any) => s.classId))];
      const [subjects, classes] = await Promise.all([
        Subject.find({ _id: { $in: subjectIds } }).select('_id name').lean(),
        Class.find({ _id: { $in: classIds } }).select('_id name grade').lean(),
      ]);
      const subjectMap = Object.fromEntries(subjects.map((s: any) => [String(s._id), s.name]));
      const classMap   = Object.fromEntries(classes.map((c: any) => [String(c._id), `${c.name}${c.grade ? ' – ' + c.grade : ''}`]));

      const teacher = await Teacher.findById(personId).select('name').lean();
      const teacherName = (teacher as any)?.name || '';

      const classesArr = teacherSlots
        .sort((a: any, b: any) => a.period - b.period)
        .map((s: any) => ({
          period: s.period,
          startTime: s.startTime || '',
          endTime: s.endTime || '',
          subjectId: s.subjectId,
          subjectName: subjectMap[s.subjectId] || s.subjectId,
          classId: s.classId,
          className: classMap[s.classId] || s.classId,
          grade: (classes.find((c: any) => String(c._id) === s.classId) as any)?.grade || '',
          status: 'present',
          markedAt: new Date(),
        }));

      const existing = await TeacherAttendance.findOne({ teacherId: personId, date: today });
      if (existing) {
        return res.json({ message: 'Presença já registrada hoje.', attendance: existing, alreadyMarked: true });
      }

      const attendance = new TeacherAttendance({
        teacherId: personId,
        teacherName,
        schoolId: link.schoolId,
        date: today,
        dayOfWeek: dayKey,
        classes: classesArr,
        totalScheduledClasses: classesArr.length,
        totalPresentClasses: classesArr.length,
        totalAbsentClasses: 0,
      });
      await attendance.save();
      return res.status(201).json({ message: 'Presença confirmada!', attendance });
    }

    // ── FUNCIONÁRIO ────────────────────────────────────────────────────────
    const employee = await Employee.findOne({ _id: personId, schoolId: link.schoolId })
      .select('name cargo setor workSchedule email').lean();
    if (!employee) return res.status(404).json({ message: 'Funcionário não encontrado.' });

    const ws = (employee as any).workSchedule;
    const { lat, lng, photoData, email: providedEmail } = req.body;

    // Verificação de e-mail (credencial anti-fraude)
    const registeredEmail: string | undefined = (employee as any).email;
    if (registeredEmail && providedEmail) {
      if (providedEmail.trim().toLowerCase() !== registeredEmail.trim().toLowerCase()) {
        return res.status(403).json({ message: 'E-mail não confere com o cadastro. Verifique e tente novamente.' });
      }
    } else if (registeredEmail && !providedEmail) {
      return res.status(400).json({ message: 'Este funcionário requer confirmação por e-mail. Informe seu e-mail cadastrado.' });
    }

    // Validação de geolocalização
    if (link.requireGeolocation) {
      if (lat == null || lng == null) {
        return res.status(400).json({ message: 'Geolocalização obrigatória. Permita o acesso à localização.' });
      }
      if (link.latitude != null && link.longitude != null) {
        const R = 6371000;
        const toRad = (d: number) => d * Math.PI / 180;
        const dLat = toRad(lat - link.latitude!);
        const dLon = toRad(lng - link.longitude!);
        const a = Math.sin(dLat/2)**2 + Math.cos(toRad(link.latitude!))*Math.cos(toRad(lat))*Math.sin(dLon/2)**2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const radius = Math.sqrt((link.areaM2 || 1000) / Math.PI);
        if (dist > radius) {
          return res.status(400).json({ message: `Fora da área permitida (${Math.round(dist)}m de distância, máximo ${Math.round(radius)}m).` });
        }
      }
    }

    // Validação de foto
    if (link.requirePhoto && !photoData) {
      return res.status(400).json({ message: 'Foto obrigatória para confirmar o ponto.' });
    }

    const toMin3 = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

    const existing = await EmployeeAttendance.findOne({ employeeId: personId, date: today });

    if (!existing) {
      if (action === 'exit') {
        return res.status(400).json({ message: 'Nenhuma entrada registrada hoje. Registre a entrada primeiro.' });
      }
      const lateArr = ws?.entryTime ? Math.max(0, toMin3(now) - toMin3(ws.entryTime) - (ws.toleranceMinutes ?? 10)) : 0;
      const attendance = new EmployeeAttendance({
        schoolId: link.schoolId,
        employeeId: personId,
        employeeName: (employee as any).name,
        cargo: (employee as any).cargo || '',
        setor: (employee as any).setor || '',
        date: today,
        dayOfWeek: dayKey,
        shift: 'integral',
        status: 'present',
        entryTime: now,
        expectedEntryTime: ws?.entryTime || '',
        expectedExitTime: ws?.exitTime || '',
        expectedMinutes: (ws?.entryTime && ws?.exitTime) ? toMin3(ws.exitTime) - toMin3(ws.entryTime) : 0,
        lateArrivalMinutes: lateArr,
        markedById: 'self',
        markedByName: (employee as any).name,
        photoData: photoData || undefined,
        latitude: lat != null ? lat : undefined,
        longitude: lng != null ? lng : undefined,
        locationValid: lat != null ? true : undefined,
      });
      await attendance.save();
      // Notificação por e-mail (não-bloqueante)
      if (registeredEmail) {
        const school = await User.findById(link.schoolId).select('name').lean();
        sendPontoNotificationEmail({
          personName: (employee as any).name,
          personEmail: registeredEmail,
          schoolName: (school as any)?.name || 'Escola',
          action: 'entry',
          time: now,
          date: new Date().toLocaleDateString('pt-BR'),
          locationValid: lat != null ? true : undefined,
          lateArrivalMinutes: lateArr,
        }).catch(() => {});
      }
      return res.status(201).json({ message: `Entrada registrada às ${now}`, attendance, action: 'entry' });
    }

    if ((existing as any).exitTime) {
      return res.json({ message: 'Ponto já completo hoje (entrada e saída).', attendance: existing, alreadyMarked: true });
    }

    // Segundo toque = saída
    const entry = (existing as any).entryTime || '00:00';
    const worked = Math.max(0, toMin3(now) - toMin3(entry));
    (existing as any).exitTime = now;
    (existing as any).workedMinutes = worked;
    (existing as any).status = 'present';
    if (photoData) (existing as any).photoData = photoData;
    if (lat != null) { (existing as any).latitude = lat; (existing as any).locationValid = true; }
    if (lng != null) (existing as any).longitude = lng;

    if (ws?.entryTime && ws?.exitTime) {
      const expected = toMin3(ws.exitTime) - toMin3(ws.entryTime);
      (existing as any).expectedMinutes = expected;
      (existing as any).expectedExitTime = ws.exitTime;
      const early = toMin3(ws.exitTime) - toMin3(now);
      (existing as any).earlyDepartureMinutes = early > 0 ? early : 0;
      (existing as any).overtimeMinutes = worked - expected > 0 ? worked - expected : 0;
    }
    await existing.save();
    // Notificação por e-mail de saída (não-bloqueante)
    if (registeredEmail) {
      const school = await User.findById(link.schoolId).select('name').lean();
      sendPontoNotificationEmail({
        personName: (employee as any).name,
        personEmail: registeredEmail,
        schoolName: (school as any)?.name || 'Escola',
        action: 'exit',
        time: now,
        date: new Date().toLocaleDateString('pt-BR'),
        earlyDepartureMinutes: (existing as any).earlyDepartureMinutes,
      }).catch(() => {});
    }
    return res.json({ message: `Saída registrada às ${now}`, attendance: existing, action: 'exit' });

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /school-link/settings — atualizar configurações de geolocalização e foto
router.put('/school-link/settings', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { requireGeolocation, latitude, longitude, areaM2, requirePhoto, graceMinutes } = req.body;
    const link = await SchoolPontoLink.findOne({ schoolId, isActive: true });
    if (!link) return res.status(404).json({ message: 'Link geral não encontrado.' });
    if (requireGeolocation !== undefined) link.requireGeolocation = requireGeolocation;
    if (latitude !== undefined) link.latitude = latitude;
    if (longitude !== undefined) link.longitude = longitude;
    if (areaM2 !== undefined) link.areaM2 = areaM2;
    if (requirePhoto !== undefined) link.requirePhoto = requirePhoto;
    if (graceMinutes !== undefined) link.graceMinutes = graceMinutes;
    await link.save();
    res.json(link);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /school-link — retornar link ativo da escola (com configurações)
router.get('/school-link', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const link = await SchoolPontoLink.findOne({ schoolId, isActive: true });
    if (!link) return res.status(404).json({ message: 'Nenhum link encontrado.' });
    res.json(link);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

