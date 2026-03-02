import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Timetable from '../models/Timetable';
import Teacher from '../models/Teacher';
import TeacherSubject from '../models/TeacherSubject';
import Subject from '../models/Subject';

dotenv.config();

const getArg = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
};

const getPositiveNumber = (...values: unknown[]): number => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 0;
};

async function run(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI não definido no ambiente.');
  }

  const userIdArg = getArg('userId');
  const scheduleIdArg = getArg('scheduleId');

  await mongoose.connect(mongoUri);

  try {
    const timetableFilter: any = {};

    if (scheduleIdArg) {
      if (!mongoose.Types.ObjectId.isValid(scheduleIdArg)) {
        throw new Error(`scheduleId inválido: ${scheduleIdArg}`);
      }
      timetableFilter.scheduleId = new mongoose.Types.ObjectId(scheduleIdArg);
    }

    if (userIdArg) {
      if (!mongoose.Types.ObjectId.isValid(userIdArg)) {
        throw new Error(`userId inválido: ${userIdArg}`);
      }
      timetableFilter.userId = new mongoose.Types.ObjectId(userIdArg);
    }

    const timetable = await Timetable.findOne(timetableFilter).sort({ createdAt: -1 }).lean();

    if (!timetable) {
      throw new Error('Nenhum timetable encontrado com os filtros informados.');
    }

    const userId = userIdArg || timetable.userId.toString();

    const [teachers, teacherSubjects, subjects] = await Promise.all([
      Teacher.find({ userId }).lean(),
      TeacherSubject.find({ userId }).lean(),
      Subject.find({ userId }).lean()
    ]);

    const subjectWeeklyLessonsMap = new Map<string, number>();
    for (const subject of subjects) {
      subjectWeeklyLessonsMap.set(
        subject._id.toString(),
        getPositiveNumber((subject as any).workload, (subject as any).workloadHours, (subject as any).weeklyHours, (subject as any).hours)
      );
    }

    const subjectTeacherMap = new Map<string, Set<string>>();
    for (const association of teacherSubjects) {
      const subjectId = association.subjectId?.toString();
      const teacherId = association.teacherId?.toString();

      if (!subjectId || !teacherId) {
        continue;
      }

      if (!subjectTeacherMap.has(subjectId)) {
        subjectTeacherMap.set(subjectId, new Set());
      }
      subjectTeacherMap.get(subjectId)!.add(teacherId);
    }

    const expectedByTeacher = new Map<string, number>();
    for (const association of teacherSubjects) {
      const teacherId = association.teacherId?.toString();
      const subjectId = association.subjectId?.toString();

      if (!teacherId || !subjectId) {
        continue;
      }

      const explicitWeeklyHours = getPositiveNumber((association as any).weeklyHours);
      const allowedTeachersForSubject = subjectTeacherMap.get(subjectId);
      const isSingleTeacherSubject = (allowedTeachersForSubject?.size || 0) === 1;

      const expectedLessons =
        explicitWeeklyHours > 0
          ? explicitWeeklyHours
          : isSingleTeacherSubject
            ? getPositiveNumber(subjectWeeklyLessonsMap.get(subjectId))
            : 0;

      if (expectedLessons <= 0) {
        continue;
      }

      expectedByTeacher.set(teacherId, (expectedByTeacher.get(teacherId) || 0) + expectedLessons);
    }

    const assignedByTeacher = new Map<string, number>();
    for (const slot of timetable.grid || []) {
      const teacherId = slot.teacherId?.toString();
      const subjectId = slot.subjectId?.toString();

      if (!teacherId || !subjectId) {
        continue;
      }

      assignedByTeacher.set(teacherId, (assignedByTeacher.get(teacherId) || 0) + 1);
    }

    console.log('');
    console.log('=== AUDITORIA DE LOTAÇÃO x HORÁRIO GERADO ===');
    console.log(`Timetable: ${timetable._id}`);
    console.log(`Schedule : ${timetable.scheduleId}`);
    console.log(`User     : ${userId}`);
    console.log('');

    const rows = teachers
      .map((teacher) => {
        const teacherId = teacher._id.toString();
        const expected = expectedByTeacher.get(teacherId) || 0;
        const assigned = assignedByTeacher.get(teacherId) || 0;
        const deficit = expected - assigned;
        const status = expected === 0 ? 'SEM-BASE' : deficit > 0 ? 'FALTA' : 'OK';

        return {
          teacher: teacher.name,
          expected,
          assigned,
          deficit,
          status
        };
      })
      .sort((a, b) => b.deficit - a.deficit || a.teacher.localeCompare(b.teacher));

    for (const row of rows) {
      console.log(
        `${row.status.padEnd(8)} | ${row.teacher.padEnd(32)} | lotado=${String(row.expected).padStart(2)} | gerado=${String(row.assigned).padStart(2)} | falta=${String(Math.max(0, row.deficit)).padStart(2)}`
      );
    }

    const deficits = rows.filter((row) => row.status === 'FALTA');
    console.log('');

    if (deficits.length > 0) {
      console.log(`❌ Inconsistências encontradas: ${deficits.length} professor(es) com déficit.`);
      process.exitCode = 2;
      return;
    }

    console.log('✅ Nenhum déficit encontrado na auditoria.');
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('❌ Erro na auditoria:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
