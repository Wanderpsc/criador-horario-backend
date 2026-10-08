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
import TeacherPontoLink from '../models/TeacherPontoLink';
import Employee from '../models/Employee';
import Teacher from '../models/Teacher';
import EmployeeAttendance from '../models/EmployeeAttendance';
import TeacherAttendance from '../models/TeacherAttendance';
import GeneratedTimetable from '../models/GeneratedTimetable';
import Subject from '../models/Subject';
import Class from '../models/Class';
import User from '../models/User';
import SchoolDay from '../models/SchoolDay';
import { auth, AuthRequest, schoolAdminOnly } from '../middleware/auth';
import { sendPontoNotificationEmail } from '../services/email.service';
import { getAttendanceLocation, validateAttendanceLocation } from '../services/attendance-location.service';
import {
  compareEnrollmentToken,
  createDeviceSecret,
  hashDeviceValue,
  validateAttendancePhoto,
  verifyAttendanceDevice,
} from '../services/attendance-device.service';

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
const DEVICE_ENROLLMENT_MINUTES = 10;

// Retorna o instante atual ajustado para o fuso BRT (UTC-3)
// Usando deslocamento fixo pois o servidor (Render) roda em UTC
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

const DAY_ALIASES: Record<string, string[]> = {
  sunday: ['sunday', 'domingo'],
  monday: ['monday', 'segunda', 'segunda-feira'],
  tuesday: ['tuesday', 'terça', 'terça-feira', 'terca', 'terca-feira'],
  wednesday: ['wednesday', 'quarta', 'quarta-feira'],
  thursday: ['thursday', 'quinta', 'quinta-feira'],
  friday: ['friday', 'sexta', 'sexta-feira'],
  saturday: ['saturday', 'sábado', 'sabado'],
};

function slotMatchesDay(slotDay: string, dayKey: string): boolean {
  return (DAY_ALIASES[dayKey] || [dayKey]).includes(String(slotDay || '').trim().toLowerCase());
}

async function getActiveTeacherSlots(schoolId: string, teacherId: string, dayKey: string) {
  const pointConfig = await TeacherPontoLink.findOne({ schoolId, isActive: true }).lean() as any;
  const query: any = { $or: [{ school: schoolId }, { userId: schoolId }] };
  if (pointConfig?.activeTimetableId) query.scheduleId = pointConfig.activeTimetableId;

  const timetables = await GeneratedTimetable.find(query).sort({ createdAt: -1 }).lean();
  const activeScheduleId = pointConfig?.activeTimetableId || (timetables[0] as any)?.scheduleId;
  const slots: any[] = [];
  const seen = new Set<string>();
  for (const timetable of timetables as any[]) {
    if (activeScheduleId && String(timetable.scheduleId) !== String(activeScheduleId)) continue;
    for (const slot of timetable.slots || []) {
      const classId = String(timetable.classId || slot.classId || '');
      const key = `${slot.period}-${classId}`;
      if (String(slot.teacherId) !== String(teacherId) || !slotMatchesDay(slot.day, dayKey) || seen.has(key)) continue;
      seen.add(key);
      slots.push({ ...slot, classId });
    }
  }
  return slots.sort((a, b) => a.period - b.period);
}

