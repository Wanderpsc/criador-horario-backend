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
      .select('jornadaTrabalho cargaHorariaSemanal setor cargo')
      .lean();

    const attendance = await EmployeeAttendance.findOne({
      employeeId: link.personId,
      date: today,
    }).lean();

    return res.json({
      ...baseInfo,
      jornadaTrabalho: (employee as any)?.jornadaTrabalho || '',
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
    const employee = await Employee.findOne({ _id: link.personId, schoolId: link.schoolId }).lean();

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
          (existing as any).workedMinutes = (xh * 60 + xm) - (eh * 60 + em);
        }
        await existing.save();
        return res.json({ message: 'Saída registrada com sucesso.', attendance: existing });
      }
    }

    if (action === 'exit') {
      return res.status(400).json({ message: 'Nenhuma entrada registrada hoje. Registre a entrada primeiro.' });
    }

    // Primeiro toque = entrada
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
      markedById: 'self',
      markedByName: link.personName,
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

    res.json({ schoolName: link.schoolName, people });
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
    const employee = await Employee.findOne({ _id: personId, schoolId: link.schoolId }).lean();
    if (!employee) return res.status(404).json({ message: 'Funcionário não encontrado.' });

    const attendance = await EmployeeAttendance.findOne({ employeeId: personId, date: today }).lean();

    return res.json({
      schoolName: link.schoolName,
      personType: 'employee',
      personName: (employee as any).name,
      cargo: (employee as any).cargo || '',
      setor: (employee as any).setor || '',
      jornadaTrabalho: (employee as any).jornadaTrabalho || '',
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
    const employee = await Employee.findOne({ _id: personId, schoolId: link.schoolId }).lean();
    if (!employee) return res.status(404).json({ message: 'Funcionário não encontrado.' });

    const existing = await EmployeeAttendance.findOne({ employeeId: personId, date: today });

    if (!existing) {
      if (action === 'exit') {
        return res.status(400).json({ message: 'Nenhuma entrada registrada hoje. Registre a entrada primeiro.' });
      }
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
        markedById: 'self',
        markedByName: (employee as any).name,
      });
      await attendance.save();
      return res.status(201).json({ message: `Entrada registrada às ${now}`, attendance, action: 'entry' });
    }

    if ((existing as any).exitTime) {
      return res.json({ message: 'Ponto já completo hoje (entrada e saída).', attendance: existing, alreadyMarked: true });
    }

    // Segundo toque = saída
    const entry = (existing as any).entryTime || '00:00';
    const [eh, em] = entry.split(':').map(Number);
    const [xh, xm] = now.split(':').map(Number);
    (existing as any).exitTime = now;
    (existing as any).workedMinutes = Math.max(0, (xh * 60 + xm) - (eh * 60 + em));
    (existing as any).status = 'present';
    await existing.save();
    return res.json({ message: `Saída registrada às ${now}`, attendance: existing, action: 'exit' });

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

