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

function brtNow(now = new Date()): Date {
  return new Date(now.getTime() - 3 * 60 * 60 * 1000);
}

function timeToMinutes(value?: string): number {
  if (!value) return 0;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function dateContext(now = new Date()) {
  const brt = brtNow(now);
  return {
    date: brt.toISOString().slice(0, 10),
    dayKey: DAYS_EN[brt.getUTCDay()],
    currentMinutes: brt.getUTCHours() * 60 + brt.getUTCMinutes(),
  };
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

async function closeEmployeeAbsences(now = new Date()): Promise<number> {
  const { date, dayKey, currentMinutes } = dateContext(now);
  const employees = await Employee.find({ isActive: true, workSchedule: { $exists: true } }).lean() as any[];

  let created = 0;
  for (const employee of employees) {
    const schedule = employee.workSchedule;
    const tolerance = schedule.toleranceMinutes ?? 10;
    let attendanceDate = date;
    let attendanceDay = dayKey;
    let expectedEntryTime = schedule.entryTime;
    let expectedExitTime = schedule.exitTime;
    let expectedMinutes = 0;
    let shift = 'integral';

    if (schedule.shiftMode === 'rotating') {
      if (!schedule.rotatingCycleStart || !schedule.rotatingWorkHours || !schedule.rotatingEntryTime) continue;
      const shiftedNow = brtNow(now).getTime();
      const cycleStart = Date.parse(`${schedule.rotatingCycleStart}T${schedule.rotatingEntryTime}:00.000Z`);
      const cycleLength = (schedule.rotatingWorkHours + (schedule.rotatingRestDays ?? 1) * 24) * 60 * 60 * 1000;
      if (!Number.isFinite(cycleStart) || shiftedNow < cycleStart) continue;

      const cycleIndex = Math.floor((shiftedNow - cycleStart) / cycleLength);
      const dutyStart = cycleStart + cycleIndex * cycleLength;
      const dutyEnd = dutyStart + schedule.rotatingWorkHours * 60 * 60 * 1000;
      if (shiftedNow <= dutyEnd + tolerance * 60 * 1000) continue;

      const startDate = new Date(dutyStart);
      const endDate = new Date(dutyEnd);
      attendanceDate = startDate.toISOString().slice(0, 10);
      attendanceDay = DAYS_EN[startDate.getUTCDay()];
      expectedEntryTime = `${String(startDate.getUTCHours()).padStart(2, '0')}:${String(startDate.getUTCMinutes()).padStart(2, '0')}`;
      expectedExitTime = `${String(endDate.getUTCHours()).padStart(2, '0')}:${String(endDate.getUTCMinutes()).padStart(2, '0')}`;
      expectedMinutes = schedule.rotatingWorkHours * 60;
      shift = 'plantao';
    } else {
      if (!schedule.workDays?.includes(dayKey)) continue;
      const lastExit = schedule.shiftType === 'split3'
        ? schedule.shift3ExitTime
        : schedule.shiftType === 'split2'
          ? schedule.shift2ExitTime
          : schedule.exitTime;
      if (!schedule.entryTime || !lastExit || currentMinutes <= timeToMinutes(lastExit) + tolerance) continue;

      expectedMinutes = [
        [schedule.entryTime, schedule.exitTime],
        [schedule.shift2EntryTime, schedule.shift2ExitTime],
        [schedule.shift3EntryTime, schedule.shift3ExitTime],
      ].reduce((total, [entry, exit], index) => {
        if (index === 1 && !['split2', 'split3'].includes(schedule.shiftType)) return total;
        if (index === 2 && schedule.shiftType !== 'split3') return total;
        return entry && exit ? total + Math.max(0, timeToMinutes(exit) - timeToMinutes(entry)) : total;
      }, 0);
    }

    const result = await EmployeeAttendance.updateOne(
      { schoolId: employee.schoolId, employeeId: String(employee._id), date: attendanceDate },
      {
        $setOnInsert: {
          schoolId: employee.schoolId,
          employeeId: String(employee._id),
          employeeName: employee.name,
          cargo: employee.cargo || '',
          setor: employee.setor || '',
          date: attendanceDate,
          dayOfWeek: attendanceDay,
          shift,
          status: 'absent',
          expectedEntryTime,
          expectedExitTime,
          expectedEntryTime2: schedule.shift2EntryTime,
          expectedExitTime2: schedule.shift2ExitTime,
          expectedEntryTime3: schedule.shift3EntryTime,
          expectedExitTime3: schedule.shift3ExitTime,
          shiftType: schedule.shiftType || 'single',
          workedMinutes: 0,
          expectedMinutes,
          deficitMinutes: expectedMinutes,
          markedById: 'system',
          markedByName: 'Fechamento automático',
          observations: 'Falta gerada automaticamente por ausência de registro de ponto.',
        },
      },
      { upsert: true }
    );
    if (result.upsertedCount > 0) created++;
  }
  return created;
}

async function closeTeacherAbsences(now = new Date()): Promise<number> {
  const { date, dayKey, currentMinutes } = dateContext(now);
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
    const effectiveDay = await effectiveDayKey(schoolId, date, dayKey);
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
            if (expired) markedAbsent++;
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
      } else {
        for (const classRecord of (attendance as any).classes) {
          if (classRecord.status === 'pending'
            && !classRecord.entryTime
            && currentMinutes > timeToMinutes(classRecord.endTime) + config.graceMinutes) {
            classRecord.status = 'absent';
            classRecord.markedAt = new Date();
            markedAbsent++;
          }
        }
      }
      await attendance.save();
    }
  }
  return markedAbsent;
}

export async function processAutomaticAbsences(now = new Date()) {
  const [employeeAbsences, teacherAbsences] = await Promise.all([
    closeEmployeeAbsences(now),
    closeTeacherAbsences(now),
  ]);
  return { employeeAbsences, teacherAbsences };
}
