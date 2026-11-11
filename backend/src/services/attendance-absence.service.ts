import Employee from '../models/Employee';
import EmployeeAttendance from '../models/EmployeeAttendance';
import Teacher from '../models/Teacher';
import TeacherAttendance from '../models/TeacherAttendance';
import TeacherPontoLink from '../models/TeacherPontoLink';
import SchoolPontoLink from '../models/SchoolPontoLink';
import GeneratedTimetable from '../models/GeneratedTimetable';
import Schedule from '../models/Schedule';
import Subject from '../models/Subject';
import Class from '../models/Class';
import SchoolDay from '../models/SchoolDay';

const DAYS_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAYS_PT: Record<string, string> = {
  sunday: 'Domingo',
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
};

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

// Quantos dias anteriores reprocessar além de hoje. Garante que as faltas sejam
// geradas mesmo que o servidor fique fora do ar no fim do dia (hibernação,
// reinício ou deploy). Os registros já existentes nunca são alterados.
const RETRO_DAYS = 3;
// Valor acima de qualquer fim de expediente/aula + tolerância: em dias passados
// todas as janelas já venceram.
const PAST_DAY_MINUTES = 48 * 60;

// schoolId -> (data ISO -> dayType) apenas para feriados e recessos
type ClosedDays = Map<string, Map<string, string>>;

function brtNow(now = new Date()): Date {
  return new Date(now.getTime() - 3 * 60 * 60 * 1000);
}

