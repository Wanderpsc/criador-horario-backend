import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Timetable from '../models/Timetable';
import Teacher from '../models/Teacher';
import TeacherSubject from '../models/TeacherSubject';
import Subject from '../models/Subject';

dotenv.config();

const getArg = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  const item = process.argv.find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : undefined;
};

const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

const getPositiveNumber = (...values: unknown[]): number => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 0;
};

const extractClassKeyFromSubjectName = (subjectName: string): string => {
  const normalized = normalizeText(subjectName || '');
  if (normalized.includes('→')) {
    return normalized.split('→').pop()!.trim();
  }
  return normalized;
};

const getAvailabilityKeysForDay = (day: number): string[] => {
  const aliases = [
    ['0', '1', 'seg', 'segunda', 'segunda-feira', 'mon', 'monday'],
    ['1', '2', 'ter', 'terca', 'terça', 'terca-feira', 'terça-feira', 'tue', 'tuesday'],
    ['2', '3', 'qua', 'quarta', 'quarta-feira', 'wed', 'wednesday'],
    ['3', '4', 'qui', 'quinta', 'quinta-feira', 'thu', 'thursday'],
    ['4', '5', 'sex', 'sexta', 'sexta-feira', 'fri', 'friday'],
    ['5', '6', 'sab', 'sábado', 'sabado', 'saturday', 'sat']
  ];

  return (aliases[day] || [String(day), String(day + 1)]).map((key) =>
    key
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  );
};

const readAvailabilityValue = (value: any): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return null;
};

const isTeacherAvailableAt = (teacher: any, day: number, period: number): boolean => {
  const rawAvailability = teacher?.availability;
  if (!rawAvailability || typeof rawAvailability !== 'object') {
    return true;
  }

  const entries = Object.entries(rawAvailability);
  if (entries.length === 0) {
    return true;
  }

  const normalizedMap = new Map<string, any>();
  for (const [key, value] of entries) {
    const normalizedKey = key
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    normalizedMap.set(normalizedKey, value);
  }

  const dayKeys = getAvailabilityKeysForDay(day);
  let dayAvailability: any = null;
  for (const key of dayKeys) {
    if (normalizedMap.has(key)) {
      dayAvailability = normalizedMap.get(key);
      break;
    }
  }

  if (dayAvailability == null) {
    return true;
  }

  if (Array.isArray(dayAvailability)) {
    const direct = readAvailabilityValue(dayAvailability[period]);
    if (direct !== null) return direct;
    const shifted = readAvailabilityValue(dayAvailability[period + 1]);
    if (shifted !== null) return shifted;
    return false;
  }

  if (typeof dayAvailability === 'object') {
    const direct = readAvailabilityValue(dayAvailability[period]);
    if (direct !== null) return direct;
    const shifted = readAvailabilityValue(dayAvailability[period + 1]);
    if (shifted !== null) return shifted;

    const directStr = readAvailabilityValue(dayAvailability[String(period)]);
    if (directStr !== null) return directStr;
    const shiftedStr = readAvailabilityValue(dayAvailability[String(period + 1)]);
    if (shiftedStr !== null) return shiftedStr;

    return false;
  }

  return true;
};

