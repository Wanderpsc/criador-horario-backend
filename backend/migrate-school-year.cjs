/**
 * Migração: adiciona campo schoolYear a todos os documentos existentes
 * - TeacherAttendance: deriva do campo date (string YYYY-MM-DD)
 * - ClassPayment: deriva do campo date (string YYYY-MM-DD)
 * - MakeupSaturday: deriva do campo date (Date)
 * - SchoolDay: deriva do campo date (Date)
 * - TeacherSubject: padrão 2026 (não tem campo de data)
 * - GeneratedTimetable: padrão 2026 (não tem campo de data confiável)
 *
 * Também:
 * - Dropa o índice antigo { teacherId, subjectId, classId } do TeacherSubject
 *   (será substituído por { teacherId, subjectId, classId, schoolYear })
 *
 * Execução: node backend/migrate-school-year.cjs
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb+srv://wanderpsc:Wpsc2026@cluster0.auovj2m.mongodb.net/school-timetable';

async function run() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log('✅ Conectado ao MongoDB');

  const db = client.db('school-timetable');

  // ─── 1. TeacherAttendance ───────────────────────────────────────────────
  console.log('\n📅 Migrando TeacherAttendance...');
  const taResult = await db.collection('teacherattendances').updateMany(
    { schoolYear: { $exists: false } },
    [
      {
        $set: {
          schoolYear: {
            $year: {
              $dateFromString: { dateString: '$date' }
            }
          }
        }
      }
    ]
  );
  console.log(`   Atualizados: ${taResult.modifiedCount} documentos`);

  // ─── 2. ClassPayment ───────────────────────────────────────────────────
  console.log('\n💰 Migrando ClassPayment...');
  const cpResult = await db.collection('classpayments').updateMany(
    { schoolYear: { $exists: false } },
    [
      {
        $set: {
          schoolYear: {
            $year: {
              $dateFromString: { dateString: '$date' }
            }
          }
        }
      }
    ]
  );
  console.log(`   Atualizados: ${cpResult.modifiedCount} documentos`);

  // ─── 3. MakeupSaturday ─────────────────────────────────────────────────
  console.log('\n📆 Migrando MakeupSaturday...');
  const msResult = await db.collection('makeupsaturdays').updateMany(
    { schoolYear: { $exists: false } },
    [
      {
        $set: {
          schoolYear: { $year: '$date' }
        }
      }
    ]
  );
  console.log(`   Atualizados: ${msResult.modifiedCount} documentos`);

  // ─── 4. SchoolDay ──────────────────────────────────────────────────────
  console.log('\n🏫 Migrando SchoolDay...');
  const sdResult = await db.collection('schooldays').updateMany(
    { schoolYear: { $exists: false } },
    [
      {
        $set: {
          schoolYear: { $year: '$date' }
        }
      }
    ]
  );
  console.log(`   Atualizados: ${sdResult.modifiedCount} documentos`);

  // ─── 5. TeacherSubject ─────────────────────────────────────────────────
  console.log('\n👩‍🏫 Migrando TeacherSubject...');
  const tsResult = await db.collection('teachersubjects').updateMany(
    { schoolYear: { $exists: false } },
    { $set: { schoolYear: 2026 } }
  );
  console.log(`   Atualizados: ${tsResult.modifiedCount} documentos`);

  // Dropar índice antigo para permitir o novo com schoolYear
  console.log('\n🔧 Atualizando índice único de TeacherSubject...');
  try {
    await db.collection('teachersubjects').dropIndex('teacherId_1_subjectId_1_classId_1');
    console.log('   Índice antigo "teacherId_1_subjectId_1_classId_1" removido.');
  } catch (e) {
    if (e.codeName === 'IndexNotFound' || e.message.includes('index not found')) {
      console.log('   Índice antigo não encontrado (já removido ou não existe). OK.');
    } else {
      console.warn('   Aviso ao dropar índice:', e.message);
    }
  }
  console.log('   Novo índice com schoolYear será criado automaticamente pelo Mongoose na próxima inicialização.');

  // ─── 6. GeneratedTimetable ────────────────────────────────────────────
  console.log('\n📋 Migrando GeneratedTimetable...');
  const gtResult = await db.collection('generatedtimetables').updateMany(
    { schoolYear: { $exists: false } },
    { $set: { schoolYear: 2026 } }
  );
  console.log(`   Atualizados: ${gtResult.modifiedCount} documentos`);

  // ─── Sumário ──────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('✅ Migração concluída!');
  console.log(`   TeacherAttendance: ${taResult.modifiedCount}`);
  console.log(`   ClassPayment:      ${cpResult.modifiedCount}`);
  console.log(`   MakeupSaturday:    ${msResult.modifiedCount}`);
  console.log(`   SchoolDay:         ${sdResult.modifiedCount}`);
  console.log(`   TeacherSubject:    ${tsResult.modifiedCount}`);
  console.log(`   GeneratedTimetable: ${gtResult.modifiedCount}`);
  console.log('═══════════════════════════════════════\n');

  await client.close();
}

run().catch(err => {
  console.error('❌ Erro na migração:', err);
  process.exit(1);
});