function minutesBetween(entry?: string, exit?: string): number {
      if (!entry || !exit) return 0;
      const [entryHour, entryMinute] = entry.split(':').map(Number);
      const [exitHour, exitMinute] = exit.split(':').map(Number);
      let difference = exitHour * 60 + exitMinute - (entryHour * 60 + entryMinute);
      if (difference < 0) difference += 24 * 60;
      return difference;
    }

    function clockMinutes(value?: string): number {
      if (!value) return 0;
      const [hours, minutes] = value.split(':').map(Number);
      return hours * 60 + minutes;
    }

    function expectedEmployeeMinutes(workSchedule: any): number {
      if (!workSchedule) return 0;
      if (workSchedule.shiftMode === 'rotating') return (workSchedule.rotatingWorkHours || 0) * 60;
      const shiftType = workSchedule.shiftType || 'single';
      return [
        [workSchedule.entryTime, workSchedule.exitTime],
        [workSchedule.shift2EntryTime, workSchedule.shift2ExitTime],
        [workSchedule.shift3EntryTime, workSchedule.shift3ExitTime],
      ].reduce((total, [entry, exit], index) => {
        if (index === 1 && !['split2', 'split3'].includes(shiftType)) return total;
        if (index === 2 && shiftType !== 'split3') return total;
        return total + minutesBetween(entry, exit);
      }, 0);
    }

    interface EmployeePunchState {
      nextAction: 'entry' | 'exit' | null;
      shiftNumber: 1 | 2 | 3 | null;
      complete: boolean;
      allowedNow: boolean;
      availableAt?: string;
      isExtraDay: boolean;
      message: string;
    }

    function getEmployeePunchState(
      attendance: any,
      workSchedule: any,
      currentTime: string,
      isExtraDay: boolean
    ): EmployeePunchState {
      const shiftType = isExtraDay ? 'single' : (workSchedule.shiftType || 'single');
      let nextAction: 'entry' | 'exit' | null = null;
      let shiftNumber: 1 | 2 | 3 | null = null;
      let availableAt: string | undefined;

      if (!attendance?.entryTime) {
        nextAction = 'entry';
        shiftNumber = 1;
        availableAt = isExtraDay ? undefined : workSchedule.entryTime;
      } else if (!attendance.exitTime) {
        nextAction = 'exit';
        shiftNumber = 1;
      } else if (['split2', 'split3'].includes(shiftType) && !attendance.entryTime2) {
        nextAction = 'entry';
        shiftNumber = 2;
        availableAt = workSchedule.shift2EntryTime;
      } else if (['split2', 'split3'].includes(shiftType) && !attendance.exitTime2) {
        nextAction = 'exit';
        shiftNumber = 2;
      } else if (shiftType === 'split3' && !attendance.entryTime3) {
        nextAction = 'entry';
        shiftNumber = 3;
        availableAt = workSchedule.shift3EntryTime;
      } else if (shiftType === 'split3' && !attendance.exitTime3) {
        nextAction = 'exit';
        shiftNumber = 3;
      }

      if (!nextAction || !shiftNumber) {
        return {
          nextAction: null,
          shiftNumber: null,
          complete: true,
          allowedNow: false,
          isExtraDay,
          message: 'Todos os registros de hoje foram concluídos. Somente a administração pode fazer alterações.',
        };
      }

      const tolerance = workSchedule.toleranceMinutes ?? 10;
      const allowedNow = nextAction === 'exit'
        || !availableAt
        || clockMinutes(currentTime) >= clockMinutes(availableAt) - tolerance;

      return {
        nextAction,
        shiftNumber,
        complete: false,
        allowedNow,
        availableAt,
        isExtraDay,
        message: allowedNow
          ? `${nextAction === 'entry' ? 'Entrada' : 'Saída'} do ${shiftNumber}º turno disponível.`
          : `A ${shiftNumber}ª entrada será liberada às ${availableAt}.`,
      };
    }

    async function isEmployeeExtraDay(
      schoolId: string,
      workSchedule: any,
      date: string,
      dayKey: string
    ): Promise<boolean> {
      if (workSchedule.shiftMode === 'rotating') return false;
      const workDays = workSchedule.workDays?.length
        ? workSchedule.workDays
        : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const schoolDay = await SchoolDay.findOne({
        schoolId,
        date: {
          $gte: new Date(`${date}T00:00:00.000Z`),
          $lte: new Date(`${date}T23:59:59.999Z`),
        },
        dayType: { $in: ['holiday', 'recess'] },
      }).select('_id').lean();
      return !workDays.includes(dayKey) || Boolean(schoolDay);
    }

    async function registerIndividualEmployeePoint(link: any, body: any) {
      const employee = await Employee.findOne({ _id: link.personId, schoolId: link.schoolId })
        .select('name cargo setor workSchedule email')
        .lean() as any;
      if (!employee) {
        return { status: 404, body: { message: 'Funcionário não encontrado.' } };
      }

      const { action, lat, lng, accuracy, photoData, email: providedEmail } = body;
      if (!['entry', 'exit'].includes(action)) {
        return { status: 400, body: { message: 'Ação de ponto inválida.' } };
      }

      const registeredEmail = employee.email?.trim().toLowerCase() || '';
      if (registeredEmail && !providedEmail) {
        return { status: 400, body: { message: 'Confirme o e-mail cadastrado para registrar o ponto.' } };
      }
      if (registeredEmail && providedEmail.trim().toLowerCase() !== registeredEmail) {
        return { status: 403, body: { message: 'E-mail não confere com o cadastro.' } };
      }
      const pointConfig = await SchoolPontoLink.findOne({ schoolId: link.schoolId, isActive: true })
        .select('requirePhoto')
        .lean() as any;
      const photoError = validateAttendancePhoto(photoData, Boolean(pointConfig?.requirePhoto));
      if (photoError) return { status: 400, body: { message: photoError } };

      const locationCheck = await validateAttendanceLocation(link.schoolId, lat, lng, accuracy);
      if (!locationCheck.valid) {
        return {
          status: locationCheck.configured ? 403 : 400,
          body: {
            message: locationCheck.message,
            distance: locationCheck.distanceMeters,
            radius: locationCheck.radiusMeters,
          },
        };
      }

      const today = todayISO();
      const dayKey = todayDayKey();
      const now = nowHHmm();
      const workSchedule = employee.workSchedule || {};
      const shiftType = workSchedule.shiftType || 'single';
      const isRotating = workSchedule.shiftMode === 'rotating';
      const isExtraDay = await isEmployeeExtraDay(link.schoolId, workSchedule, today, dayKey);
      const effectiveShiftType = isExtraDay ? 'single' : shiftType;
      let attendanceDate = today;
      let attendanceDay = dayKey;
      let expectedEntryTime = workSchedule.entryTime || '';
      let expectedExitTime = workSchedule.exitTime || '';

      if (isRotating) {
        if (!workSchedule.rotatingCycleStart || !workSchedule.rotatingEntryTime || !workSchedule.rotatingWorkHours) {
          return { status: 400, body: { message: 'A escala rotativa está incompleta. Procure a administração.' } };
        }
        const current = nowBRT().getTime();
        const cycleStart = Date.parse(`${workSchedule.rotatingCycleStart}T${workSchedule.rotatingEntryTime}:00.000Z`);
        const cycleLength = (workSchedule.rotatingWorkHours + (workSchedule.rotatingRestDays ?? 1) * 24) * 60 * 60 * 1000;
        if (!Number.isFinite(cycleStart) || current < cycleStart) {
          return { status: 400, body: { message: 'O ciclo desta escala ainda não começou.' } };
        }
        const cycleIndex = Math.floor((current - cycleStart) / cycleLength);
        const dutyStart = cycleStart + cycleIndex * cycleLength;
        const dutyEnd = dutyStart + workSchedule.rotatingWorkHours * 60 * 60 * 1000;
        const start = new Date(dutyStart);
        const end = new Date(dutyEnd);
        attendanceDate = start.toISOString().slice(0, 10);
        attendanceDay = DAYS_EN[start.getUTCDay()];
        expectedEntryTime = `${String(start.getUTCHours()).padStart(2, '0')}:${String(start.getUTCMinutes()).padStart(2, '0')}`;
        expectedExitTime = `${String(end.getUTCHours()).padStart(2, '0')}:${String(end.getUTCMinutes()).padStart(2, '0')}`;
      }

      let attendance = await EmployeeAttendance.findOne({
        schoolId: link.schoolId,
        employeeId: link.personId,
        date: attendanceDate,
      });
      if (attendance?.isRejected) {
        return {
          status: 403,
          body: {
            message: 'Este ponto foi recusado pela administração. Procure a central para regularização manual.',
          },
        };
      }
      const created = !attendance;
      const expectedMinutes = isExtraDay ? 0 : expectedEmployeeMinutes(workSchedule);
      const punchState = getEmployeePunchState(attendance, workSchedule, now, isExtraDay);
      if (punchState.complete) {
        return { status: 409, body: { message: punchState.message, punchState } };
      }
      if (action !== punchState.nextAction) {
        return {
          status: 409,
          body: {
            message: `O próximo registro permitido é a ${punchState.nextAction === 'entry' ? 'entrada' : 'saída'} do ${punchState.shiftNumber}º turno.`,
            punchState,
          },
        };
      }
      if (!punchState.allowedNow) {
        return { status: 403, body: { message: punchState.message, punchState } };
      }

      if (!attendance) {
        if (action === 'exit') {
          return { status: 400, body: { message: 'Nenhuma entrada registrada. Registre a entrada primeiro.' } };
        }
        attendance = new EmployeeAttendance({
          schoolId: link.schoolId,
          employeeId: link.personId,
          employeeName: employee.name,
          cargo: employee.cargo || link.cargo || '',
          setor: employee.setor || link.setor || '',
          date: attendanceDate,
          dayOfWeek: attendanceDay,
          shift: isRotating ? 'plantao' : 'integral',
          status: 'partial',
          shiftType: effectiveShiftType,
          expectedEntryTime: isExtraDay ? '' : expectedEntryTime,
          expectedExitTime: isExtraDay ? '' : expectedExitTime,
          expectedEntryTime2: isExtraDay ? '' : workSchedule.shift2EntryTime || '',
          expectedExitTime2: isExtraDay ? '' : workSchedule.shift2ExitTime || '',
          expectedEntryTime3: isExtraDay ? '' : workSchedule.shift3EntryTime || '',
          expectedExitTime3: isExtraDay ? '' : workSchedule.shift3ExitTime || '',
          expectedMinutes,
          deficitMinutes: expectedMinutes,
          markedById: 'self',
          markedByName: employee.name,
          punches: [],
        });
      }

      const record = attendance as any;
      let shiftNumber: 1 | 2 | 3;
      let field: 'entryTime' | 'exitTime' | 'entryTime2' | 'exitTime2' | 'entryTime3' | 'exitTime3';
      if (action === 'entry') {
        if (!record.entryTime) {
          shiftNumber = 1;
          field = 'entryTime';
        } else if (record.exitTime && ['split2', 'split3'].includes(effectiveShiftType) && !record.entryTime2) {
          shiftNumber = 2;
          field = 'entryTime2';
        } else if (record.exitTime2 && effectiveShiftType === 'split3' && !record.entryTime3) {
          shiftNumber = 3;
          field = 'entryTime3';
        } else {
          return { status: 400, body: { message: 'Já existe uma entrada aberta ou todos os turnos foram registrados.' } };
        }
      } else if (record.entryTime3 && !record.exitTime3) {
        shiftNumber = 3;
        field = 'exitTime3';
      } else if (record.entryTime2 && !record.exitTime2) {
        shiftNumber = 2;
        field = 'exitTime2';
      } else if (record.entryTime && !record.exitTime) {
        shiftNumber = 1;
        field = 'exitTime';
      } else {
        return { status: 400, body: { message: 'Nenhuma entrada aberta para registrar a saída.' } };
      }

      if (!Array.isArray(record.punches)) record.punches = [];
      record[field] = now;
      record.punches.push({
        type: action,
        shift: shiftNumber,
        time: now,
        recordedAt: new Date(),
        photoData: photoData || undefined,
        latitude: lat,
        longitude: lng,
        locationValid: locationCheck.valid,
        locationDistanceMeters: locationCheck.distanceMeters,
      });

      const complete = Boolean(
        record.exitTime
        && (effectiveShiftType === 'single' || record.exitTime2)
        && (effectiveShiftType !== 'split3' || record.exitTime3)
      );
      let workedMinutes = minutesBetween(record.entryTime, record.exitTime)
        + minutesBetween(record.entryTime2, record.exitTime2)
        + minutesBetween(record.entryTime3, record.exitTime3);
      if (isRotating && record.entryTime && record.exitTime) {
        const entryPunch = record.punches.find((punch: any) => punch.type === 'entry' && punch.shift === 1);
        const exitPunch = [...record.punches].reverse().find((punch: any) => punch.type === 'exit' && punch.shift === 1);
        if (entryPunch?.recordedAt && exitPunch?.recordedAt) {
          workedMinutes = Math.max(0, Math.round(
            (new Date(exitPunch.recordedAt).getTime() - new Date(entryPunch.recordedAt).getTime()) / 60000
          ));
        }
      }

      const tolerance = workSchedule.toleranceMinutes ?? 10;
      record.workedMinutes = workedMinutes;
      record.expectedMinutes = expectedMinutes;
      record.deficitMinutes = Math.max(0, expectedMinutes - workedMinutes);
      record.overtimeMinutes = Math.max(0, workedMinutes - expectedMinutes);
      record.lateArrivalMinutes = !isExtraDay && record.entryTime && expectedEntryTime
        ? Math.max(0, clockMinutes(record.entryTime) - clockMinutes(expectedEntryTime) - tolerance)
        : 0;
      const finalExpectedExit = effectiveShiftType === 'split3'
        ? workSchedule.shift3ExitTime
        : effectiveShiftType === 'split2'
          ? workSchedule.shift2ExitTime
          : expectedExitTime;
      const finalExit = effectiveShiftType === 'split3' ? record.exitTime3 : effectiveShiftType === 'split2' ? record.exitTime2 : record.exitTime;
      record.earlyDepartureMinutes = !isExtraDay && complete && finalExit && finalExpectedExit
        ? Math.max(0, clockMinutes(finalExpectedExit) - clockMinutes(finalExit))
        : 0;
      record.status = complete ? (isExtraDay ? 'overtime_only' : 'present') : 'partial';
      record.photoData = photoData || record.photoData;
      record.latitude = lat;
      record.longitude = lng;
      record.locationValid = locationCheck.valid;
      record.locationDistanceMeters = locationCheck.distanceMeters;

      await attendance.save();
      const nextPunchState = getEmployeePunchState(record, workSchedule, now, isExtraDay);
      return {
        status: created ? 201 : 200,
        body: {
          message: `${action === 'entry' ? 'Entrada' : 'Saída'} do ${shiftNumber}º turno registrada com sucesso.`,
          attendance,
          action,
          shift: shiftNumber,
          workedMinutes,
          expectedMinutes,
          deficitMinutes: record.deficitMinutes,
          overtimeMinutes: record.overtimeMinutes,
          complete,
          punchState: nextPunchState,
        },
      };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROTAS ADMIN (requerem autenticação)
// ─────────────────────────────────────────────────────────────────────────────

async function issueDeviceEnrollment(link: any) {
  const activationToken = createDeviceSecret();
  const enrollmentExpiresAt = new Date(Date.now() + DEVICE_ENROLLMENT_MINUTES * 60 * 1000);
  await AttendanceLink.updateOne(
    { _id: link._id, isActive: true },
    {
      $set: {
        enrollmentTokenHash: hashDeviceValue(activationToken),
        enrollmentExpiresAt,
      },
    }
  );
  return { activationToken, enrollmentExpiresAt };
}

// POST / — criar link de ponto para um professor ou funcionário
router.post('/', auth, schoolAdminOnly, async (req: AuthRequest, res) => {
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
      const enrollment = existing.deviceBoundAt ? {} : await issueDeviceEnrollment(existing);
      return res.status(200).json({
        ...existing.toObject(),
        ...enrollment,
        deviceRegistered: Boolean(existing.deviceBoundAt),
        alreadyExisted: true,
      });
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

    try {
      await link.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        const concurrentLink = await AttendanceLink.findOne({
          schoolId,
          personType,
          personId,
          isActive: true,
        });
        if (concurrentLink) {
          const enrollment = concurrentLink.deviceBoundAt ? {} : await issueDeviceEnrollment(concurrentLink);
          return res.status(200).json({
            ...concurrentLink.toObject(),
            ...enrollment,
            deviceRegistered: Boolean(concurrentLink.deviceBoundAt),
            alreadyExisted: true,
          });
        }
      }
      throw error;
    }
    const enrollment = await issueDeviceEnrollment(link);
    res.status(201).json({
      ...link.toObject(),
      ...enrollment,
      deviceRegistered: false,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET / — listar todos os links da escola
router.get('/', auth, schoolAdminOnly, async (req: AuthRequest, res) => {
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
router.post('/:id/device-reset', auth, schoolAdminOnly, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const link = await AttendanceLink.findOneAndUpdate(
      { _id: req.params.id, schoolId, isActive: true },
      {
        $unset: {
          deviceSecretHash: 1,
          deviceBoundAt: 1,
          deviceLastSeenAt: 1,
          enrollmentTokenHash: 1,
          enrollmentExpiresAt: 1,
        },
        $inc: { deviceVersion: 1 },
        $set: {
          deviceRevokedAt: new Date(),
          deviceResetAt: new Date(),
          deviceResetBy: req.user!.id,
        },
      },
      { new: true }
    );
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });
    const enrollment = await issueDeviceEnrollment(link);
    return res.json({
      message: 'Dispositivo anterior revogado. Envie o novo link de ativação ao titular.',
      ...enrollment,
      deviceRegistered: false,
      token: link.token,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, schoolAdminOnly, async (req: AuthRequest, res) => {
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

router.post('/public/:token/device/bind', async (req, res) => {
  try {
    const activationToken = String(req.body?.activationToken || '').trim();
    const link = await AttendanceLink.findOne({ token: req.params.token, isActive: true })
      .select('+deviceSecretHash +enrollmentTokenHash enrollmentExpiresAt deviceVersion');
    if (!link) return res.status(404).json({ message: 'Link não encontrado ou inativo.' });
    if ((link as any).deviceSecretHash) {
      return res.status(409).json({
        code: 'DEVICE_ALREADY_REGISTERED',
        message: 'Este ponto já possui um dispositivo cadastrado. Solicite a redefinição à administração.',
      });
    }
    if (!(link as any).enrollmentTokenHash
      || !link.enrollmentExpiresAt
      || link.enrollmentExpiresAt.getTime() <= Date.now()) {
      return res.status(410).json({
        code: 'DEVICE_BINDING_EXPIRED',
        message: 'O link de ativação expirou. Solicite um novo link à administração.',
      });
    }
    if (!compareEnrollmentToken(activationToken, (link as any).enrollmentTokenHash)) {
      return res.status(403).json({
        code: 'DEVICE_BINDING_INVALID',
        message: 'Código de ativação inválido.',
      });
    }

    const deviceSecret = createDeviceSecret();
    const result = await AttendanceLink.updateOne(
      {
        _id: link._id,
        isActive: true,
        deviceSecretHash: { $exists: false },
        enrollmentTokenHash: (link as any).enrollmentTokenHash,
        deviceVersion: link.deviceVersion,
      },
      {
        $set: {
          deviceSecretHash: hashDeviceValue(deviceSecret),
          deviceBoundAt: new Date(),
          deviceLastSeenAt: new Date(),
        },
        $unset: {
          enrollmentTokenHash: 1,
          enrollmentExpiresAt: 1,
          deviceRevokedAt: 1,
        },
      }
    );
    if (result.modifiedCount !== 1) {
      return res.status(409).json({
        code: 'DEVICE_ALREADY_REGISTERED',
        message: 'Outro dispositivo concluiu o cadastro. Solicite ajuda à administração.',
      });
    }
    return res.status(201).json({
      message: 'Dispositivo cadastrado com sucesso.',
      deviceSecret,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /public/:token — identifica a pessoa e retorna a situação de hoje
router.get('/public/:token', async (req, res) => {
  try {
    const link = await AttendanceLink.findOne({ token: req.params.token });
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });
    if (!link.isActive) return res.status(410).json({ message: 'Este link foi desativado.' });
    const deviceCheck = await verifyAttendanceDevice(req, String(link._id));
    if (!deviceCheck.valid) {
      return res.status(deviceCheck.code === 'DEVICE_NOT_REGISTERED' ? 428 : 403).json(deviceCheck);
    }
    if (link.personType === 'teacher') {
      return res.status(410).json({
        message: 'Use o ponto individual do professor, que registra entrada na escola e presença por aula.',
      });
    }

    const today = todayISO();
    const dayKey = todayDayKey();
    const dayLabel = DAYS_PT[dayKey] || dayKey;

    const baseInfo = {
      schoolName: link.schoolName,
      personType: link.personType,
      personName: link.personName,
      cargo: link.cargo,
      setor: link.setor,
      today,
      dayLabel,
    };

    // ── FUNCIONÁRIO ────────────────────────────────────────────────────────
    const employee = await Employee.findOne({ _id: link.personId, schoolId: link.schoolId })
      .select('jornadaTrabalho cargaHorariaSemanal setor cargo workSchedule email')
      .lean();

    const ws = (employee as any)?.workSchedule;
    const attendanceFilter: any = {
      schoolId: link.schoolId,
      employeeId: link.personId,
      date: today,
    };
    if (ws?.shiftMode === 'rotating') {
      delete attendanceFilter.date;
      attendanceFilter.$or = [
        { date: today },
        { status: 'partial' },
      ];
    }
    const attendance = await EmployeeAttendance.findOne(attendanceFilter)
      .sort({ date: -1 })
      .lean();
    const isExtraDay = await isEmployeeExtraDay(link.schoolId, ws || {}, today, dayKey);
    const punchState = getEmployeePunchState(attendance, ws || {}, nowHHmm(), isExtraDay);
    return res.json({
      ...baseInfo,
      requiresEmail: Boolean((employee as any)?.email),
      jornadaTrabalho: (employee as any)?.jornadaTrabalho || '',
      workSchedule: ws ? {
        shiftMode: ws.shiftMode || 'fixed',
        shiftType: ws.shiftType || 'single',
        entryTime: ws.entryTime,
        exitTime: ws.exitTime,
        shift2EntryTime: ws.shift2EntryTime,
        shift2ExitTime: ws.shift2ExitTime,
        shift3EntryTime: ws.shift3EntryTime,
        shift3ExitTime: ws.shift3ExitTime,
        rotatingEntryTime: ws.rotatingEntryTime,
        workDays: ws.workDays,
        toleranceMinutes: ws.toleranceMinutes ?? 10,
      } : null,
      attendance: attendance || null,
      punchState,
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
    const deviceCheck = await verifyAttendanceDevice(req, String(link._id));
    if (!deviceCheck.valid) {
      return res.status(deviceCheck.code === 'DEVICE_NOT_REGISTERED' ? 428 : 403).json(deviceCheck);
    }
    if (link.personType === 'teacher') {
      return res.status(410).json({
        message: 'A confirmação geral foi desativada. Registre a presença individualmente em cada aula.',
      });
    }

    const result = await registerIndividualEmployeePoint(link, req.body);
    return res.status(result.status).json(result.body);

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LINK GERAL DA ESCOLA (um único link para todos)
// ─────────────────────────────────────────────────────────────────────────────

// POST /school-link — criar ou retornar link geral da escola
router.post('/school-link', auth, schoolAdminOnly, async (req: AuthRequest, res) => {
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

router.use('/school-public/:token', (_req, res) => {
  return res.status(410).json({
    message: 'O link geral foi desativado por segurança. Solicite seu link individual de ponto.',
  });
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

      const teacherSlots = await getActiveTeacherSlots(link.schoolId, personId, dayKey);

      const subjectIds = [...new Set(teacherSlots.map((s: any) => s.subjectId))];
      const classIds   = [...new Set(teacherSlots.map((s: any) => s.classId))];
      const [subjects, classes] = await Promise.all([
        Subject.find({ _id: { $in: subjectIds } }).select('_id name').lean(),
        Class.find({ _id: { $in: classIds } }).select('_id name grade').lean(),
      ]);
      const subjectMap = Object.fromEntries(subjects.map((s: any) => [String(s._id), s.name]));
      const classMap   = Object.fromEntries(classes.map((c: any) => [String(c._id), `${c.name}${c.grade ? ' – ' + c.grade : ''}`]));

      const attendance = await TeacherAttendance.findOne({
        schoolId: link.schoolId,
        teacherId: personId,
        date: today,
      }).lean() as any;
      const attendanceByClass = new Map(
        (attendance?.classes || []).map((item: any) => [`${item.period}-${item.classId}`, item])
      );

      const schedule = teacherSlots.map((s: any) => {
        const recorded = attendanceByClass.get(`${s.period}-${s.classId}`) as any;
        return {
          period: s.period,
          subjectId: s.subjectId,
          classId: s.classId,
          startTime: s.startTime || '',
          endTime: s.endTime || '',
          subjectName: subjectMap[s.subjectId] || s.subjectId,
          className: classMap[s.classId] || s.classId,
          status: recorded?.status || 'pending',
          entryTime: recorded?.entryTime,
        };
      });

      return res.json({
        schoolName: link.schoolName,
        personType: 'teacher',
        personName: (teacher as any).name,
        requiresEmail: !!((teacher as any).email),
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

    const ws = (employee as any).workSchedule;
    let employeeAttendanceDate = today;
    if (ws?.shiftMode === 'rotating' && ws.rotatingCycleStart && ws.rotatingEntryTime && ws.rotatingWorkHours) {
      const currentBrt = nowBRT().getTime();
      const cycleStart = Date.parse(`${ws.rotatingCycleStart}T${ws.rotatingEntryTime}:00.000Z`);
      const cycleLength = (ws.rotatingWorkHours + (ws.rotatingRestDays ?? 1) * 24) * 60 * 60 * 1000;
      if (Number.isFinite(cycleStart) && currentBrt >= cycleStart) {
        const cycleIndex = Math.floor((currentBrt - cycleStart) / cycleLength);
        employeeAttendanceDate = new Date(cycleStart + cycleIndex * cycleLength).toISOString().slice(0, 10);
      }
    }
    const attendance = await EmployeeAttendance.findOne({
      schoolId: link.schoolId,
      employeeId: personId,
      date: employeeAttendanceDate,
    }).lean();

    return res.json({
      schoolName: link.schoolName,
      personType: 'employee',
      personName: (employee as any).name,
      cargo: (employee as any).cargo || '',
      setor: (employee as any).setor || '',
      jornadaTrabalho: (employee as any).jornadaTrabalho || '',
      workSchedule: ws ? {
        shiftMode: ws.shiftMode || 'fixed',
        shiftType: ws.shiftType || 'single',
        entryTime: ws.entryTime,
        exitTime: ws.exitTime,
        shift2EntryTime: ws.shift2EntryTime,
        shift2ExitTime: ws.shift2ExitTime,
        shift3EntryTime: ws.shift3EntryTime,
        shift3ExitTime: ws.shift3ExitTime,
        rotatingWorkHours: ws.rotatingWorkHours,
        rotatingRestDays: ws.rotatingRestDays,
        rotatingEntryTime: ws.rotatingEntryTime,
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
      const teacher = await Teacher.findOne({ _id: personId, schoolId: link.schoolId })
        .select('name email').lean() as any;
      if (!teacher) return res.status(404).json({ message: 'Professor não encontrado.' });

      const { lat, lng, photoData, email: providedEmail } = req.body;
      const registeredEmail = teacher.email?.trim().toLowerCase() || '';
      if (registeredEmail && !providedEmail) {
        return res.status(400).json({ message: 'Este professor requer confirmação por e-mail.' });
      }
      if (registeredEmail && providedEmail.trim().toLowerCase() !== registeredEmail) {
        return res.status(403).json({ message: 'E-mail não confere com o cadastro. Verifique e tente novamente.' });
      }

      let locationValid: boolean | undefined;
      if (link.requireGeolocation) {
        if (lat == null || lng == null) {
          return res.status(400).json({ message: 'Geolocalização obrigatória. Permita o acesso à localização.' });
        }
        locationValid = true;
        if (link.latitude != null && link.longitude != null) {
          const R = 6371000;
          const toRad = (d: number) => d * Math.PI / 180;
          const dLat = toRad(lat - link.latitude);
          const dLon = toRad(lng - link.longitude);
          const a = Math.sin(dLat / 2) ** 2
            + Math.cos(toRad(link.latitude)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
          const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const radius = Math.sqrt((link.areaM2 || 1000) / Math.PI);
          if (distance > radius) {
            return res.status(403).json({
              message: `Fora da área permitida (${Math.round(distance)}m de distância, máximo ${Math.round(radius)}m).`,
            });
          }
        }
      }
      if (link.requirePhoto && !photoData) {
        return res.status(400).json({ message: 'Foto obrigatória para confirmar o ponto.' });
      }

      const period = Number(req.body.period);
      const requestedClassId = String(req.body.classId || '');
      if (!Number.isInteger(period) || period <= 0) {
        return res.status(400).json({ message: 'Selecione a aula que está sendo confirmada.' });
      }

      const teacherSlots = await getActiveTeacherSlots(link.schoolId, personId, dayKey);

      if (teacherSlots.length === 0) {
        return res.status(400).json({ message: 'Nenhuma aula programada para hoje.' });
      }
      const selectedSlot = teacherSlots.find((slot: any) =>
        slot.period === period && (!requestedClassId || String(slot.classId) === requestedClassId)
      );
      if (!selectedSlot) {
        return res.status(404).json({ message: 'Esta aula não pertence ao horário vigente do professor.' });
      }

      const subjectIds = [...new Set(teacherSlots.map((s: any) => s.subjectId))];
      const classIds   = [...new Set(teacherSlots.map((s: any) => s.classId))];
      const [subjects, classes] = await Promise.all([
        Subject.find({ _id: { $in: subjectIds } }).select('_id name').lean(),
        Class.find({ _id: { $in: classIds } }).select('_id name grade').lean(),
      ]);
      const subjectMap = Object.fromEntries(subjects.map((s: any) => [String(s._id), s.name]));
      const classMap   = Object.fromEntries(classes.map((c: any) => [String(c._id), `${c.name}${c.grade ? ' – ' + c.grade : ''}`]));

      const teacherName = teacher.name || '';

      const classesArr = teacherSlots.map((s: any) => ({
          period: s.period,
          startTime: s.startTime || '',
          endTime: s.endTime || '',
          subjectId: s.subjectId,
          subjectName: subjectMap[s.subjectId] || s.subjectId,
          classId: s.classId,
          className: classMap[s.classId] || s.classId,
          grade: (classes.find((c: any) => String(c._id) === s.classId) as any)?.grade || '',
          status: 'pending',
        }));

      let attendance = await TeacherAttendance.findOne({ schoolId: link.schoolId, teacherId: personId, date: today });
      if (!attendance) {
        attendance = new TeacherAttendance({
          teacherId: personId,
          teacherName,
          schoolId: link.schoolId,
          date: today,
          dayOfWeek: dayKey,
          classes: classesArr,
          schoolYear: Number(today.slice(0, 4)),
        });
      }

      let classRecord = (attendance as any).classes.find((item: any) =>
        item.period === period && String(item.classId) === String(selectedSlot.classId)
      );
      if (!classRecord) {
        const generatedClass = classesArr.find((item: any) =>
          item.period === period && String(item.classId) === String(selectedSlot.classId)
        );
        (attendance as any).classes.push(generatedClass);
        classRecord = (attendance as any).classes[(attendance as any).classes.length - 1];
      }
      if (classRecord.status === 'present' || classRecord.entryTime) {
        return res.json({
          message: `Aula do período ${period} já confirmada.`,
          attendance,
          alreadyMarked: true,
        });
      }

      classRecord.status = 'present';
      classRecord.markedAt = new Date();
      classRecord.entryTime = now;
      classRecord.locationValid = locationValid;
      if (photoData) classRecord.photoData = photoData;
      await attendance.save();
      return res.status(201).json({
        message: `Aula do período ${period} confirmada às ${now}.`,
        attendance,
        action: 'class-confirmation',
        period,
      });
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

    const shiftType = ws?.shiftType || 'single';
    const isRotating = ws?.shiftMode === 'rotating';
    let attendanceDate = today;
    let attendanceDay = dayKey;
    let expectedEntryTime = ws?.entryTime || '';
    let expectedExitTime = ws?.exitTime || '';
    let rotatingDutyEnded = false;

    if (isRotating) {
      if (!ws?.rotatingCycleStart || !ws?.rotatingEntryTime || !ws?.rotatingWorkHours) {
        return res.status(400).json({ message: 'A escala rotativa está incompleta. Procure a administração.' });
      }
      const currentBrt = nowBRT().getTime();
      const cycleStart = Date.parse(`${ws.rotatingCycleStart}T${ws.rotatingEntryTime}:00.000Z`);
      const cycleLength = (ws.rotatingWorkHours + (ws.rotatingRestDays ?? 1) * 24) * 60 * 60 * 1000;
      if (!Number.isFinite(cycleStart) || currentBrt < cycleStart) {
        return res.status(400).json({ message: 'O ciclo desta escala ainda não começou.' });
      }
      const cycleIndex = Math.floor((currentBrt - cycleStart) / cycleLength);
      const dutyStart = cycleStart + cycleIndex * cycleLength;
      const dutyEnd = dutyStart + ws.rotatingWorkHours * 60 * 60 * 1000;
      const start = new Date(dutyStart);
      const end = new Date(dutyEnd);
      attendanceDate = start.toISOString().slice(0, 10);
      attendanceDay = DAYS_EN[start.getUTCDay()];
      expectedEntryTime = `${String(start.getUTCHours()).padStart(2, '0')}:${String(start.getUTCMinutes()).padStart(2, '0')}`;
      expectedExitTime = `${String(end.getUTCHours()).padStart(2, '0')}:${String(end.getUTCMinutes()).padStart(2, '0')}`;
      rotatingDutyEnded = currentBrt > dutyEnd;
    }

    const existing = await EmployeeAttendance.findOne({
      schoolId: link.schoolId,
      employeeId: personId,
      date: attendanceDate,
    });
    if (isRotating && rotatingDutyEnded && !existing) {
      return res.status(400).json({ message: 'O plantão atual já terminou e não possui entrada registrada.' });
    }

    const expectedMinutes = isRotating
      ? ws.rotatingWorkHours * 60
      : [
          [ws?.entryTime, ws?.exitTime],
          [ws?.shift2EntryTime, ws?.shift2ExitTime],
          [ws?.shift3EntryTime, ws?.shift3ExitTime],
        ].reduce((total, [entry, exit], index) => {
          if (index === 1 && !['split2', 'split3'].includes(shiftType)) return total;
          if (index === 2 && shiftType !== 'split3') return total;
          return entry && exit ? total + Math.max(0, toMin3(exit) - toMin3(entry)) : total;
        }, 0);

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
        date: attendanceDate,
        dayOfWeek: attendanceDay,
        shift: isRotating ? 'plantao' : 'integral',
        status: 'partial',
        entryTime: now,
        expectedEntryTime,
        expectedExitTime,
        expectedEntryTime2: ws?.shift2EntryTime || '',
        expectedExitTime2: ws?.shift2ExitTime || '',
        expectedEntryTime3: ws?.shift3EntryTime || '',
        expectedExitTime3: ws?.shift3ExitTime || '',
        shiftType,
        expectedMinutes,
        deficitMinutes: expectedMinutes,
        lateArrivalMinutes: lateArr,
        markedById: 'self',
        markedByName: (employee as any).name,
        photoData: photoData || undefined,
        latitude: lat != null ? lat : undefined,
        longitude: lng != null ? lng : undefined,
        locationValid: lat != null ? true : undefined,
        punches: [{
          type: 'entry',
          shift: 1,
          time: now,
          recordedAt: new Date(),
          photoData: photoData || undefined,
          latitude: lat,
          longitude: lng,
          locationValid: lat != null ? true : undefined,
        }],
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

    const punches = (existing as any).punches || [];
    let punchType: 'entry' | 'exit';
    let shiftNumber: 1 | 2 | 3;
    let targetField: 'entryTime' | 'exitTime' | 'entryTime2' | 'exitTime2' | 'entryTime3' | 'exitTime3';

    if (!(existing as any).entryTime) {
      if (action === 'exit') {
        return res.status(400).json({ message: 'Nenhuma entrada registrada hoje. Registre a entrada primeiro.' });
      }
      punchType = 'entry'; shiftNumber = 1; targetField = 'entryTime';
    } else if (!(existing as any).exitTime) {
      punchType = 'exit'; shiftNumber = 1; targetField = 'exitTime';
    } else if (['split2', 'split3'].includes(shiftType) && !(existing as any).entryTime2) {
      punchType = 'entry'; shiftNumber = 2; targetField = 'entryTime2';
    } else if (['split2', 'split3'].includes(shiftType) && !(existing as any).exitTime2) {
      punchType = 'exit'; shiftNumber = 2; targetField = 'exitTime2';
    } else if (shiftType === 'split3' && !(existing as any).entryTime3) {
      punchType = 'entry'; shiftNumber = 3; targetField = 'entryTime3';
    } else if (shiftType === 'split3' && !(existing as any).exitTime3) {
      punchType = 'exit'; shiftNumber = 3; targetField = 'exitTime3';
    } else {
      return res.json({ message: 'Todas as entradas e saídas da escala já foram registradas.', attendance: existing, alreadyMarked: true });
    }

    (existing as any)[targetField] = now;
    punches.push({
      type: punchType,
      shift: shiftNumber,
      time: now,
      recordedAt: new Date(),
      photoData: photoData || undefined,
      latitude: lat,
      longitude: lng,
      locationValid: lat != null ? true : undefined,
    });
    (existing as any).punches = punches;

    const worked = isRotating
      ? punches.reduce((total: number, punch: any, index: number) => {
          if (punch.type !== 'exit') return total;
          const entry = [...punches].slice(0, index).reverse().find((item: any) =>
            item.type === 'entry' && item.shift === punch.shift
          );
          return entry ? total + Math.max(0, Math.round(
            (new Date(punch.recordedAt).getTime() - new Date(entry.recordedAt).getTime()) / 60000
          )) : total;
        }, 0)
      : [
          [(existing as any).entryTime, (existing as any).exitTime],
          [(existing as any).entryTime2, (existing as any).exitTime2],
          [(existing as any).entryTime3, (existing as any).exitTime3],
        ].reduce((total, [entry, exit]) =>
          entry && exit ? total + Math.max(0, toMin3(exit) - toMin3(entry)) : total, 0);
    const isComplete = Boolean(
      (existing as any).exitTime
      && (shiftType === 'single' || (existing as any).exitTime2)
      && (shiftType !== 'split3' || (existing as any).exitTime3)
    );
    (existing as any).workedMinutes = worked;
    (existing as any).expectedMinutes = expectedMinutes;
    (existing as any).deficitMinutes = Math.max(0, expectedMinutes - worked);
    (existing as any).overtimeMinutes = Math.max(0, worked - expectedMinutes);
    (existing as any).status = isComplete ? 'present' : 'partial';
    if (photoData) (existing as any).photoData = photoData;
    if (lat != null) { (existing as any).latitude = lat; (existing as any).locationValid = true; }
    if (lng != null) (existing as any).longitude = lng;

    const lastExpectedExit = shiftType === 'split3' ? ws?.shift3ExitTime
      : shiftType === 'split2' ? ws?.shift2ExitTime
      : ws?.exitTime;
    if (isComplete && lastExpectedExit) {
      (existing as any).earlyDepartureMinutes = Math.max(0, toMin3(lastExpectedExit) - toMin3(now));
    }
    await existing.save();
    if (registeredEmail) {
      const school = await User.findById(link.schoolId).select('name').lean();
      sendPontoNotificationEmail({
        personName: (employee as any).name,
        personEmail: registeredEmail,
        schoolName: (school as any)?.name || 'Escola',
        action: punchType,
        time: now,
        date: new Date().toLocaleDateString('pt-BR'),
        earlyDepartureMinutes: punchType === 'exit' ? (existing as any).earlyDepartureMinutes : undefined,
      }).catch(() => {});
    }
    const label = punchType === 'entry' ? 'Entrada' : 'Saída';
    return res.json({
      message: `${label} do ${shiftNumber}º turno registrada às ${now}.`,
      attendance: existing,
      action: punchType,
      shift: shiftNumber,
      complete: isComplete,
    });

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /school-link/settings — atualizar configurações de geolocalização e foto
router.put('/school-link/settings', auth, schoolAdminOnly, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { requireGeolocation, latitude, longitude, areaM2, requirePhoto, graceMinutes } = req.body;
    const link = await SchoolPontoLink.findOne({ schoolId, isActive: true });
    if (!link) return res.status(404).json({ message: 'Link geral não encontrado.' });
    const parsedLatitude = latitude === '' || latitude == null ? Number.NaN : Number(latitude);
    const parsedLongitude = longitude === '' || longitude == null ? Number.NaN : Number(longitude);
    const parsedAreaM2 = Number(areaM2);
    if (requireGeolocation && (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude))) {
      return res.status(400).json({ message: 'Capture ou informe as coordenadas do local de trabalho.' });
    }
    if ((Number.isFinite(parsedLatitude) && (parsedLatitude < -90 || parsedLatitude > 90))
      || (Number.isFinite(parsedLongitude) && (parsedLongitude < -180 || parsedLongitude > 180))) {
      return res.status(400).json({ message: 'Coordenadas geográficas inválidas.' });
    }
    if (!Number.isFinite(parsedAreaM2) || parsedAreaM2 < 100) {
      return res.status(400).json({ message: 'A área permitida deve ser de pelo menos 100m².' });
    }
    if (requirePhoto !== undefined) link.requirePhoto = requirePhoto;
    if (graceMinutes !== undefined) link.graceMinutes = graceMinutes;
    await link.save();
    const radiusMeters = Math.min(5000, Math.max(10, Math.sqrt(parsedAreaM2 / Math.PI)));
    await User.findByIdAndUpdate(schoolId, {
      attendanceLocation: {
        required: !!requireGeolocation,
        latitude: Number.isFinite(parsedLatitude) ? parsedLatitude : undefined,
        longitude: Number.isFinite(parsedLongitude) ? parsedLongitude : undefined,
        radiusMeters,
      },
    });
    res.json({
      ...link.toObject(),
      requireGeolocation: !!requireGeolocation,
      latitude: Number.isFinite(parsedLatitude) ? parsedLatitude : undefined,
      longitude: Number.isFinite(parsedLongitude) ? parsedLongitude : undefined,
      areaM2: Math.PI * radiusMeters ** 2,
      radiusMeters,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /school-link — retornar link ativo da escola (com configurações)
router.get('/school-link', auth, schoolAdminOnly, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const link = await SchoolPontoLink.findOne({ schoolId, isActive: true });
    if (!link) return res.status(404).json({ message: 'Nenhum link encontrado.' });
    const location = await getAttendanceLocation(schoolId);
    res.json({
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

export default router;