async function run(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI não configurado.');

  const timetableName = getArg('name') || 'HORÁRIO 002 - 03-03-2026';
  const userIdArg = getArg('userId');

  await mongoose.connect(mongoUri);

  try {
    const timetableFilter: any = { name: timetableName };
    if (userIdArg) {
      timetableFilter.userId = new mongoose.Types.ObjectId(userIdArg);
    }

    const timetable = await Timetable.findOne(timetableFilter).sort({ createdAt: -1 }).lean();

    if (!timetable) {
      throw new Error(`Timetable não encontrado: ${timetableName}`);
    }

    const userId = timetable.userId.toString();

    const [teachers, teacherSubjects, subjects] = await Promise.all([
      Teacher.find({ userId }).lean(),
      TeacherSubject.find({ userId }).lean(),
      Subject.find({ userId }).lean()
    ]);

    const teachersById = new Map<string, any>(teachers.map((t) => [t._id.toString(), t]));
    const subjectById = new Map<string, any>(subjects.map((s) => [s._id.toString(), s]));

    const subjectTeacherMap = new Map<string, Set<string>>();
    for (const association of teacherSubjects) {
      const teacherId = association.teacherId?.toString();
      const subjectId = association.subjectId?.toString();
      if (!teacherId || !subjectId) continue;

      if (!subjectTeacherMap.has(subjectId)) {
        subjectTeacherMap.set(subjectId, new Set<string>());
      }
      subjectTeacherMap.get(subjectId)!.add(teacherId);
    }

    const subjectWeeklyLessonsMap = new Map<string, number>();
    const subjectClassKeyMap = new Map<string, string>();
    for (const subject of subjects) {
      const subjectId = subject._id.toString();
      subjectWeeklyLessonsMap.set(
        subjectId,
        getPositiveNumber((subject as any).workload, (subject as any).workloadHours, (subject as any).weeklyHours, (subject as any).hours)
      );
      subjectClassKeyMap.set(subjectId, extractClassKeyFromSubjectName(subject.name || ''));
    }

    const expectedByTeacher = new Map<string, number>();
    for (const association of teacherSubjects) {
      const teacherId = association.teacherId?.toString();
      const subjectId = association.subjectId?.toString();
      if (!teacherId || !subjectId) continue;

      const explicitWeeklyHours = getPositiveNumber((association as any).weeklyHours);
      const isSingleTeacherSubject = (subjectTeacherMap.get(subjectId)?.size || 0) === 1;
      const expectedLessons = explicitWeeklyHours > 0
        ? explicitWeeklyHours
        : isSingleTeacherSubject
          ? getPositiveNumber(subjectWeeklyLessonsMap.get(subjectId))
          : 0;

      if (expectedLessons > 0) {
        expectedByTeacher.set(teacherId, (expectedByTeacher.get(teacherId) || 0) + expectedLessons);
      }
    }

    const slotsByTeacher = new Map<string, Array<{ day: number; period: number; subjectId: string }>>();
    for (const slot of timetable.grid || []) {
      const teacherId = slot.teacherId?.toString();
      const subjectId = slot.subjectId?.toString();
      if (!teacherId || !subjectId) continue;

      if (!slotsByTeacher.has(teacherId)) {
        slotsByTeacher.set(teacherId, []);
      }

      slotsByTeacher.get(teacherId)!.push({ day: slot.day, period: slot.period, subjectId });
    }

    let totalDeficitTeachers = 0;
    let totalAvailabilityViolations = 0;
    let totalConsecutiveSameClassViolations = 0;
    let totalWindowCount = 0;

    console.log('');
    console.log('=== CONFERÊNCIA DE CONFORMIDADE DO HORÁRIO ===');
    console.log(`Horário : ${timetable.name}`);
    console.log(`ID      : ${timetable._id}`);
    console.log(`User    : ${userId}`);
    console.log('');

    for (const teacher of teachers.sort((a, b) => a.name.localeCompare(b.name))) {
      const teacherId = teacher._id.toString();
      const slots = (slotsByTeacher.get(teacherId) || []).sort((a, b) => a.day - b.day || a.period - b.period);

      const expected = expectedByTeacher.get(teacherId) || 0;
      const assigned = slots.length;
      const deficit = Math.max(0, expected - assigned);
      const excess = Math.max(0, assigned - expected);

      if (deficit > 0) totalDeficitTeachers++;

      let availabilityViolations = 0;
      let consecutiveSameClassViolations = 0;

      const periodsByDay = new Map<number, number[]>();

      for (const slot of slots) {
        if (!periodsByDay.has(slot.day)) {
          periodsByDay.set(slot.day, []);
        }
        periodsByDay.get(slot.day)!.push(slot.period);

        if (!isTeacherAvailableAt(teacher, slot.day, slot.period)) {
          availabilityViolations++;
        }
      }

      totalAvailabilityViolations += availabilityViolations;

      for (const [day, periods] of periodsByDay.entries()) {
        const sorted = [...periods].sort((a, b) => a - b);

        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i] === sorted[i - 1] + 1) {
            const current = slots.find((s) => s.day === day && s.period === sorted[i]);
            const previous = slots.find((s) => s.day === day && s.period === sorted[i - 1]);
            if (current && previous) {
              const currentClass = subjectClassKeyMap.get(current.subjectId) || '';
              const previousClass = subjectClassKeyMap.get(previous.subjectId) || '';
              if (currentClass && previousClass && currentClass === previousClass) {
                consecutiveSameClassViolations++;
              }
            }
          }
        }
      }

      totalConsecutiveSameClassViolations += consecutiveSameClassViolations;

      let windows = 0;
      for (const periods of periodsByDay.values()) {
        const sorted = [...periods].sort((a, b) => a - b);
        if (sorted.length <= 1) continue;
        for (let i = 1; i < sorted.length; i++) {
          const gap = sorted[i] - sorted[i - 1] - 1;
          if (gap > 0) windows += gap;
        }
      }

      totalWindowCount += windows;

      const activeDays = periodsByDay.size;
      const expectedMinDays = Math.min(5, Math.max(1, assigned > 0 ? assigned : expected));
      const distributionOk = assigned === 0 ? true : activeDays >= Math.min(expectedMinDays, 5);

      const complianceParts: string[] = [];
      complianceParts.push(deficit === 0 ? 'CARGA_OK' : `CARGA_FALTA_${deficit}`);
      if (excess > 0) complianceParts.push(`CARGA_EXCESSO_${excess}`);
      complianceParts.push(availabilityViolations === 0 ? 'RESTRICAO_OK' : `RESTRICAO_VIOL_${availabilityViolations}`);
      complianceParts.push(consecutiveSameClassViolations === 0 ? 'SEM_REPETICAO' : `REPETICAO_${consecutiveSameClassViolations}`);
      complianceParts.push(windows === 0 ? 'SEM_JANELA' : `JANELAS_${windows}`);
      complianceParts.push(distributionOk ? `DIAS_OK_${activeDays}` : `DIAS_BAIXO_${activeDays}`);

      console.log(
        `${teacher.name.padEnd(32)} | lotado=${String(expected).padStart(2)} | gerado=${String(assigned).padStart(2)} | ${complianceParts.join(' | ')}`
      );
    }

    console.log('');
    console.log('--- RESUMO ---');
    console.log(`Professores com déficit de carga: ${totalDeficitTeachers}`);
    console.log(`Violações de disponibilidade: ${totalAvailabilityViolations}`);
    console.log(`Repetições consecutivas mesma turma: ${totalConsecutiveSameClassViolations}`);
    console.log(`Total de janelas de professores: ${totalWindowCount}`);

    const overallOk =
      totalDeficitTeachers === 0 &&
      totalAvailabilityViolations === 0 &&
      totalConsecutiveSameClassViolations === 0;

    console.log('');
    console.log(overallOk ? '✅ Resultado geral: CONFORME nas regras críticas.' : '❌ Resultado geral: há não conformidades nas regras críticas.');

    if (!overallOk) {
      process.exitCode = 2;
    }
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('❌ Erro na conferência:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
