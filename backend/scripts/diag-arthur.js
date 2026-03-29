require("dotenv").config();
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const cls = await db.collection("classes").findOne({name: /EMTPDES-SIS-3.*INTEGRAL-I-A/i});
  console.log("Class:", cls && cls.name, "ID:", cls && String(cls._id));

  const allDocs = await db.collection("generatedtimetables").find({
    userId: "6948aa5c54a857ec2cf21a84", title: "HORÁRIO 010"
  }).project({classId:1, title:1, slots:1, createdAt:1}).toArray();

  console.log("Total docs found:", allDocs.length);
  const doc = allDocs.find(function(d){ return String(d.classId) === String(cls._id); });
  if (!doc) {
    console.log("classIds in docs:", allDocs.map(function(d){ return String(d.classId); }));
    await mongoose.disconnect();
    return;
  }

  const slots = doc.slots || [];
  const p78 = slots.filter(function(s){ return s.period === 7 || s.period === 8; });
  const subjIds = Array.from(new Set(p78.map(function(s){ return String(s.subjectId); }).filter(Boolean)));
  const teacherIds = Array.from(new Set(p78.map(function(s){ return String(s.teacherId); }).filter(Boolean)));
  function toOid(id) { try { return new mongoose.Types.ObjectId(id); } catch(e){ return null; } }
  const subjects = await db.collection("subjects").find({_id: {$in: subjIds.map(toOid).filter(Boolean)}}).toArray();
  const teachers = await db.collection("teachers").find({_id: {$in: teacherIds.map(toOid).filter(Boolean)}}).toArray();
  const subjById = new Map(subjects.map(function(s){ return [String(s._id), s.name]; }));
  const teachById = new Map(teachers.map(function(t){ return [String(t._id), t.name]; }));

  const dayOrder = {"segunda":1,"terca":2,"quarta":3,"quinta":4,"sexta":5};
  function norm(d){ return String(d||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
  p78.sort(function(a,b){ const d=(dayOrder[norm(a.day)]||99)-(dayOrder[norm(b.day)]||99); return d!==0?d:a.period-b.period; });
  console.log("\n=== PERIODOS 7 e 8 NA TURMA EMTPDES-SIS-3 (HORARIO 010) ===");
  for (const s of p78) {
    console.log(s.day + " P" + s.period + ": " + (teachById.get(s.teacherId)||s.teacherId) + " | " + (subjById.get(s.subjectId)||s.subjectId));
  }
  console.log("\nTotal P7/P8:", p78.length);

  // Arthur analysis
  const arthur = await db.collection("teachers").findOne({name: /arthur/i, userId: "6948aa5c54a857ec2cf21a84"});
  if (arthur) {
    const arthurP78 = p78.filter(function(s){ return String(s.teacherId) === String(arthur._id); });
    console.log("\nArthur nos P7/P8:", arthurP78.length, "aulas");
    const others = p78.filter(function(s){ return String(s.teacherId) !== String(arthur._id); });
    console.log("OUTROS nos P7/P8:", others.length, "aulas");
    if (others.length > 0) {
      console.log("\nAulas de OUTROS professores em P7/P8 (bloqueando Arthur):");
      for (const s of others) {
        console.log("  " + s.day + " P" + s.period + ": " + (teachById.get(s.teacherId)||s.teacherId) + " | " + (subjById.get(s.subjectId)||s.subjectId));
      }
    }
  }

  // Show Arthur's subjects and expected hours
  console.log("\n=== VINCULOS ARTHUR ===");
  const arthurTeacher = await db.collection("teachers").findOne({name: /arthur/i, userId: "6948aa5c54a857ec2cf21a84"});
  const ts = await db.collection("teachersubjects").find({userId: "6948aa5c54a857ec2cf21a84", teacherId: String(arthurTeacher._id)}).toArray();
  let totalExpected = 0;
  for (const t of ts) {
    const subj = await db.collection("subjects").findOne({_id: new mongoose.Types.ObjectId(t.subjectId)});
    const hours = t.weeklyHours || (subj && (subj.weeklyHours || subj.workloadHours || subj.workload || subj.hours)) || 0;
    totalExpected += Number(hours) || 0;
    const allSlots = doc.slots.filter(function(s){ return String(s.teacherId)===String(arthurTeacher._id) && String(s.subjectId)===String(t.subjectId); });
    console.log("  " + (subj&&subj.name) + ": esperado=" + hours + " alocado=" + allSlots.length + (Number(hours)-allSlots.length>0?" DEFICIT="+(Number(hours)-allSlots.length):""));
  }
  console.log("Total esperado Arthur:", totalExpected);

  await mongoose.disconnect();
}).catch(function(e){ console.error(e.message); process.exit(1); });
