import dotenv from 'dotenv';
import mongoose from 'mongoose';
import GeneratedTimetable from '../models/GeneratedTimetable';
import TeacherSubject from '../models/TeacherSubject';
import Teacher from '../models/Teacher';
import Subject from '../models/Subject';
import Class from '../models/Class';

dotenv.config();

const getArg = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  const item = process.argv.find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : undefined;
};

const normalizeKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getPositiveNumber = (...values: unknown[]): number => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 0;
};

const dayToNumber = (day: string): number => {
  const key = normalizeKey(String(day || ''));
  const map: Record<string, number> = {
    seg: 0,
    segunda: 0,
    'segunda-feira': 0,
    monday: 0,
    mon: 0,
    ter: 1,
    terca: 1,
    'terca-feira': 1,
    tuesday: 1,
    tue: 1,
    qua: 2,
    quarta: 2,
    'quarta-feira': 2,
    wednesday: 2,
    wed: 2,
    qui: 3,
    quinta: 3,
    'quinta-feira': 3,
    thursday: 3,
    thu: 3,
    sex: 4,
    sexta: 4,
    'sexta-feira': 4,
    friday: 4,
    fri: 4,
    sab: 5,
    sabado: 5,
    'sabado-letivo': 5,
    saturday: 5,
    sat: 5
  };

  if (key in map) {
    return map[key];
  }

  const numeric = Number(key);
  if (Number.isFinite(numeric)) {
    if (numeric >= 1 && numeric <= 7) return numeric - 1;
    if (numeric >= 0 && numeric <= 6) return numeric;
  }

  return 0;
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

  return (aliases[day] || [String(day), String(day + 1)]).map((key) => normalizeKey(String(key)));
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
  if (!rawAvailability || typeof rawAvailability !== 'object') return true;

  const entries = Object.entries(rawAvailability);
  if (entries.length === 0) return true;

  const normalizedMap = new Map<string, any>();
  for (const [key, value] of entries) {
    normalizedMap.set(normalizeKey(key), value);
  }

  let dayAvailability: any = null;
  for (const dayKey of getAvailabilityKeysForDay(day)) {
    if (normalizedMap.has(dayKey)) {
      dayAvailability = normalizedMap.get(dayKey);
      break;
    }
  }

  if (dayAvailability == null) return true;

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

const getClassSubjectHours = (classItem: any, subjectId: string): number | undefined => {
  if (!classItem?.subjectWeeklyHours) {
    return undefined;
  }

  const subjectWeeklyHours = classItem.subjectWeeklyHours;
  if (subjectWeeklyHours instanceof Map) {
    return subjectWeeklyHours.get(subjectId);
  }

  if (typeof subjectWeeklyHours.get === 'function') {
    return subjectWeeklyHours.get(subjectId);
  }

  return subjectWeeklyHours[subjectId];
};

async function run(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI não configurado.');
  }

  const title = getArg('title') || 'HORÁRIO 002 - 03-03-2026';

  await mongoose.connect(mongoUri);

  try {
    const docs = await GeneratedTimetable.find({ title }).sort({ createdAt: -1 }).lean();
    if (docs.length === 0) {
      throw new Error(`Nenhum GeneratedTimetable encontrado com título: ${title}`);
    }

    const latestCreatedAt = docs[0].createdAt;
    const timeWindowStart = new Date(new Date(latestCreatedAt).getTime() - 120000);
    const batchDocs = docs.filter((doc: any) => new Date(doc.createdAt) >= timeWindowStart);

    const userId = String(batchDocs[0].userId || '');
    const classIds = Array.from(new Set(batchDocs.map((d: any) => String(d.classId))));

    const [teacherSubjects, teachers, subjects, classes] = await Promise.all([
      TeacherSubject.find({ userId, classId: { $in: classIds } }).lean(),
      Teacher.find({ userId }).lean(),
      Subject.find({ userId }).lean(),
      Class.find({ _id: { $in: classIds } }).lean()
    ]);

    const teacherById = new Map(teachers.map((t: any) => [String(t._id), t]));
    const subjectById = new Map(subjects.map((s: any) => [String(s._id), s]));
    const classById = new Map(classes.map((c: any) => [String(c._id), c]));

    const expectedAllocation = new Map<string, number>();

    for (const association of teacherSubjects as any[]) {
      if (!association.classId || !association.subjectId || !association.teacherId) continue;

      const classId = String(association.classId);
      const subjectId = String(association.subjectId);
      const teacherId = String(association.teacherId);
      const classItem = classById.get(classId);
      const subjectItem = subjectById.get(subjectId);
      if (!classItem || !subjectItem) continue;

      let expectedHours: number | undefined =
        association.weeklyHours !== undefined && association.weeklyHours !== null
          ? Number(association.weeklyHours)
          : undefined;

      if (expectedHours === undefined || Number.isNaN(expectedHours)) {
        const classHours = getClassSubjectHours(classItem, subjectId);
        if (classHours !== undefined && classHours !== null) {
          expectedHours = Number(classHours);
        } else if (subjectItem.weeklyHours !== undefined && subjectItem.weeklyHours !== null) {
          expectedHours = Number(subjectItem.weeklyHours);
        } else {
          expectedHours = 2;
        }
      }

      const normalizedExpected = Math.max(0, Math.floor(expectedHours));
      const key = `${classId}|${subjectId}|${teacherId}`;
      expectedAllocation.set(key, (expectedAllocation.get(key) || 0) + normalizedExpected);
    }

    const allSlots: any[] = [];
    for (const doc of batchDocs as any[]) {
      const slots = Array.isArray(doc.slots) ? doc.slots : [];
      for (const slot of slots) {
        allSlots.push({ ...slot, classId: String(slot.classId || doc.classId) });
      }
    }

    const generatedAllocation = new Map<string, number>();
    const expectedByTeacher = new Map<string, number>();
    const generatedByTeacher = new Map<string, number>();

    for (const [key, value] of expectedAllocation.entries()) {
      const teacherId = key.split('|')[2];
      expectedByTeacher.set(teacherId, (expectedByTeacher.get(teacherId) || 0) + value);
    }

    for (const slot of allSlots) {
      const classId = String(slot.classId || '');
      const subjectId = String(slot.subjectId || '');
      const teacherId = String(slot.teacherId || '');
      if (!classId || !subjectId || !teacherId) continue;

      const key = `${classId}|${subjectId}|${teacherId}`;
      generatedAllocation.set(key, (generatedAllocation.get(key) || 0) + 1);
      generatedByTeacher.set(teacherId, (generatedByTeacher.get(teacherId) || 0) + 1);
    }

    const deficits: any[] = [];
    const excesses: any[] = [];

    for (const [key, expected] of expectedAllocation.entries()) {
      const generated = generatedAllocation.get(key) || 0;
      if (generated < expected) {
        deficits.push({ key, expected, generated, missing: expected - generated });
      } else if (generated > expected) {
        excesses.push({ key, expected, generated, extra: generated - expected });
      }
    }

    const slotsByTeacherDay = new Map<string, Map<number, any[]>>();
    let availabilityViolations = 0;
    let consecutiveSameClassViolations = 0;
    let totalWindows = 0;

    for (const slot of allSlots) {
      const teacherId = String(slot.teacherId || '');
      if (!teacherId) continue;

      const day = dayToNumber(String(slot.day || ''));
      const periodRaw = Number(slot.period);
      const period = Number.isFinite(periodRaw) ? periodRaw : 0;

      if (!slotsByTeacherDay.has(teacherId)) {
        slotsByTeacherDay.set(teacherId, new Map<number, any[]>());
      }
      const perDay = slotsByTeacherDay.get(teacherId)!;
      if (!perDay.has(day)) {
        perDay.set(day, []);
      }
      perDay.get(day)!.push({ ...slot, day, period });

      const teacher = teacherById.get(teacherId);
      if (!isTeacherAvailableAt(teacher, day, period)) {
        availabilityViolations++;
      }
    }

    const teacherRows: any[] = [];

    for (const teacher of teachers as any[]) {
      const teacherId = String(teacher._id);
      const expected = expectedByTeacher.get(teacherId) || 0;
      const generated = generatedByTeacher.get(teacherId) || 0;
      const deficit = Math.max(0, expected - generated);
      const extra = Math.max(0, generated - expected);

      const perDay = slotsByTeacherDay.get(teacherId) || new Map<number, any[]>();
      const activeDays = Array.from(perDay.values()).filter((arr) => arr.length > 0).length;

      let teacherWindows = 0;
      let teacherRepetition = 0;

      for (const daySlots of perDay.values()) {
        const sorted = [...daySlots].sort((a, b) => a.period - b.period);

        for (let i = 1; i < sorted.length; i++) {
          const gap = sorted[i].period - sorted[i - 1].period - 1;
          if (gap > 0) {
            teacherWindows += gap;
          }

          if (sorted[i].period === sorted[i - 1].period + 1) {
            if (String(sorted[i].classId) === String(sorted[i - 1].classId)) {
              teacherRepetition++;
            }
          }
        }
      }

      totalWindows += teacherWindows;
      consecutiveSameClassViolations += teacherRepetition;

      teacherRows.push({
        name: teacher.name,
        expected,
        generated,
        deficit,
        extra,
        activeDays,
        windows: teacherWindows,
        repetition: teacherRepetition,
        distributionOk: generated < 5 ? activeDays >= generated : activeDays >= 5
      });
    }

    const deficitTeachers = teacherRows.filter((row) => row.deficit > 0).length;
    const distributionFailTeachers = teacherRows.filter((row) => row.generated > 0 && !row.distributionOk).length;

    console.log('');
    console.log('=== CONFERÊNCIA DO HORÁRIO GERADO ===');
    console.log(`Título           : ${title}`);
    console.log(`Registros/turmas : ${batchDocs.length}`);
    console.log(`Aulas totais     : ${allSlots.length}`);
    console.log('');

    for (const row of teacherRows.sort((a, b) => a.name.localeCompare(b.name))) {
      const statusParts = [
        row.deficit === 0 ? 'CARGA_OK' : `FALTA_${row.deficit}`,
        row.extra > 0 ? `EXTRA_${row.extra}` : 'SEM_EXTRA',
        row.repetition === 0 ? 'SEM_REP' : `REP_${row.repetition}`,
        row.windows === 0 ? 'SEM_JANELA' : `JANELA_${row.windows}`,
        row.distributionOk ? `DIAS_OK_${row.activeDays}` : `DIAS_BAIXO_${row.activeDays}`
      ];

      console.log(
        `${row.name.padEnd(32)} | lotado=${String(row.expected).padStart(2)} | gerado=${String(row.generated).padStart(2)} | ${statusParts.join(' | ')}`
      );
    }

    console.log('');
    console.log('--- RESUMO ---');
    console.log(`Professores com déficit de carga: ${deficitTeachers}`);
    console.log(`Déficits por vínculo (turma/disc/prof): ${deficits.length}`);
    console.log(`Excessos por vínculo (turma/disc/prof): ${excesses.length}`);
    console.log(`Violações de disponibilidade: ${availabilityViolations}`);
    console.log(`Repetições consecutivas na mesma turma: ${consecutiveSameClassViolations}`);
    console.log(`Total de janelas: ${totalWindows}`);
    console.log(`Professores sem distribuição em 5 dias (quando aplicável): ${distributionFailTeachers}`);

    if (deficits.length > 0) {
      console.log('');
      console.log('--- DÉFICITS DETALHADOS ---');
      for (const item of deficits) {
        const [classId, subjectId, teacherId] = String(item.key).split('|');
        const classItem = classById.get(classId);
        const subjectItem = subjectById.get(subjectId);
        const teacherItem = teacherById.get(teacherId);

        console.log(
          `${teacherItem?.name || teacherId} | turma=${classItem?.name || classId} | disciplina=${subjectItem?.name || subjectId} | esperado=${item.expected} | gerado=${item.generated} | falta=${item.missing}`
        );
      }
    }

    const criticalOk = deficitTeachers === 0 && deficits.length === 0 && availabilityViolations === 0;

    console.log('');
    console.log(criticalOk ? '✅ Regras críticas atendidas.' : '❌ Regras críticas NÃO atendidas.');

    if (!criticalOk) {
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
