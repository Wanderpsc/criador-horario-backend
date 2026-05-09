/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Rotas: Ponto Eletrônico de Professores (por aula)
 */
import express from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import TeacherPontoLink from '../models/TeacherPontoLink';
import TeacherAttendance from '../models/TeacherAttendance';
import GeneratedTimetable from '../models/GeneratedTimetable';
import Teacher from '../models/Teacher';
import Subject from '../models/Subject';
import Class from '../models/Class';
import Schedule from '../models/Schedule';
import User from '../models/User';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ─── helpers ─────────────────────────────────────────────────────────────────

const DAYS_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAYS_PT: Record<string, string> = {
  sunday: 'Domingo',
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
};

// Mapa inglês → formato curto em português (como armazenado nos slots do GeneratedTimetable)
const EN_TO_PT_SHORT: Record<string, string> = {
  sunday:    'Domingo',
  monday:    'Segunda',
  tuesday:   'Terça',
  wednesday: 'Quarta',
  thursday:  'Quinta',
  friday:    'Sexta',
  saturday:  'Sábado',
};

// Helpers BRT (UTC-3) — servidor Render roda em UTC
function nowBRT(): Date {
  return new Date(Date.now() - 3 * 60 * 60 * 1000);
}
function todayISO(): string {
  return nowBRT().toISOString().slice(0, 10); // YYYY-MM-DD (BRT)
}
function todayDayKey(): string {
  return DAYS_EN[nowBRT().getUTCDay()];
}
function nowHHmm(): string {
  const d = nowBRT();
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Haversine distance in meters
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Default periods when Schedule has none
const DEFAULT_PERIODS = [
  { period: 1, startTime: '07:00', endTime: '07:50' },
  { period: 2, startTime: '07:50', endTime: '08:40' },
  { period: 3, startTime: '08:40', endTime: '09:30' },
  { period: 4, startTime: '09:50', endTime: '10:40' },
  { period: 5, startTime: '10:40', endTime: '11:30' },
  { period: 6, startTime: '11:30', endTime: '12:20' },
  { period: 7, startTime: '13:40', endTime: '14:30' },
  { period: 8, startTime: '14:30', endTime: '15:20' },
];

// ─── Fetch or build teacher's schedule slots for a given day ─────────────────

async function getTeacherSlotsForDay(
  schoolId: string,
  teacherId: string,
  dayKey: string,
  activeTimetableId?: string
): Promise<{ period: number; startTime: string; endTime: string; subjectId: string; subjectName: string; classId: string; className: string; grade: string; isPedagogical: boolean }[]> {
  // Filtrar pelo horário ativo se configurado; incluir timetables com school OU userId
  const baseOr = [{ school: schoolId }, { userId: schoolId }];
  const query: any = activeTimetableId
    ? { $or: baseOr, scheduleId: activeTimetableId }
    : { $or: baseOr };
  const timetables = await GeneratedTimetable.find(query).lean();

  const rawSlots: any[] = [];
  // slot.day pode ser 'Segunda','Terça'... (PT curto) ou 'monday','tuesday'... (EN)
  const dayKeyPT = EN_TO_PT_SHORT[dayKey] || dayKey; // ex: 'monday' → 'Segunda'
  for (const tt of timetables) {
    for (const slot of (tt as any).slots) {
      const slotDay: string = slot.day || '';
      const matchesDay =
        slotDay === dayKeyPT ||          // PT curto: 'Segunda'
        slotDay === dayKey ||             // EN: 'monday'
        slotDay.toLowerCase() === dayKey; // fallback case-insensitive EN
      if (String(slot.teacherId) === String(teacherId) && matchesDay) {
        rawSlots.push({ ...slot, classId: tt.classId });
      }
    }
  }

  if (rawSlots.length === 0) return [];

  // Deduplicate by period+classId
  const seen = new Map<string, any>();
  for (const s of rawSlots) {
    const key = `${s.period}-${s.classId}`;
    if (!seen.has(key)) seen.set(key, s);
  }
  const slots = Array.from(seen.values());

  // Enrich subject & class names
  const subjectIds = [...new Set(slots.map((s: any) => s.subjectId))];
  const classIds   = [...new Set(slots.map((s: any) => s.classId))];
  const [subjects, classes] = await Promise.all([
    Subject.find({ _id: { $in: subjectIds } }).select('_id name').lean(),
    Class.find({ _id: { $in: classIds } }).select('_id name grade').lean(),
  ]);
  const subjectMap = Object.fromEntries((subjects as any[]).map(s => [String(s._id), s.name]));
  const classMap   = Object.fromEntries((classes as any[]).map(c => [String(c._id), { name: c.name, grade: c.grade || '' }]));

  // Resolve period times from Schedule or defaults
  let periodTimes: { period: number; startTime: string; endTime: string }[] = DEFAULT_PERIODS;
  try {
    const schedule = await Schedule.findOne({ userId: schoolId });
    if (schedule?.periods && schedule.periods.length > 0) {
      periodTimes = schedule.periods as any;
    }
  } catch {}
  const periodMap = Object.fromEntries(periodTimes.map(p => [p.period, p]));

  return slots
    .sort((a: any, b: any) => a.period - b.period)
    .map((s: any) => {
      const pInfo = periodMap[s.period] || { startTime: '00:00', endTime: '00:00' };
      const cInfo = classMap[s.classId] || { name: 'Turma', grade: '' };
      // Detectar HP: subjectId vazio ou subject inexistente no mapa
      const isHP = !s.subjectId || s.subjectId === '' || (!subjectMap[s.subjectId] && !s.subjectId);
      return {
        period: s.period,
        startTime: s.startTime || pInfo.startTime,
        endTime: s.endTime || pInfo.endTime,
        subjectId: s.subjectId || '',
        subjectName: isHP ? 'Horário Pedagógico' : (subjectMap[s.subjectId] || 'Disciplina'),
        classId: s.classId || '',
        className: isHP ? '' : cInfo.name,
        grade: isHP ? '' : (cInfo.grade || s.grade || ''),
        isPedagogical: isHP,
      };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// ROTAS ADMIN (requerem autenticação)
// ─────────────────────────────────────────────────────────────────────────────

// GET /teacher-ponto-link — retorna ou cria o link da escola
router.get('/teacher-ponto-link', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const existing = await TeacherPontoLink.findOne({ schoolId, isActive: true });
    if (existing) return res.json(existing);

    // auto-create
    const schoolUser = await User.findById(schoolId).select('schoolName name');
    const schoolName = (schoolUser as any)?.schoolName || (schoolUser as any)?.name || '';
    const token = crypto.randomBytes(24).toString('hex');
    const link = new TeacherPontoLink({ schoolId, schoolName, token, isActive: true, createdBy: req.user!.id });
    await link.save();
    res.status(201).json(link);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /teacher-ponto-link/settings — atualiza configurações do link
router.put('/teacher-ponto-link/settings', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { requireGeolocation, latitude, longitude, areaM2, requirePhoto, graceMinutes, activeTimetableId } = req.body;
    const link = await TeacherPontoLink.findOneAndUpdate(
      { schoolId, isActive: true },
      { requireGeolocation, latitude, longitude, areaM2, requirePhoto, graceMinutes, activeTimetableId: activeTimetableId || '' },
      { new: true }
    );
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });
    res.json(link);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /teacher-ponto-link — desativa link e gera novo token
router.delete('/teacher-ponto-link', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    await TeacherPontoLink.updateMany({ schoolId }, { isActive: false });
    res.json({ message: 'Link desativado.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /teacher-ponto-live — retorna todos os registros de hoje para admin (tempo real)
router.get('/teacher-ponto-live', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const today = todayISO();
    const records = await TeacherAttendance.find({ schoolId, date: today }).lean();
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROTAS PÚBLICAS (sem autenticação)
// ─────────────────────────────────────────────────────────────────────────────

// GET /teacher-public/:token — lista professores da escola
router.get('/teacher-public/:token', async (req, res) => {
  try {
    const link = await TeacherPontoLink.findOne({ token: req.params.token, isActive: true });
    if (!link) return res.status(404).json({ message: 'Link não encontrado ou inativo.' });

    const teachers = await Teacher.find({ schoolId: link.schoolId, isActive: true })
      .select('_id name')
      .sort({ name: 1 })
      .lean();

    res.json({
      schoolName: link.schoolName,
      teachers: (teachers as any[]).map(t => ({ _id: t._id, name: t.name })),
      requireGeolocation: link.requireGeolocation,
      latitude: link.latitude,
      longitude: link.longitude,
      areaM2: link.areaM2 || 1000,
      requirePhoto: link.requirePhoto,
      graceMinutes: link.graceMinutes ?? 10,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /teacher-public/:token/teacher-schedule
// Retorna horário do professor hoje + registro de frequência + auto-marca ausentes expirados
router.post('/teacher-public/:token/teacher-schedule', async (req, res) => {
  try {
    const link = await TeacherPontoLink.findOne({ token: req.params.token, isActive: true });
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });

    const { teacherId } = req.body;
    if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
      return res.status(400).json({ message: 'teacherId inválido.' });
    }

    const teacher = await Teacher.findOne({ _id: teacherId, schoolId: link.schoolId }).select('_id name email').lean();
    if (!teacher) return res.status(404).json({ message: 'Professor não encontrado.' });

    const today  = todayISO();
    const dayKey = todayDayKey();
    const now    = nowHHmm();
    const graceMinutes = link.graceMinutes ?? 10;

    // Slots do horário gerado (filtrado pelo timetable ativo se configurado)
    const slots = await getTeacherSlotsForDay(link.schoolId, teacherId, dayKey, link.activeTimetableId || undefined);

    // Buscar ou criar registro de frequência do dia
    let attendance = await TeacherAttendance.findOne({ teacherId, schoolId: link.schoolId, date: today });

    if (!attendance && slots.length > 0) {
      // Inicializar com todas as aulas como pending
      const teacherDoc = teacher as any;
      attendance = new TeacherAttendance({
        teacherId,
        teacherName: teacherDoc.name,
        schoolId: link.schoolId,
        date: today,
        dayOfWeek: dayKey,
        classes: slots.map(s => ({
          period: s.period,
          startTime: s.startTime,
          endTime: s.endTime,
          subjectId: s.subjectId,
          subjectName: s.subjectName,
          classId: s.classId,
          className: s.className,
          grade: s.grade,
          status: 'pending',
          isPedagogical: s.isPedagogical || false,
        })),
        schoolYear: new Date().getFullYear(),
      });
      await attendance.save();
    }

    // Auto-absence: aulas cujo endTime + graceMinutes já passou e não tem entryTime
    if (attendance) {
      let changed = false;
      for (const cls of (attendance as any).classes) {
        if (
          cls.status === 'pending' &&
          !cls.entryTime &&
          cls.endTime &&
          toMin(now) > toMin(cls.endTime) + graceMinutes
        ) {
          cls.status = 'absent';
          cls.markedAt = new Date();
          changed = true;
        }
      }
      if (changed) await attendance.save();
    }

    res.json({
      schoolName: link.schoolName,
      teacherName: (teacher as any).name,
      requiresEmail: !!((teacher as any).email),
      today,
      dayLabel: DAYS_PT[dayKey] || dayKey,
      slots,       // horário do timetable (para referência)
      attendance: attendance ? attendance.toObject() : null,
    });
  } catch (err: any) {
    console.error('[teacher-ponto] teacher-schedule error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /teacher-public/:token/mark
// Marca entrada ou saída de um período específico
router.post('/teacher-public/:token/mark', async (req, res) => {
  try {
    const link = await TeacherPontoLink.findOne({ token: req.params.token, isActive: true });
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });

    const {
      teacherId,
      period,
      action,     // 'entry' | 'exit'
      lat,
      lng,
      photoData,
      email,
    } = req.body;

    if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
      return res.status(400).json({ message: 'teacherId inválido.' });
    }
    if (!period || action !== 'entry') {
      return res.status(400).json({ message: 'period é obrigatório.' });
    }

    const teacher = await Teacher.findOne({ _id: teacherId, schoolId: link.schoolId })
      .select('name email').lean() as any;
    if (!teacher) return res.status(404).json({ message: 'Professor não encontrado.' });

    // Email verification (same as employee ponto)
    const registeredEmail: string = teacher.email?.trim().toLowerCase() || '';
    const providedEmail: string   = (email || '').trim().toLowerCase();
    if (registeredEmail) {
      if (!providedEmail) {
        return res.status(400).json({ message: 'Este professor requer confirmação por e-mail.' });
      }
      if (providedEmail !== registeredEmail) {
        return res.status(403).json({ message: 'E-mail não confere com o cadastrado. Verifique e tente novamente.' });
      }
    }

    // Geolocation check
    let locationValid = true;
    if (link.requireGeolocation && link.latitude != null && link.longitude != null) {
      if (lat == null || lng == null) {
        return res.status(400).json({ message: 'Localização obrigatória. Ative o GPS.' });
      }
      const radius = Math.sqrt((link.areaM2 || 1000) / Math.PI);
      const dist = haversineDistance(link.latitude, link.longitude, lat, lng);
      locationValid = dist <= radius;
      if (!locationValid) {
        return res.status(403).json({
          message: `Fora da área permitida (${Math.round(dist)}m de distância, limite: ${Math.round(radius)}m).`,
          distance: Math.round(dist),
          radius: Math.round(radius),
        });
      }
    }

    // Photo check
    if (link.requirePhoto && !photoData) {
      return res.status(400).json({ message: 'Foto obrigatória.' });
    }

    const today  = todayISO();
    const dayKey = todayDayKey();
    const now    = nowHHmm();
    const graceMinutes = link.graceMinutes ?? 10;

    // Build or fetch attendance record
    let attendance = await TeacherAttendance.findOne({ teacherId, schoolId: link.schoolId, date: today });

    if (!attendance) {
      // Initialize from timetable (filtrado pelo timetable ativo se configurado)
      const slots = await getTeacherSlotsForDay(link.schoolId, teacherId, dayKey, link.activeTimetableId || undefined);
      if (slots.length === 0) {
        return res.status(400).json({ message: 'Nenhuma aula programada para hoje.' });
      }
      attendance = new TeacherAttendance({
        teacherId,
        teacherName: teacher.name,
        schoolId: link.schoolId,
        date: today,
        dayOfWeek: dayKey,
        classes: slots.map(s => ({
          period: s.period,
          startTime: s.startTime,
          endTime: s.endTime,
          subjectId: s.subjectId,
          subjectName: s.subjectName,
          classId: s.classId,
          className: s.className,
          grade: s.grade,
          status: 'pending',
          isPedagogical: s.isPedagogical || false,
        })),
        schoolYear: new Date().getFullYear(),
      });
    }

    // Find the class in the attendance record
    const clsIndex = (attendance as any).classes.findIndex((c: any) => c.period === period);
    if (clsIndex === -1) {
      return res.status(404).json({ message: `Aula do período ${period} não encontrada no registro.` });
    }
    const cls = (attendance as any).classes[clsIndex];

    // Único toque: registrar presença imediatamente
    if (cls.entryTime || cls.status === 'present') {
      return res.status(400).json({ message: 'Presença já registrada para este período.' });
    }

    // Check grace: não pode registrar após o fim do período + tolerância
    if (cls.endTime && toMin(now) > toMin(cls.endTime) + graceMinutes) {
      return res.status(400).json({ message: 'Prazo de registro encerrado para este período.' });
    }

    cls.entryTime     = now;
    cls.status        = 'present';
    cls.markedAt      = new Date();
    cls.locationValid = locationValid;
    if (photoData) cls.photoData = photoData;

    await attendance.save();
    res.json({ message: 'Presença registrada com sucesso.', attendance });
  } catch (err: any) {
    console.error('[teacher-ponto] mark error:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
