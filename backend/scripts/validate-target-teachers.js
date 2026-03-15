require('dotenv').config();
const mongoose = require('mongoose');

const getArg = (name) => {
  const prefix = `--${name}=`;
  const item = process.argv.find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : undefined;
};

const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeName = (value) => normalize(value).replace(/\s+/g, ' ');

const normalizeDayKey = (value) => normalize(value);

const getDayAliases = (dayValue, availabilityKeys) => {
  const normalized = normalizeDayKey(dayValue);
  const aliases = {
    segunda: ['segunda', 'segunda-feira', 'seg', 'monday', 'mon'],
    terca: ['terca', 'terca-feira', 'ter', 'tuesday', 'tue'],
    quarta: ['quarta', 'quarta-feira', 'qua', 'wednesday', 'wed'],
    quinta: ['quinta', 'quinta-feira', 'qui', 'thursday', 'thu'],
    sexta: ['sexta', 'sexta-feira', 'sex', 'friday', 'fri']
  };

  const dayIndexByAlias = {
    segunda: 0,
    terca: 1,
    quarta: 2,
    quinta: 3,
    sexta: 4
  };

  const resolvedAliases = aliases[normalized] ? [...aliases[normalized]] : [normalized];
  const dayIndex = dayIndexByAlias[normalized];

  if (dayIndex === undefined || availabilityKeys.size === 0) {
    return resolvedAliases;
  }

  const numericKeys = Array.from(availabilityKeys)
    .map((key) => Number(key))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 7);

  if (numericKeys.length === 0) {
    return resolvedAliases;
  }

  const hasZero = numericKeys.includes(0);
  const hasSeven = numericKeys.includes(7);

  let numericAlias;
  if (hasZero && !hasSeven) {
    numericAlias = String(dayIndex);
  } else if (hasSeven && !hasZero) {
    numericAlias = String(dayIndex + 1);
  } else {
    const oneBasedHints = numericKeys.filter((value) => value >= 1 && value <= 7).length;
    const zeroBasedHints = numericKeys.filter((value) => value >= 0 && value <= 6).length;
    numericAlias = oneBasedHints >= zeroBasedHints ? String(dayIndex + 1) : String(dayIndex);
  }

  resolvedAliases.push(numericAlias);
  return resolvedAliases;
};

const isTeacherAvailableStrict = (teacher, day, period) => {
  const rawAvailability = teacher && teacher.availability;
  if (!rawAvailability || typeof rawAvailability !== 'object') {
    return true;
  }

  const normalizedAvailability = new Map();
  let hasStructuredAvailability = false;

  for (const [key, value] of Object.entries(rawAvailability)) {
    if (!value || typeof value !== 'object' || Object.keys(value).length === 0) {
      continue;
    }

    normalizedAvailability.set(normalizeDayKey(key), value);
    hasStructuredAvailability = true;
  }

  if (!hasStructuredAvailability) {
    return true;
  }

  const availabilityKeys = new Set(normalizedAvailability.keys());
  for (const dayAlias of getDayAliases(day, availabilityKeys)) {
    const dayAvailability = normalizedAvailability.get(dayAlias);
    if (!dayAvailability || Object.keys(dayAvailability).length === 0) {
      continue;
    }

    if (dayAvailability[period] !== undefined) {
      return Boolean(dayAvailability[period]);
    }

    if (dayAvailability[period + 1] !== undefined) {
      return Boolean(dayAvailability[period + 1]);
    }

    if (dayAvailability[String(period)] !== undefined) {
      return Boolean(dayAvailability[String(period)]);
    }

    if (dayAvailability[String(period + 1)] !== undefined) {
      return Boolean(dayAvailability[String(period + 1)]);
    }
  }

  return false;
};

const dayOrder = {
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6
};

const getPositiveNumber = (...values) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 0;
};

