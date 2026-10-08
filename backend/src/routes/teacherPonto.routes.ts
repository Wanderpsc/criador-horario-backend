/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Rotas: Ponto Eletrônico de Professores (por aula)
 */
import express from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import TeacherPontoLink from '../models/TeacherPontoLink';
import AttendanceLink from '../models/AttendanceLink';
import TeacherAttendance from '../models/TeacherAttendance';
import GeneratedTimetable from '../models/GeneratedTimetable';
import Teacher from '../models/Teacher';
import Subject from '../models/Subject';
import Class from '../models/Class';
import Schedule from '../models/Schedule';
import SchoolDay from '../models/SchoolDay';
import User from '../models/User';
import { auth, AuthRequest, schoolAdminOnly } from '../middleware/auth';
import { getAttendanceLocation, validateAttendanceLocation } from '../services/attendance-location.service';
import {
  validateAttendancePhoto,
  verifyAttendanceDevice,
} from '../services/attendance-device.service';

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

async function resolveIndividualTeacherLink(token: string) {
  const individualLink = await AttendanceLink.findOne({
    token,
    isActive: true,
    personType: 'teacher',
  }).lean() as any;
  if (!individualLink) return null;

  const [settings, location] = await Promise.all([
    TeacherPontoLink.findOne({
      schoolId: individualLink.schoolId,
      isActive: true,
    }).lean() as any,
    getAttendanceLocation(individualLink.schoolId),
  ]);

  return {
    attendanceLinkId: String(individualLink._id),
    schoolId: individualLink.schoolId,
    schoolName: individualLink.schoolName,
    teacherId: individualLink.personId,
    isEnabled: settings?.isEnabled !== false,
    requireGeolocation: location.required,
    latitude: location.latitude,
    longitude: location.longitude,
    areaM2: Math.PI * location.radiusMeters ** 2,
    radiusMeters: location.radiusMeters,
    requirePhoto: settings?.requirePhoto || false,
    graceMinutes: settings?.graceMinutes ?? 10,
    activeTimetableId: settings?.activeTimetableId || '',
  };
}

