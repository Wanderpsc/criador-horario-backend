import dotenv from 'dotenv';
import mongoose from 'mongoose';
import GeneratedTimetable from '../models/GeneratedTimetable';
import TeacherSubject from '../models/TeacherSubject';
import Teacher from '../models/Teacher';
import Subject from '../models/Subject';
import Class from '../models/Class';

dotenv.config();

const title = process.argv.find((arg) => arg.startsWith('--title='))?.slice('--title='.length) || 'HORÁRIO 002 - 03-03-2026';

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

const keyOf = (classId: string, subjectId: string, teacherId: string): string => `${classId}|${subjectId}|${teacherId}`;

async function run(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI não configurado.');
  }

  await mongoose.connect(mongoUri);

  try {
    const docs = await GeneratedTimetable.find({ title }).sort({ createdAt: -1 }).lean();
    if (docs.length === 0) {
      throw new Error(`Nenhum GeneratedTimetable encontrado para título: ${title}`);
    }

    const latestCreatedAt = docs[0].createdAt;
    const timeWindowStart = new Date(new Date(latestCreatedAt).getTime() - 120000);
    const batchDocs = docs.filter((doc: any) => new Date(doc.createdAt) >= timeWindowStart);

    const classIds = Array.from(new Set(batchDocs.map((doc: any) => String(doc.classId))));
    const userId = String(batchDocs[0].userId || '');

    const [teacherSubjects, teachers, subjects, classes] = await Promise.all([
      TeacherSubject.find({ userId, classId: { $in: classIds } }).lean(),
      Teacher.find({ userId }).lean(),
      Subject.find({ userId }).lean(),
      Class.find({ _id: { $in: classIds } }).lean()
    ]);

    const classById = new Map(classes.map((classItem: any) => [String(classItem._id), classItem]));
    const teacherById = new Map(teachers.map((teacher: any) => [String(teacher._id), teacher]));
    const subjectById = new Map(subjects.map((subject: any) => [String(subject._id), subject]));

    const classIdByName = new Map(classes.map((classItem: any) => [String(classItem.name), String(classItem._id)]));
    const teacherIdByName = new Map(teachers.map((teacher: any) => [String(teacher.name), String(teacher._id)]));
    const subjectIdByName = new Map(subjects.map((subject: any) => [String(subject.name), String(subject._id)]));

    const expectedAllocation = new Map<string, number>();
    for (const association of teacherSubjects as any[]) {
      if (!association.classId || !association.subjectId || !association.teacherId) {
        continue;
      }

      const classId = String(association.classId);
      const subjectId = String(association.subjectId);
      const teacherId = String(association.teacherId);
      const classItem = classById.get(classId);
      const subjectItem = subjectById.get(subjectId);
      if (!classItem || !subjectItem) {
        continue;
      }

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
      const key = keyOf(classId, subjectId, teacherId);
      expectedAllocation.set(key, (expectedAllocation.get(key) || 0) + normalizedExpected);
    }

    const generatedAllocation = new Map<string, number>();
    for (const doc of batchDocs as any[]) {
      const slots = Array.isArray(doc.slots) ? doc.slots : [];
      for (const slot of slots) {
        const classId = String(slot.classId || doc.classId || '');
        const subjectId = String(slot.subjectId || '');
        const teacherId = String(slot.teacherId || '');
        if (!classId || !subjectId || !teacherId) {
          continue;
        }

        const key = keyOf(classId, subjectId, teacherId);
        generatedAllocation.set(key, (generatedAllocation.get(key) || 0) + 1);
      }
    }

    const targets: Array<[string, string, string]> = [
      ['9º Ano EFR-FUND IIANOS FINAIS INT-9º ANO-I-A', 'Vitanilce Gomes Lustosa Carvalho', 'HORÁRIO DE ESTUDO'],
      ['9º Ano EFR-FUND IIANOS FINAIS INT-9º ANO-I-A', 'Gedismar Guimarães Lustosa', 'LÍNGUA PORTUGUESA'],
      ['3ª Série EMTPDES-SIS-3ª SERIE - INTEGRAL-I-A', 'Arthur Carvalho Rodrigues', 'PROJETO INTEGRADOR']
    ];

    console.log('');
    console.log(`=== INSPEÇÃO DE DÉFICITS (${title}) ===`);

    for (const [className, teacherName, subjectName] of targets) {
      const classId = classIdByName.get(className);
      const teacherId = teacherIdByName.get(teacherName);
      const subjectId = subjectIdByName.get(subjectName);

      if (!classId || !teacherId || !subjectId) {
        console.log(`❌ Não encontrado: ${className} | ${teacherName} | ${subjectName}`);
        continue;
      }

      const targetKey = keyOf(classId, subjectId, teacherId);
      const expected = expectedAllocation.get(targetKey) || 0;
      const generated = generatedAllocation.get(targetKey) || 0;
      const deficit = Math.max(0, expected - generated);

      console.log(`\n- ${className}`);
      console.log(`  ${teacherName} (${subjectName}) => ${generated}/${expected} | déficit=${deficit}`);

      const excesses = Array.from(expectedAllocation.entries())
        .map(([allocationKey, expectedHours]) => {
          const [entryClassId, entrySubjectId, entryTeacherId] = allocationKey.split('|');
          const generatedHours = generatedAllocation.get(allocationKey) || 0;

          return {
            entryClassId,
            entrySubjectId,
            entryTeacherId,
            expectedHours,
            generatedHours,
            extra: Math.max(0, generatedHours - expectedHours)
          };
        })
        .filter((entry) => entry.entryClassId === classId && entry.extra > 0)
        .sort((a, b) => b.extra - a.extra);

      if (excesses.length === 0) {
        console.log('  Sem excessos alocados nesta turma para troca direta.');
      } else {
        console.log('  Excessos na mesma turma (candidatos a swap):');
        for (const item of excesses) {
          const excessTeacher = teacherById.get(item.entryTeacherId);
          const excessSubject = subjectById.get(item.entrySubjectId);
          console.log(
            `    +${item.extra} | ${(excessTeacher as any)?.name || item.entryTeacherId} | ${(excessSubject as any)?.name || item.entrySubjectId} (${item.generatedHours}/${item.expectedHours})`
          );
        }
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