function timeToMinutes(value?: string): number {
  if (!value) return 0;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function dateContextAt(offsetDays: number, now = new Date()) {
  const brt = new Date(brtNow(now).getTime() - offsetDays * 24 * 60 * 60 * 1000);
  return {
    date: brt.toISOString().slice(0, 10),
    dayKey: DAYS_EN[brt.getUTCDay()],
    currentMinutes: offsetDays === 0
      ? brt.getUTCHours() * 60 + brt.getUTCMinutes()
      : PAST_DAY_MINUTES,
  };
}

async function loadClosedDays(now = new Date()): Promise<ClosedDays> {
  const newest = dateContextAt(0, now).date;
  const oldest = dateContextAt(RETRO_DAYS, now).date;
  const records = await SchoolDay.find({
    date: {
      $gte: new Date(`${oldest}T00:00:00.000Z`),
      $lte: new Date(`${newest}T23:59:59.999Z`),
    },
    dayType: { $in: ['holiday', 'recess'] },
  }).select('schoolId date dayType').lean() as any[];

  const closed: ClosedDays = new Map();
  for (const record of records) {
    const schoolId = String(record.schoolId);
    const date = new Date(record.date).toISOString().slice(0, 10);
    if (!closed.has(schoolId)) closed.set(schoolId, new Map());
    closed.get(schoolId)!.set(date, record.dayType);
  }
  return closed;
}

async function effectiveDayKey(schoolId: string, date: string, dayKey: string): Promise<string> {
  if (dayKey !== 'saturday') return dayKey;

  const schoolDay = await SchoolDay.findOne({
    schoolId,
    date: {
      $gte: new Date(`${date}T00:00:00.000Z`),
      $lte: new Date(`${date}T23:59:59.999Z`),
    },
    dayType: 'saturday',
    followWeekday: { $exists: true, $ne: '' },
  }).lean() as any;

  return schoolDay?.followWeekday || dayKey;
}

async function upsertEmployeeAbsence(
  employee: any,
  schedule: any,
  data: {
    date: string;
    dayKey: string;
    shift: string;
    expectedEntryTime?: string;
    expectedExitTime?: string;
    expectedMinutes: number;
  }
): Promise<boolean> {
  const result = await EmployeeAttendance.updateOne(
    { schoolId: employee.schoolId, employeeId: String(employee._id), date: data.date },
    {
      $setOnInsert: {
        schoolId: employee.schoolId,
        employeeId: String(employee._id),
        employeeName: employee.name,
        cargo: employee.cargo || '',
        setor: employee.setor || '',
        date: data.date,
        dayOfWeek: data.dayKey,
        shift: data.shift,
        status: 'absent',
        expectedEntryTime: data.expectedEntryTime,
        expectedExitTime: data.expectedExitTime,
        expectedEntryTime2: schedule.shift2EntryTime,
        expectedExitTime2: schedule.shift2ExitTime,
        expectedEntryTime3: schedule.shift3EntryTime,
        expectedExitTime3: schedule.shift3ExitTime,
        shiftType: schedule.shiftType || 'single',
        workedMinutes: 0,
        expectedMinutes: data.expectedMinutes,
        deficitMinutes: data.expectedMinutes,
        markedById: 'system',
        markedByName: 'Fechamento automático',
        observations: 'Falta gerada automaticamente por ausência de registro de ponto.',
      },
    },
    { upsert: true }
  );
  return result.upsertedCount > 0;
}

// Plantões rotativos: percorre todos os plantões encerrados dentro da janela
// retroativa (a escala vale inclusive em feriados).
async function closeRotatingAbsences(
  employee: any,
  schedule: any,
  tolerance: number,
  now: Date
): Promise<number> {
  if (!schedule.rotatingCycleStart || !schedule.rotatingWorkHours || !schedule.rotatingEntryTime) return 0;
  const shiftedNow = brtNow(now).getTime();
  const cycleStart = Date.parse(`${schedule.rotatingCycleStart}T${schedule.rotatingEntryTime}:00.000Z`);
  const cycleLength = (schedule.rotatingWorkHours + (schedule.rotatingRestDays ?? 1) * 24) * 60 * 60 * 1000;
  if (!Number.isFinite(cycleStart) || shiftedNow < cycleStart) return 0;

  const windowStart = shiftedNow - (RETRO_DAYS + 1) * 24 * 60 * 60 * 1000;
  const lastIndex = Math.floor((shiftedNow - cycleStart) / cycleLength);
  let created = 0;

  for (let index = lastIndex; index >= 0; index--) {
    const dutyStart = cycleStart + index * cycleLength;
    if (dutyStart < windowStart) break;
    const dutyEnd = dutyStart + schedule.rotatingWorkHours * 60 * 60 * 1000;
    if (shiftedNow <= dutyEnd + tolerance * 60 * 1000) continue; // plantão ainda aberto

    const startDate = new Date(dutyStart);
    const endDate = new Date(dutyEnd);
    const created_ = await upsertEmployeeAbsence(employee, schedule, {
      date: startDate.toISOString().slice(0, 10),
      dayKey: DAYS_EN[startDate.getUTCDay()],
      shift: 'plantao',
      expectedEntryTime: `${String(startDate.getUTCHours()).padStart(2, '0')}:${String(startDate.getUTCMinutes()).padStart(2, '0')}`,
      expectedExitTime: `${String(endDate.getUTCHours()).padStart(2, '0')}:${String(endDate.getUTCMinutes()).padStart(2, '0')}`,
      expectedMinutes: schedule.rotatingWorkHours * 60,
    });
    if (created_) created++;
  }
  return created;
}

async function closeEmployeeAbsences(closedDays: ClosedDays, now = new Date()): Promise<number> {
  const employees = await Employee.find({ isActive: true, workSchedule: { $exists: true } }).lean() as any[];

  let created = 0;
  for (const employee of employees) {
    const schedule = employee.workSchedule;
    if (!schedule) continue;
    const tolerance = schedule.toleranceMinutes ?? 10;

    if (schedule.shiftMode === 'rotating') {
      created += await closeRotatingAbsences(employee, schedule, tolerance, now);
      continue;
    }

    const schoolClosed = closedDays.get(String(employee.schoolId));
    for (let offset = 0; offset <= RETRO_DAYS; offset++) {
      const { date, dayKey, currentMinutes } = dateContextAt(offset, now);
      if (schoolClosed?.get(date) === 'holiday') continue; // feriado: sem falta
      if (!schedule.workDays?.includes(dayKey)) continue;

      const lastExit = schedule.shiftType === 'split3'
        ? schedule.shift3ExitTime
        : schedule.shiftType === 'split2'
          ? schedule.shift2ExitTime
          : schedule.exitTime;
      if (!schedule.entryTime || !lastExit || currentMinutes <= timeToMinutes(lastExit) + tolerance) continue;

      const expectedMinutes = [
        [schedule.entryTime, schedule.exitTime],
        [schedule.shift2EntryTime, schedule.shift2ExitTime],
        [schedule.shift3EntryTime, schedule.shift3ExitTime],
      ].reduce((total, [entry, exit], index) => {
        if (index === 1 && !['split2', 'split3'].includes(schedule.shiftType)) return total;
        if (index === 2 && schedule.shiftType !== 'split3') return total;
        return entry && exit ? total + Math.max(0, timeToMinutes(exit) - timeToMinutes(entry)) : total;
      }, 0);

      const created_ = await upsertEmployeeAbsence(employee, schedule, {
        date,
        dayKey,
        shift: 'integral',
        expectedEntryTime: schedule.entryTime,
        expectedExitTime: schedule.exitTime,
        expectedMinutes,
      });
      if (created_) created++;
    }
  }
  return created;
}

async function closeTeacherAbsences(closedDays: ClosedDays, now = new Date()): Promise<number> {
  const [teacherLinks, schoolLinks] = await Promise.all([
    TeacherPontoLink.find({ isActive: true, isEnabled: { $ne: false } }).lean() as any,
    SchoolPontoLink.find({ isActive: true }).lean() as any,
  ]);

  const configs = new Map<string, { graceMinutes: number; activeTimetableId?: string }>();
  for (const link of schoolLinks as any[]) {
    configs.set(link.schoolId, { graceMinutes: link.graceMinutes ?? 10 });
  }
  for (const link of teacherLinks as any[]) {
    configs.set(link.schoolId, {
      graceMinutes: link.graceMinutes ?? 10,
      activeTimetableId: link.activeTimetableId || undefined,
    });
  }

  let markedAbsent = 0;
  for (const [schoolId, config] of configs) {
    const timetableQuery: any = { $or: [{ school: schoolId }, { userId: schoolId }] };
    if (config.activeTimetableId) timetableQuery.scheduleId = config.activeTimetableId;

    const [timetables, schedule] = await Promise.all([
      GeneratedTimetable.find(timetableQuery).sort({ createdAt: -1 }).lean() as any,
      Schedule.findOne({ userId: schoolId }).lean() as any,
    ]);
    const activeScheduleId = config.activeTimetableId || (timetables as any[])[0]?.scheduleId;
    const activeTimetables = (timetables as any[]).filter(timetable =>
      !activeScheduleId || String(timetable.scheduleId) === String(activeScheduleId)
    );
    const periodMap = new Map(
      ((schedule as any)?.periods?.length ? (schedule as any).periods : DEFAULT_PERIODS)
        .map((period: any) => [period.period, period])
    );
    const schoolClosed = closedDays.get(String(schoolId));

    for (let offset = 0; offset <= RETRO_DAYS; offset++) {
      const { date, dayKey, currentMinutes } = dateContextAt(offset, now);
      const closedType = schoolClosed?.get(date);
      if (closedType === 'holiday' || closedType === 'recess') continue; // sem aula prevista
      const effectiveDay = await effectiveDayKey(schoolId, date, dayKey);

      const slotsByTeacher = new Map<string, any[]>();
      const seen = new Set<string>();
      for (const timetable of activeTimetables) {
        for (const slot of timetable.slots || []) {
          const slotDay = String(slot.day || '');
          if (![effectiveDay, DAYS_PT[effectiveDay], DAYS_PT[effectiveDay]?.toLowerCase()].includes(slotDay)
            && slotDay.toLowerCase() !== effectiveDay) continue;
          if (!slot.teacherId) continue;

          const teacherId = String(slot.teacherId);
          const classId = String(timetable.classId || slot.classId || '');
          const uniqueKey = `${teacherId}-${slot.period}-${classId}`;
          if (seen.has(uniqueKey)) continue;
          seen.add(uniqueKey);

          const period = periodMap.get(slot.period) as any;
          const normalized = {
            ...slot,
            classId,
            startTime: slot.startTime || period?.startTime || '00:00',
            endTime: slot.endTime || period?.endTime || '00:00',
          };
          slotsByTeacher.set(teacherId, [...(slotsByTeacher.get(teacherId) || []), normalized]);
        }
      }
      if (slotsByTeacher.size === 0) continue;

      const teacherIds = [...slotsByTeacher.keys()];
      const allSlots = [...slotsByTeacher.values()].flat();
      const [teachers, subjects, classes] = await Promise.all([
        Teacher.find({ _id: { $in: teacherIds }, schoolId }).select('_id name').lean(),
        Subject.find({ _id: { $in: allSlots.map(slot => slot.subjectId).filter(Boolean) } }).select('_id name').lean(),
        Class.find({ _id: { $in: allSlots.map(slot => slot.classId).filter(Boolean) } }).select('_id name grade').lean(),
      ]);
      const teacherNames = new Map((teachers as any[]).map(item => [String(item._id), item.name]));
      const subjectNames = new Map((subjects as any[]).map(item => [String(item._id), item.name]));
      const classNames = new Map((classes as any[]).map(item => [String(item._id), item]));

      for (const [teacherId, slots] of slotsByTeacher) {
        const teacherName = teacherNames.get(teacherId);
        if (!teacherName) continue;

        let attendance = await TeacherAttendance.findOne({ schoolId, teacherId, date });
        if (!attendance) {
          let changed = false;
          attendance = new TeacherAttendance({
            schoolId,
            teacherId,
            teacherName,
            date,
            dayOfWeek: effectiveDay,
            schoolYear: Number(date.slice(0, 4)),
            classes: slots.map(slot => {
              const classInfo = classNames.get(String(slot.classId));
              const expired = currentMinutes > timeToMinutes(slot.endTime) + config.graceMinutes;
              if (expired) {
                markedAbsent++;
                changed = true;
              }
              return {
                period: slot.period,
                startTime: slot.startTime,
                endTime: slot.endTime,
                subjectId: String(slot.subjectId || ''),
                subjectName: subjectNames.get(String(slot.subjectId)) || 'Horário Pedagógico',
                classId: String(slot.classId || ''),
                className: classInfo?.name || '',
                grade: classInfo?.grade || '',
                isPedagogical: !slot.subjectId,
                status: expired ? 'absent' : 'pending',
                markedAt: expired ? new Date() : undefined,
              };
            }),
          });
          // Em dias passados, só cria o registro se houver falta a lançar
          if (offset > 0 && !changed) continue;
        } else {
          let changed = false;
          for (const classRecord of (attendance as any).classes) {
            if (classRecord.status === 'pending'
              && !classRecord.entryTime
              && currentMinutes > timeToMinutes(classRecord.endTime) + config.graceMinutes) {
              classRecord.status = 'absent';
              classRecord.markedAt = new Date();
              markedAbsent++;
              changed = true;
            }
          }
          if (!changed) continue;
        }
        await attendance.save();
      }
    }
  }
  return markedAbsent;
}

export async function processAutomaticAbsences(now = new Date()) {
  const closedDays = await loadClosedDays(now);
  const [employeeAbsences, teacherAbsences] = await Promise.all([
    closeEmployeeAbsences(closedDays, now),
    closeTeacherAbsences(closedDays, now),
  ]);
  return { employeeAbsences, teacherAbsences };
}