// ─── Detectar sábado letivo com referência de dia ────────────────────────────
// Retorna { effectiveDayKey, isMakeupSaturday, followWeekday }
// effectiveDayKey = followWeekday se for sábado letivo, caso contrário = dayKey
async function getEffectiveDayKey(
  schoolId: string,
  dateISO: string,
  dayKey: string
): Promise<{ effectiveDayKey: string; isMakeupSaturday: boolean; followWeekday: string | null }> {
  if (dayKey !== 'saturday') {
    return { effectiveDayKey: dayKey, isMakeupSaturday: false, followWeekday: null };
  }
  try {
    // Buscar SchoolDay para esta data (tipo saturday com followWeekday)
    const start = new Date(dateISO + 'T00:00:00.000Z');
    const end   = new Date(dateISO + 'T23:59:59.999Z');
    const schoolDay = await SchoolDay.findOne({
      schoolId,
      date: { $gte: start, $lte: end },
      dayType: 'saturday',
      followWeekday: { $exists: true, $ne: '' },
    }).lean() as any;

    if (schoolDay?.followWeekday) {
      return {
        effectiveDayKey: schoolDay.followWeekday as string,
        isMakeupSaturday: true,
        followWeekday: schoolDay.followWeekday as string,
      };
    }
  } catch (_) {}
  return { effectiveDayKey: dayKey, isMakeupSaturday: false, followWeekday: null };
}

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
router.get('/teacher-ponto-link', auth, schoolAdminOnly, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const existing = await TeacherPontoLink.findOne({ schoolId, isActive: true });
    if (existing) {
      const location = await getAttendanceLocation(schoolId);
      return res.json({
        ...existing.toObject(),
        requireGeolocation: location.required,
        latitude: location.latitude,
        longitude: location.longitude,
        areaM2: Math.PI * location.radiusMeters ** 2,
        radiusMeters: location.radiusMeters,
      });
    }

    // auto-create
    const schoolUser = await User.findById(schoolId).select('schoolName name');
    const schoolName = (schoolUser as any)?.schoolName || (schoolUser as any)?.name || '';
    const token = crypto.randomBytes(24).toString('hex');
    const link = new TeacherPontoLink({ schoolId, schoolName, token, isActive: true, createdBy: req.user!.id });
    await link.save();
    const location = await getAttendanceLocation(schoolId);
    res.status(201).json({
      ...link.toObject(),
      requireGeolocation: location.required,
      latitude: location.latitude,
      longitude: location.longitude,
      areaM2: Math.PI * location.radiusMeters ** 2,
      radiusMeters: location.radiusMeters,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /teacher-ponto-link/settings — atualiza configurações do link
router.put('/teacher-ponto-link/settings', auth, schoolAdminOnly, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { requireGeolocation, latitude, longitude, areaM2, requirePhoto, graceMinutes, activeTimetableId } = req.body;
    const link = await TeacherPontoLink.findOneAndUpdate(
      { schoolId, isActive: true },
      { requirePhoto, graceMinutes, activeTimetableId: activeTimetableId || '' },
      { new: true }
    );
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });
    const radiusMeters = areaM2 ? Math.sqrt(Number(areaM2) / Math.PI) : 50;
    await User.findByIdAndUpdate(schoolId, {
      attendanceLocation: {
        required: !!requireGeolocation,
        latitude,
        longitude,
        radiusMeters,
      },
    });
    res.json({
      ...link.toObject(),
      requireGeolocation: !!requireGeolocation,
      latitude,
      longitude,
      areaM2: Math.PI * radiusMeters ** 2,
      radiusMeters,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /teacher-ponto-link/toggle — liga ou desliga o ponto sem perder dados
router.put('/teacher-ponto-link/toggle', auth, schoolAdminOnly, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const link = await TeacherPontoLink.findOne({ schoolId, isActive: true });
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });
    link.isEnabled = !link.isEnabled;
    await link.save();
    res.json(link);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /teacher-ponto-link — desativa link e gera novo token
router.delete('/teacher-ponto-link', auth, schoolAdminOnly, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    await TeacherPontoLink.updateMany({ schoolId }, { isActive: false });
    res.json({ message: 'Link desativado.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /teacher-ponto-live — retorna todos os registros de hoje para admin (tempo real)
router.get('/teacher-ponto-live', auth, schoolAdminOnly, async (req: AuthRequest, res) => {
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
    const link = await resolveIndividualTeacherLink(req.params.token);
    if (!link) return res.status(404).json({ message: 'Link não encontrado ou inativo.' });
    const deviceCheck = await verifyAttendanceDevice(req, link.attendanceLinkId);
    if (!deviceCheck.valid) {
      return res.status(deviceCheck.code === 'DEVICE_NOT_REGISTERED' ? 428 : 403).json(deviceCheck);
    }

    // Ponto desativado pelo administrador
    if (link.isEnabled === false) {
      return res.status(403).json({ message: 'O ponto eletrônico está desativado no momento. Contate a administração.' });
    }

    const teachers = await Teacher.find({ _id: link.teacherId, schoolId: link.schoolId, isActive: true })
      .select('_id name')
      .sort({ name: 1 })
      .lean();

    res.json({
      schoolName: link.schoolName,
      teachers: (teachers as any[]).map(t => ({ _id: t._id, name: t.name })),
      requireGeolocation: link.requireGeolocation,
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
    const link = await resolveIndividualTeacherLink(req.params.token);
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });
    const deviceCheck = await verifyAttendanceDevice(req, link.attendanceLinkId);
    if (!deviceCheck.valid) {
      return res.status(deviceCheck.code === 'DEVICE_NOT_REGISTERED' ? 428 : 403).json(deviceCheck);
    }

    const teacherId = link.teacherId;
    if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
      return res.status(400).json({ message: 'teacherId inválido.' });
    }

    const teacher = await Teacher.findOne({ _id: teacherId, schoolId: link.schoolId }).select('_id name email').lean();
    if (!teacher) return res.status(404).json({ message: 'Professor não encontrado.' });

    const today  = todayISO();
    const dayKey = todayDayKey();
    const now    = nowHHmm();
    const graceMinutes = link.graceMinutes ?? 10;

    // Verificar sábado letivo com followWeekday
    const { effectiveDayKey, isMakeupSaturday, followWeekday } = await getEffectiveDayKey(link.schoolId, today, dayKey);

    // Slots do horário gerado (filtrado pelo timetable ativo se configurado)
    const slots = await getTeacherSlotsForDay(link.schoolId, teacherId, effectiveDayKey, link.activeTimetableId || undefined);

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
        dayOfWeek: effectiveDayKey,
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
      dayLabel: isMakeupSaturday && followWeekday
        ? `Sábado Letivo (referência: ${DAYS_PT[followWeekday] || followWeekday})`
        : DAYS_PT[effectiveDayKey] || effectiveDayKey,
      isMakeupSaturday,
      followWeekday,
      slots,       // horário do timetable (para referência)
      attendance: attendance ? attendance.toObject() : null,
    });
  } catch (err: any) {
    console.error('[teacher-ponto] teacher-schedule error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /teacher-public/:token/school-presence
// Registra a chegada à escola e a saída após o último horário previsto.
router.post('/teacher-public/:token/school-presence', async (req, res) => {
  try {
    const link = await resolveIndividualTeacherLink(req.params.token);
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });
    const deviceCheck = await verifyAttendanceDevice(req, link.attendanceLinkId);
    if (!deviceCheck.valid) {
      return res.status(deviceCheck.code === 'DEVICE_NOT_REGISTERED' ? 428 : 403).json(deviceCheck);
    }
    if (link.isEnabled === false) {
      return res.status(403).json({ message: 'O ponto eletrônico está desativado.' });
    }

    const { action, lat, lng, accuracy, photoData, email } = req.body;
    if (!['entry', 'exit'].includes(action)) {
      return res.status(400).json({ message: 'Ação de presença escolar inválida.' });
    }

    const teacherId = link.teacherId;
    const teacher = await Teacher.findOne({ _id: teacherId, schoolId: link.schoolId })
      .select('name email').lean() as any;
    if (!teacher) return res.status(404).json({ message: 'Professor não encontrado.' });

    const registeredEmail = teacher.email?.trim().toLowerCase() || '';
    const providedEmail = String(email || '').trim().toLowerCase();
    if (registeredEmail && !providedEmail) {
      return res.status(400).json({ message: 'Este professor requer confirmação por e-mail.' });
    }
    if (registeredEmail && providedEmail !== registeredEmail) {
      return res.status(403).json({ message: 'E-mail não confere com o cadastrado.' });
    }

    const locationCheck = await validateAttendanceLocation(link.schoolId, lat, lng, accuracy);
    if (!locationCheck.valid) {
      return res.status(locationCheck.configured ? 403 : 400).json({
        message: locationCheck.message,
        distance: locationCheck.distanceMeters,
        radius: locationCheck.radiusMeters,
      });
    }
    const photoError = validateAttendancePhoto(photoData, link.requirePhoto);
    if (photoError) return res.status(400).json({ message: photoError });

    const today = todayISO();
    const dayKey = todayDayKey();
    const now = nowHHmm();
    const { effectiveDayKey } = await getEffectiveDayKey(link.schoolId, today, dayKey);
    const slots = await getTeacherSlotsForDay(
      link.schoolId,
      teacherId,
      effectiveDayKey,
      link.activeTimetableId || undefined
    );
    if (slots.length === 0) {
      return res.status(400).json({ message: 'Nenhuma aula prevista para este professor hoje.' });
    }

    const firstStartTime = slots
      .map(slot => slot.startTime)
      .filter(Boolean)
      .sort((a, b) => toMin(a) - toMin(b))[0];
    const lastEndTime = slots
      .map(slot => slot.endTime)
      .filter(Boolean)
      .sort((a, b) => toMin(b) - toMin(a))[0];
    if (!firstStartTime || !lastEndTime) {
      return res.status(400).json({ message: 'O horário atual não possui início e término válidos.' });
    }

    let attendance = await TeacherAttendance.findOne({
      teacherId,
      schoolId: link.schoolId,
      date: today,
    });
    if ((attendance as any)?.schoolPresenceRejected) {
      return res.status(403).json({
        message: 'A permanência escolar foi recusada. Procure a central para regularização manual.',
      });
    }
    if (!attendance) {
      attendance = new TeacherAttendance({
        teacherId,
        teacherName: teacher.name,
        schoolId: link.schoolId,
        date: today,
        dayOfWeek: effectiveDayKey,
        classes: slots.map(slot => ({
          period: slot.period,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subjectId: slot.subjectId,
          subjectName: slot.subjectName,
          classId: slot.classId,
          className: slot.className,
          grade: slot.grade,
          status: 'pending',
          isPedagogical: slot.isPedagogical || false,
        })),
        schoolYear: new Date().getFullYear(),
      });
    }

    (attendance as any).expectedFirstStartTime = firstStartTime;
    (attendance as any).expectedLastEndTime = lastEndTime;

    if (action === 'entry') {
      if ((attendance as any).schoolEntryTime) {
        return res.status(409).json({ message: 'A entrada na escola já foi registrada hoje.' });
      }
      (attendance as any).schoolEntryTime = now;
      (attendance as any).schoolEntryAt = new Date();
      (attendance as any).schoolArrivalDelayMinutes = Math.max(
        0,
        toMin(now) - toMin(firstStartTime) - (link.graceMinutes ?? 10)
      );
      (attendance as any).schoolEntryLocationValid = locationCheck.valid;
      (attendance as any).schoolPresenceMarkedById = 'self';
      (attendance as any).schoolPresenceMarkedByName = teacher.name;
      if (photoData) (attendance as any).schoolEntryPhotoData = photoData;
    } else {
      if (!(attendance as any).schoolEntryTime) {
        return res.status(400).json({ message: 'Registre primeiro a entrada na escola.' });
      }
      if ((attendance as any).schoolExitTime) {
        return res.status(409).json({ message: 'A saída da escola já foi registrada hoje.' });
      }
      if (toMin(now) < toMin(lastEndTime)) {
        return res.status(400).json({
          message: `A saída só poderá ser registrada após o último horário, às ${lastEndTime}.`,
        });
      }
      (attendance as any).schoolExitTime = now;
      (attendance as any).schoolExitAt = new Date();
      (attendance as any).schoolEarlyDepartureMinutes = 0;
      (attendance as any).schoolExitLocationValid = locationCheck.valid;
      (attendance as any).schoolPresenceComplete = true;
      (attendance as any).schoolPresenceMarkedById = 'self';
      (attendance as any).schoolPresenceMarkedByName = teacher.name;
      if (photoData) (attendance as any).schoolExitPhotoData = photoData;
    }

    await attendance.save();
    return res.json({
      message: action === 'entry'
        ? `Entrada na escola registrada às ${now}.`
        : `Saída da escola registrada às ${now}. Permanência diária comprovada.`,
      attendance,
    });
  } catch (err: any) {
    console.error('[teacher-ponto] school-presence error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /teacher-public/:token/mark
// Marca entrada ou saída de um período específico
router.post('/teacher-public/:token/mark', async (req, res) => {
  try {
    const link = await resolveIndividualTeacherLink(req.params.token);
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });
    const deviceCheck = await verifyAttendanceDevice(req, link.attendanceLinkId);
    if (!deviceCheck.valid) {
      return res.status(deviceCheck.code === 'DEVICE_NOT_REGISTERED' ? 428 : 403).json(deviceCheck);
    }

    if (link.isEnabled === false) {
      return res.status(403).json({ message: 'O ponto eletrônico está desativado. Não é possível registrar.' });
    }

    const {
      period,
      action,     // 'entry' | 'exit'
      lat,
      lng,
      accuracy,
      photoData,
      email,
      justification,
    } = req.body;
    const teacherId = link.teacherId;

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

    const locationCheck = await validateAttendanceLocation(link.schoolId, lat, lng, accuracy);
    if (!locationCheck.valid) {
      return res.status(locationCheck.configured ? 403 : 400).json({
        message: locationCheck.message,
        distance: locationCheck.distanceMeters,
        radius: locationCheck.radiusMeters,
      });
    }

    // Photo check
    const photoError = validateAttendancePhoto(photoData, link.requirePhoto);
    if (photoError) return res.status(400).json({ message: photoError });

    const today  = todayISO();
    const dayKey = todayDayKey();
    const now    = nowHHmm();
    const graceMinutes = link.graceMinutes ?? 10;

    // Verificar sábado letivo com followWeekday
    const { effectiveDayKey: markDayKey } = await getEffectiveDayKey(link.schoolId, today, dayKey);

    // Build or fetch attendance record
    let attendance = await TeacherAttendance.findOne({ teacherId, schoolId: link.schoolId, date: today });

    if (!attendance) {
      // Initialize from timetable (filtrado pelo timetable ativo se configurado)
      const slots = await getTeacherSlotsForDay(link.schoolId, teacherId, markDayKey, link.activeTimetableId || undefined);
      if (slots.length === 0) {
        return res.status(400).json({ message: 'Nenhuma aula programada para hoje.' });
      }
      attendance = new TeacherAttendance({
        teacherId,
        teacherName: teacher.name,
        schoolId: link.schoolId,
        date: today,
        dayOfWeek: markDayKey,
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
      return res.status(409).json({
        message: 'Presença já registrada para este período. Somente a administração pode fazer alterações.',
      });
    }

    const beforeWindow = cls.startTime && toMin(now) < toMin(cls.startTime) - graceMinutes;
    const afterWindow = cls.endTime && toMin(now) > toMin(cls.endTime) + graceMinutes;
    const outsideSchedule = Boolean(beforeWindow || afterWindow);
    if (outsideSchedule && (!justification || String(justification).trim().length < 10)) {
      return res.status(400).json({
        message: 'Informe uma justificativa com pelo menos 10 caracteres para registrar fora do horário da aula.',
        requiresJustification: true,
      });
    }

    cls.entryTime     = now;
    cls.status        = 'present';
    cls.markedAt      = new Date();
    cls.locationValid = locationCheck.valid;
    if (lat != null) cls.latitude = lat;
    if (lng != null) cls.longitude = lng;
    if (locationCheck.distanceMeters != null) cls.locationDistanceMeters = locationCheck.distanceMeters;
    if (photoData) cls.photoData = photoData;
    cls.markedByElectronicPoint = true;
    cls.lateMinutes = cls.startTime
      ? Math.max(0, toMin(now) - toMin(cls.startTime) - graceMinutes)
      : 0;
    cls.punctualityStatus = beforeWindow
      ? 'early'
      : afterWindow
        ? 'outside_schedule'
        : cls.lateMinutes > 0
          ? 'late'
          : 'on_time';
    cls.requiresReview = outsideSchedule;
    cls.exceptionReason = beforeWindow
      ? 'Registro realizado antes da janela da aula.'
      : afterWindow
        ? 'Registro realizado após a janela da aula.'
        : '';
    cls.justification = outsideSchedule ? String(justification).trim() : '';

    await attendance.save();
    res.json({
      message: outsideSchedule
        ? 'Presença registrada com ressalva e encaminhada aos relatórios.'
        : 'Presença registrada com sucesso.',
      attendance,
      requiresReview: outsideSchedule,
    });
  } catch (err: any) {
    console.error('[teacher-ponto] mark error:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