const getClassSubjectHours = (classItem, subjectId) => {
  if (!classItem || !classItem.subjectWeeklyHours) {
    return undefined;
  }

  const weekly = classItem.subjectWeeklyHours;
  if (weekly instanceof Map) {
    return weekly.get(subjectId);
  }

  if (typeof weekly.get === 'function') {
    return weekly.get(subjectId);
  }

  return weekly[subjectId];
};

const defaultTokens = ['vitanilce', 'gean', 'nara', 'ionize', 'joao', 'arthur'];

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI nao configurado.');
  }

  const userId = getArg('userId') || '6948aa5c54a857ec2cf21a84';
  const titleArg = getArg('title');
  const namesArg = getArg('names');
  const tokens = namesArg
    ? namesArg.split(',').map((item) => normalizeName(item)).filter(Boolean)
    : defaultTokens;

  await mongoose.connect(mongoUri);
  try {
    const db = mongoose.connection.db;

    const teachers = await db
      .collection('teachers')
      .find({ userId })
      .project({ _id: 1, name: 1, availability: 1 })
      .toArray();

    const selectedTeachers = teachers.filter((teacher) => {
      const name = normalizeName(teacher.name);
      return tokens.some((token) => name.includes(token));
    });

    if (selectedTeachers.length === 0) {
      throw new Error('Nenhum professor alvo encontrado para o userId informado.');
    }

    let title = titleArg;
    if (!title) {
      const docsMeta = await db
        .collection('generatedtimetables')
        .find({ userId })
        .project({ title: 1, createdAt: 1 })
        .toArray();

      if (!docsMeta.length) {
        throw new Error('Nenhum generated timetable encontrado para o usuario informado.');
      }

      docsMeta.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      title = docsMeta[0].title;
    }

    const docs = await db
      .collection('generatedtimetables')
      .find({ userId, title })
      .project({ classId: 1, slots: 1, createdAt: 1 })
      .toArray();

    if (!docs.length) {
      throw new Error(`Nenhum generated timetable encontrado com titulo: ${title}`);
    }

    const slots = [];
    let maxPeriod = 0;
    for (const doc of docs) {
      const docSlots = Array.isArray(doc.slots) ? doc.slots : [];
      for (const slot of docSlots) {
        const periodNumber = Number(slot.period || 0);
        maxPeriod = Math.max(maxPeriod, periodNumber);
        slots.push({
          teacherId: String(slot.teacherId || ''),
          subjectId: String(slot.subjectId || ''),
          classId: String(slot.classId || doc.classId || ''),
          day: String(slot.day || ''),
          period: periodNumber
        });
      }
    }

    const classIds = Array.from(new Set(docs.map((doc) => String(doc.classId || '')))).filter(Boolean);
    const teacherIds = selectedTeachers.map((teacher) => String(teacher._id));

    const teacherSubjects = await db
      .collection('teachersubjects')
      .find({ userId, classId: { $in: classIds }, teacherId: { $in: teacherIds } })
      .project({ classId: 1, subjectId: 1, teacherId: 1, weeklyHours: 1 })
      .toArray();

    const subjectIds = Array.from(new Set(teacherSubjects.map((item) => String(item.subjectId || '')))).filter(Boolean);

    const [subjects, classes] = await Promise.all([
      db
        .collection('subjects')
        .find({ userId, _id: { $in: subjectIds.map((id) => new mongoose.Types.ObjectId(id)) } })
        .project({ _id: 1, weeklyHours: 1, workloadHours: 1, workload: 1, hours: 1 })
        .toArray(),
      db
        .collection('classes')
        .find({ _id: { $in: classIds.map((id) => new mongoose.Types.ObjectId(id)) } })
        .project({ _id: 1, subjectWeeklyHours: 1 })
        .toArray()
    ]);

    const subjectById = new Map(subjects.map((subject) => [String(subject._id), subject]));
    const classById = new Map(classes.map((classItem) => [String(classItem._id), classItem]));

    const expectedByTeacher = new Map();
    for (const association of teacherSubjects) {
      const teacherId = String(association.teacherId || '');
      const subjectId = String(association.subjectId || '');
      const classId = String(association.classId || '');
      if (!teacherId || !subjectId || !classId) continue;

      const classItem = classById.get(classId);
      const subjectItem = subjectById.get(subjectId);

      let expectedHours = getPositiveNumber(association.weeklyHours);
      if (expectedHours <= 0) {
        expectedHours = getPositiveNumber(
          getClassSubjectHours(classItem, subjectId),
          subjectItem && subjectItem.weeklyHours,
          subjectItem && subjectItem.workloadHours,
          subjectItem && subjectItem.workload,
          subjectItem && subjectItem.hours
        );
      }

      if (expectedHours > 0) {
        expectedByTeacher.set(teacherId, (expectedByTeacher.get(teacherId) || 0) + expectedHours);
      }
    }

    console.log('');
    console.log('=== VALIDACAO DE DISPONIBILIDADE (ALVOS) ===');
    console.log(`UserId: ${userId}`);
    console.log(`Titulo: ${title}`);
    console.log(`Registros (turmas): ${docs.length}`);
    console.log(`Aulas totais no titulo: ${slots.length}`);

    let totalViolations = 0;

    for (const teacher of selectedTeachers.sort((a, b) => String(a.name).localeCompare(String(b.name)))) {
      const teacherId = String(teacher._id);
      const teacherSlots = slots
        .filter((slot) => slot.teacherId === teacherId)
        .sort((a, b) => {
          const dayCmp = (dayOrder[normalizeDayKey(a.day)] || 99) - (dayOrder[normalizeDayKey(b.day)] || 99);
          if (dayCmp !== 0) return dayCmp;
          return a.period - b.period;
        });

      const violations = teacherSlots.filter((slot) => !isTeacherAvailableStrict(teacher, slot.day, slot.period));
      totalViolations += violations.length;

      const expectedLoad = expectedByTeacher.get(teacherId) || 0;
      const totalPeriods = maxPeriod > 0 ? maxPeriod : 8;
      let availableSlots = 0;
      for (const dayKey of ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']) {
        for (let period = 1; period <= totalPeriods; period++) {
          if (isTeacherAvailableStrict(teacher, dayKey, period)) {
            availableSlots++;
          }
        }
      }
      const overrideNeeded = expectedLoad > 0 && expectedLoad > availableSlots;

      const byDay = {};
      for (const slot of teacherSlots) {
        const dayKey = normalizeDayKey(slot.day);
        byDay[dayKey] = (byDay[dayKey] || 0) + 1;
      }

      const daySummary = Object.entries(byDay)
        .sort((a, b) => (dayOrder[a[0]] || 99) - (dayOrder[b[0]] || 99))
        .map(([day, count]) => `${day}:${count}`)
        .join(' | ');

      console.log('');
      console.log(`Professor: ${teacher.name}`);
      console.log(`Aulas geradas: ${teacherSlots.length}`);
      console.log(`Carga estimada lotada: ${expectedLoad}`);
      console.log(`Slots disponiveis na agenda: ${availableSlots}`);
      console.log(`Override inevitavel: ${overrideNeeded ? 'SIM' : 'NAO'}`);
      console.log(`Violacoes de disponibilidade: ${violations.length}`);
      console.log(`Distribuicao por dia: ${daySummary || 'sem aulas'}`);

      if (violations.length > 0) {
        console.log('Detalhes (dia/periodo/turma):');
        for (const item of violations.slice(0, 20)) {
          console.log(`- ${item.day} P${item.period} turma=${item.classId}`);
        }
      }
    }

    console.log('');
    console.log(`TOTAL_VIOLACOES_ALVOS: ${totalViolations}`);
    console.log(totalViolations === 0 ? 'STATUS: OK' : 'STATUS: COM_VIOLACOES');
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('ERRO:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
