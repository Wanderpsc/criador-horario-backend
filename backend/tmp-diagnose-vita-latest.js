require('dotenv').config();
const mongoose = require('mongoose');

function getMapValue(mapLike, key) {
  if (!mapLike) return undefined;
  if (typeof mapLike.get === 'function') return mapLike.get(key);
  return mapLike[key];
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const latest = await db.collection('generatedtimetables').find({}).sort({ createdAt: -1 }).limit(1).toArray();
  if (!latest[0]) throw new Error('Sem horários salvos');
  const { title, scheduleId, school, createdAt } = latest[0];
  const setDocs = await db.collection('generatedtimetables').find({ title, scheduleId, school }).toArray();

  const teacher = await db.collection('teachers').findOne({ name: { $regex: /vitanilce/i } });
  const teacherId = String(teacher._id);

  const classIds = [...new Set(setDocs.map(d => d.classId))];
  const classes = await db.collection('classes').find({ _id: { $in: classIds.map(id => new mongoose.Types.ObjectId(id)) } }).toArray();
  const classById = new Map(classes.map(c => [String(c._id), c]));

  const tsList = await db.collection('teachersubjects').find({ teacherId, classId: { $in: classIds } }).toArray();
  const subjectIds = [...new Set(tsList.map(ts => ts.subjectId))];
  const subjects = await db.collection('subjects').find({ _id: { $in: subjectIds.map(id => new mongoose.Types.ObjectId(id)) } }).toArray();
  const subjectById = new Map(subjects.map(s => [String(s._id), s]));

  const allSlots = setDocs.flatMap(d => d.slots || []);

  const rows = [];
  let totalExpected = 0;
  let totalGenerated = 0;

  for (const ts of tsList) {
    const classId = String(ts.classId);
    const subjectId = String(ts.subjectId);
    const cls = classById.get(classId);
    const sub = subjectById.get(subjectId);
    if (!cls || !sub) continue;

    let expected = ts.weeklyHours;
    if (expected === undefined || expected === null) {
      const classHours = getMapValue(cls.subjectWeeklyHours, subjectId);
      expected = classHours ?? sub.weeklyHours ?? 2;
    }
    expected = Number(expected) || 0;

    const generated = allSlots.filter(s => s.classId===classId && s.subjectId===subjectId && s.teacherId===teacherId).length;
    totalExpected += expected;
    totalGenerated += generated;

    rows.push({
      className: cls.name,
      subject: sub.name,
      tsWeekly: ts.weeklyHours,
      classWeekly: getMapValue(cls.subjectWeeklyHours, subjectId),
      subjectWeekly: sub.weeklyHours,
      expected,
      generated,
      deficit: expected - generated
    });
  }

  console.log({ title, scheduleId, school, createdAt, expected: totalExpected, generated: totalGenerated, deficit: totalExpected-totalGenerated });
  console.table(rows.sort((a,b)=>b.deficit-a.deficit));

  await mongoose.disconnect();
})();
