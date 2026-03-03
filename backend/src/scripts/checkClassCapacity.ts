import dotenv from 'dotenv';
import mongoose from 'mongoose';
import TeacherSubject from '../models/TeacherSubject';
import Class from '../models/Class';
import Subject from '../models/Subject';

dotenv.config();

const getClassSubjectHours = (classItem: any, subjectId: string): number | undefined => {
  if (!classItem?.subjectWeeklyHours) return undefined;
  const subjectWeeklyHours = classItem.subjectWeeklyHours;
  if (subjectWeeklyHours instanceof Map) return subjectWeeklyHours.get(subjectId);
  if (typeof subjectWeeklyHours.get === 'function') return subjectWeeklyHours.get(subjectId);
  return subjectWeeklyHours[subjectId];
};

async function run(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI não configurado.');
  }

  await mongoose.connect(mongoUri);
  try {
    const classNames = [
      '9º Ano EFR-FUND IIANOS FINAIS INT-9º ANO-I-A',
      '9º Ano EFR-FUND IIANOS FINAIS INT-9º ANO-I-B',
      '3ª Série EMTPDES-SIS-3ª SERIE - INTEGRAL-I-A'
    ];

    const classes = await Class.find({ name: { $in: classNames } }).lean();
    if (classes.length === 0) {
      console.log('Nenhuma turma alvo encontrada nesta base.');
      return;
    }

    const classIds = classes.map((item: any) => String(item._id));
    const teacherSubjects = await TeacherSubject.find({ classId: { $in: classIds } }).lean();

    const subjectIds = Array.from(
      new Set(
        (teacherSubjects as any[])
          .map((association) => String(association.subjectId || ''))
          .filter(Boolean)
      )
    );
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).lean();
    const subjectById = new Map(subjects.map((subjectItem: any) => [String(subjectItem._id), subjectItem]));
    const classById = new Map(classes.map((classItem: any) => [String(classItem._id), classItem]));

    for (const classItem of classes as any[]) {
      const classId = String(classItem._id);
      const associations = (teacherSubjects as any[]).filter((association) => String(association.classId) === classId);

      let totalExpected = 0;
      const rows: Array<{ teacherId: string; subjectId: string; expected: number }> = [];

      for (const association of associations) {
        const subjectId = String(association.subjectId || '');
        const subject = subjectById.get(subjectId);

        let expectedHours: number | undefined =
          association.weeklyHours !== undefined && association.weeklyHours !== null
            ? Number(association.weeklyHours)
            : undefined;

        if (expectedHours === undefined || Number.isNaN(expectedHours)) {
          const classHours = getClassSubjectHours(classById.get(classId), subjectId);
          if (classHours !== undefined && classHours !== null) {
            expectedHours = Number(classHours);
          } else if (subject?.weeklyHours !== undefined && subject?.weeklyHours !== null) {
            expectedHours = Number(subject.weeklyHours);
          } else {
            expectedHours = 2;
          }
        }

        const normalizedExpected = Math.max(0, Math.floor(expectedHours));
        totalExpected += normalizedExpected;
        rows.push({
          teacherId: String(association.teacherId || ''),
          subjectId,
          expected: normalizedExpected
        });
      }

      console.log('');
      console.log(`Turma: ${classItem.name}`);
      console.log(`Carga esperada total: ${totalExpected} / capacidade 40`);
      if (totalExpected > 40) {
        console.log(`⚠️ Excesso estrutural: +${totalExpected - 40} aula(s)`);
      } else {
        console.log('✅ Capacidade semanal compatível com 40 slots.');
      }
    }
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('❌ Erro:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
