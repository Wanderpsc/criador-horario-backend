/**
 * dedup-teacher-attendance.cjs
 * Remove entradas duplicadas no array `classes` de documentos TeacherAttendance.
 * Uma "duplicata" é uma entrada com mesmo (period, classId, subjectId, status).
 * Mantém apenas a primeira ocorrência de cada combinação.
 *
 * USO: node dedup-teacher-attendance.cjs
 */
'use strict';

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://wanderpsc:Wpsc2026@cluster0.auovj2m.mongodb.net/school-timetable';
const SCHOOL_ID   = '6948aa5c54a857ec2cf21a84';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('✅ Conectado ao MongoDB');

    const db = client.db('school-timetable');
    const col = db.collection('teacherattendances');

    const docs = await col.find({ schoolId: SCHOOL_ID }).toArray();
    console.log(`📋 Total de documentos TeacherAttendance: ${docs.length}`);

    let totalDuplicatesRemoved = 0;
    let docsModified = 0;
    const summary = [];

    for (const doc of docs) {
      const classes = doc.classes || [];
      if (classes.length === 0) continue;

      const seen = new Set();
      const unique = [];
      const dups = [];

      for (const cls of classes) {
        // Chave inclui status para distinguir presente/ausente no mesmo slot
        const key = `${cls.period}|${cls.classId}|${cls.subjectId}|${cls.status}`;
        if (seen.has(key)) {
          dups.push(cls);
        } else {
          seen.add(key);
          unique.push(cls);
        }
      }

      if (dups.length > 0) {
        // Atualizar documento removendo as duplicatas
        await col.updateOne({ _id: doc._id }, { $set: { classes: unique } });
        totalDuplicatesRemoved += dups.length;
        docsModified++;
        summary.push({
          teacherName: doc.teacherName || doc.teacherId,
          date: doc.date,
          original: classes.length,
          unique: unique.length,
          dupsRemoved: dups.length,
        });
        console.log(`  🔧 ${doc.teacherName || doc.teacherId} [${doc.date}]: removido ${dups.length} dup(s) (${classes.length} → ${unique.length})`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`✅ Concluído!`);
    console.log(`   Documentos modificados : ${docsModified}`);
    console.log(`   Duplicatas removidas   : ${totalDuplicatesRemoved}`);
    if (summary.length > 0) {
      console.log('\nDetalhes por professor/data:');
      for (const s of summary) {
        console.log(`  ${s.teacherName} [${s.date}]: ${s.dupsRemoved} dup(s) removidas (${s.original}→${s.unique})`);
      }
    }
  } finally {
    await client.close();
    console.log('\n🔌 Desconectado do MongoDB');
  }
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
