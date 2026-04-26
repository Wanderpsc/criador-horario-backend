/**
 * fix-sabado-pagamentos.cjs
 * 1. Diagnóstica o estado atual dos pagamentos do sábado 25/04
 * 2. Apaga pagamentos em excesso de Kátia (8→5) e Ricardo (6→5)
 * 3. Cria pagamentos faltando para Sandra, Maria Benedita, Carlos, Marilene
 *
 * USO: node fix-sabado-pagamentos.cjs [--dry-run]
 */
'use strict';

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://wanderpsc:Wpsc2026@cluster0.auovj2m.mongodb.net/school-timetable';
const SCHOOL_ID   = '6948aa5c54a857ec2cf21a84';
const SAT_ID      = '69eb95ba0a95597a744d8386';
const SAT_DATE    = '2026-04-25';
const SAT_LABEL   = '25/04/2026';
const SAT_NOTES   = `Reposto no sábado de reposição ${SAT_DATE}`;

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('school-timetable');
    const makeupsCol = db.collection('makeupsaturdays');
    const taCol      = db.collection('teacherattendances');
    const cpCol      = db.collection('classpayments');

    console.log(DRY_RUN ? '🔍 MODO DRY-RUN (nenhuma alteração será feita)\n' : '🔧 MODO FIX (alterações serão aplicadas)\n');

    // ─── Carregar o sábado ─────────────────────────────────────────────────────
    const saturday = await makeupsCol.findOne({ _id: ObjectId.createFromHexString(SAT_ID) });
    if (!saturday) { console.error('❌ Sábado não encontrado'); return; }

    // ─── Montar mapa de slots confirmados por professor ────────────────────────
    const schedule = saturday.schedule || {};
    const teacherSlots = new Map(); // teacherId → { name, count }
    for (const [, slots] of Object.entries(schedule)) {
      for (const slot of (slots || [])) {
        if (!slot.confirmed || !slot.teacherId) continue;
        if (!teacherSlots.has(slot.teacherId)) {
          teacherSlots.set(slot.teacherId, { name: slot.teacherName || slot.teacherId, count: 0 });
        }
        teacherSlots.get(slot.teacherId).count++;
      }
    }

    console.log(`📅 Sábado ${SAT_DATE}: ${teacherSlots.size} professores com slots confirmados`);
    console.log('═'.repeat(80));

    let totalDeleted = 0;
    let totalCreated = 0;

    for (const [teacherId, { name, count: slotsCount }] of teacherSlots) {
      // Pagamentos com nota do sábado 25/04
      const satPayments = await cpCol.find({
        schoolId: SCHOOL_ID, absentTeacherId: teacherId, notes: SAT_NOTES
      }).sort({ date: 1, period: 1 }).toArray();

      const alreadyHere = satPayments.length;

      // Pagamentos totais do professor
      const allPayments = await cpCol.find({
        schoolId: SCHOOL_ID, absentTeacherId: teacherId
      }).toArray();

      // Ausências únicas (após dedup) até a data do sábado
      const taRecords = await taCol.find({
        schoolId: SCHOOL_ID, teacherId, date: { $lte: SAT_DATE }
      }).sort({ date: 1 }).toArray();

      const seenAbs = new Set();
      const uniqueAbsences = [];
      for (const rec of taRecords) {
        for (const cls of (rec.classes || [])) {
          if (cls.status !== 'absent') continue;
          const key = `${rec.date}|${cls.period}|${cls.classId}|${cls.subjectId}`;
          if (!seenAbs.has(key)) {
            seenAbs.add(key);
            uniqueAbsences.push({ ...cls, date: rec.date });
          }
        }
      }

      const paidSet = new Set(allPayments.map(p => `${p.date}|${p.period}|${p.classId}|${p.subjectId}`));
      const unpaidAbsences = uniqueAbsences.filter(a => !paidSet.has(`${a.date}|${a.period}|${a.classId}|${a.subjectId}`));

      const excess = Math.max(0, alreadyHere - slotsCount);
      const toCreate = Math.max(0, slotsCount - alreadyHere);
      const canCreate = Math.min(toCreate, unpaidAbsences.length);

      const statusIcon = (excess > 0) ? '⚠️ EXCESSO' : (canCreate > 0 ? '❌ FALTANDO' : '✅');
      console.log(`\n${statusIcon} ${name}`);
      console.log(`   Slots no sábado       : ${slotsCount}`);
      console.log(`   Pagamentos Saturday   : ${alreadyHere}`);
      console.log(`   Pagamentos totais     : ${allPayments.length}`);
      console.log(`   Ausências únicas      : ${uniqueAbsences.length}`);
      console.log(`   Ausências não pagas   : ${unpaidAbsences.length}`);

      // ── APAGAR EXCESSO ───────────────────────────────────────────────────────
      if (excess > 0) {
        // Manter os 5 (slotsCount) mais ANTIGOS, apagar o restante
        const toDelete = satPayments.slice(slotsCount); // os mais recentes
        console.log(`   ⚠️  Apagando ${excess} pagamento(s) em excesso:`);
        for (const p of toDelete) {
          console.log(`      DELETE: ${p.date} per.${p.period} ${p.className} / ${p.subjectName}`);
          if (!DRY_RUN) {
            await cpCol.deleteOne({ _id: p._id });
            totalDeleted++;
          }
        }
        // Atualizar paidSet (remover os deletados)
        if (!DRY_RUN) {
          for (const p of toDelete) paidSet.delete(`${p.date}|${p.period}|${p.classId}|${p.subjectId}`);
        }
      }

      // ── CRIAR FALTANTES ──────────────────────────────────────────────────────
      if (canCreate > 0) {
        console.log(`   📝 Criando ${canCreate} pagamento(s) faltante(s):`);
        for (const abs of unpaidAbsences.slice(0, canCreate)) {
          const key = `${abs.date}|${abs.period}|${abs.classId}|${abs.subjectId}`;
          console.log(`      CREATE: ${abs.date} per.${abs.period} ${abs.className || abs.classId} / ${abs.subjectName || abs.subjectId}`);
          if (!DRY_RUN) {
            await cpCol.insertOne({
              schoolId: SCHOOL_ID,
              absentTeacherId: teacherId,
              absentTeacherName: name,
              substituteTeacherId: teacherId,
              substituteTeacherName: `Reposição (sáb. ${SAT_LABEL})`,
              date: abs.date,
              period: abs.period,
              classId: abs.classId,
              className: abs.className || '',
              subjectId: abs.subjectId,
              subjectName: abs.subjectName || '',
              status: 'paid',
              filledAt: new Date(SAT_DATE + 'T12:00:00'),
              notes: SAT_NOTES,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            totalCreated++;
            paidSet.add(key);
          }
        }
      }

      if (excess === 0 && canCreate === 0) {
        console.log(`   → Nenhuma ação necessária (${alreadyHere} pagamentos = correto)`);
      }
    }

    console.log('\n' + '═'.repeat(80));
    if (DRY_RUN) {
      console.log('🔍 DRY-RUN concluído. Nenhuma alteração foi feita.');
    } else {
      console.log(`✅ Fix concluído!`);
      console.log(`   Pagamentos apagados : ${totalDeleted}`);
      console.log(`   Pagamentos criados  : ${totalCreated}`);
    }

    // ── ESTADO FINAL ─────────────────────────────────────────────────────────
    console.log('\n📊 ESTADO FINAL (contagens Saturday por professor):');
    for (const [teacherId, { name, count: slotsCount }] of teacherSlots) {
      const satPmts = await cpCol.countDocuments({
        schoolId: SCHOOL_ID, absentTeacherId: teacherId, notes: SAT_NOTES
      });
      const total = await cpCol.countDocuments({
        schoolId: SCHOOL_ID, absentTeacherId: teacherId
      });
      const icon = satPmts === slotsCount ? '✅' : (satPmts < slotsCount ? '⚠️' : '❌');
      console.log(`   ${icon} ${name}: ${satPmts}/${slotsCount} Saturday | ${total} total`);
    }

  } finally {
    await client.close();
    console.log('\n🔌 Desconectado');
  }
}

main().catch(err => { console.error('❌', err); process.exit(1); });
