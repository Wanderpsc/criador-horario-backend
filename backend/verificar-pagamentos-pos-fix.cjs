/**
 * verificar-pagamentos-pos-fix.cjs
 * Verifica o estado atual de ausências e pagamentos para cada professor
 * do sábado 25/04/2026, após a limpeza de duplicatas.
 * Mostra: ausências únicas, pagas, pendentes, e o que será criado pelo fix-retroactive.
 *
 * USO: node verificar-pagamentos-pos-fix.cjs
 */
'use strict';

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://wanderpsc:Wpsc2026@cluster0.auovj2m.mongodb.net/school-timetable';
const SCHOOL_ID   = '6948aa5c54a857ec2cf21a84';
const SAT_ID      = '69eb95ba0a95597a744d8386';
const SAT_DATE    = '2026-04-25';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('school-timetable');
    const makeupsCol  = db.collection('makeupsaturdays');
    const taCol       = db.collection('teacherattendances');
    const cpCol       = db.collection('classpayments');

    const saturday = await makeupsCol.findOne({ _id: require('mongodb').ObjectId.createFromHexString(SAT_ID) });
    if (!saturday) { console.log('❌ Sábado não encontrado'); return; }

    const schedule = saturday.schedule || {};
    const teacherSlots = new Map(); // teacherId → { name, slots[] }

    for (const [classId, slots] of Object.entries(schedule)) {
      for (const slot of (slots || [])) {
        if (!slot.confirmed || !slot.teacherId) continue;
        if (!teacherSlots.has(slot.teacherId)) {
          teacherSlots.set(slot.teacherId, { name: slot.teacherName || slot.teacherId, slots: [] });
        }
        teacherSlots.get(slot.teacherId).slots.push({ classId, period: slot.period, subjectId: slot.subjectId, subjectName: slot.subjectName });
      }
    }

    console.log(`\n📅 Sábado ${SAT_DATE} — ${teacherSlots.size} professores com slots confirmados`);
    console.log('═'.repeat(80));

    let grandTotalPaid = 0;
    let grandTotalToCreate = 0;

    for (const [teacherId, { name, slots }] of teacherSlots) {
      const totalSlots = slots.length;

      // Pagamentos já existentes para este professor
      const payments = await cpCol.find({ schoolId: SCHOOL_ID, absentTeacherId: teacherId }).toArray();
      const paidSet = new Set(payments.map(p => `${p.date}|${p.period}|${p.classId}|${p.subjectId}`));
      const paidCount = payments.length;

      // Ausências únicas até a data do sábado
      const taRecords = await taCol.find({
        schoolId: SCHOOL_ID, teacherId, date: { $lte: SAT_DATE }
      }).sort({ date: 1 }).toArray();

      const uniqueAbsences = [];
      const seenKeys = new Set();
      for (const rec of taRecords) {
        for (const cls of (rec.classes || [])) {
          if (cls.status !== 'absent') continue;
          const key = `${rec.date}|${cls.period}|${cls.classId}|${cls.subjectId}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueAbsences.push({ date: rec.date, period: cls.period, classId: cls.classId, subjectId: cls.subjectId, className: cls.className, subjectName: cls.subjectName });
          }
        }
      }

      const unpaidAbsences = uniqueAbsences.filter(a => !paidSet.has(`${a.date}|${a.period}|${a.classId}|${a.subjectId}`));
      const willCreate = Math.min(totalSlots - paidCount > 0 ? totalSlots - paidCount : 0, unpaidAbsences.length);
      // Mais preciso: contar quantos dos totalSlots ainda faltam criar
      // O fix-retroactive cria min(remaining_slots, unpaid_absences)
      // "remaining_slots" = totalSlots já que paidSet check é feito por ausência, não por contagem
      const toCreate = Math.min(unpaidAbsences.length, Math.max(0, totalSlots - paidCount));

      grandTotalPaid += paidCount;
      grandTotalToCreate += toCreate;

      const status = paidCount >= totalSlots ? '✅' : (paidCount === 0 ? '❌' : '⚠️');
      console.log(`\n${status} ${name}`);
      console.log(`   Slots no sábado   : ${totalSlots}`);
      console.log(`   Ausências únicas  : ${uniqueAbsences.length}`);
      console.log(`   Já pagas          : ${paidCount}`);
      console.log(`   Não pagas         : ${unpaidAbsences.length}`);
      console.log(`   Criar após fix    : ${toCreate}`);
      if (toCreate > 0) {
        console.log(`   Próximas ausências a abater:`);
        for (const a of unpaidAbsences.slice(0, toCreate)) {
          console.log(`     ${a.date} per.${a.period} ${a.className} / ${a.subjectName}`);
        }
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`📊 TOTAL pagamentos existentes : ${grandTotalPaid}`);
    console.log(`📊 TOTAL a criar (fix-retro)   : ${grandTotalToCreate}`);
    console.log(`📊 TOTAL após fix              : ${grandTotalPaid + grandTotalToCreate}`);
    console.log('\n⚠️  Após o deploy do Render (~2min), acesse o sábado 25/04 e clique em');
    console.log('   "⚠️ Pagamentos já Gerados" para criar os pagamentos faltantes.');

  } finally {
    await client.close();
  }
}

main().catch(err => { console.error('❌', err); process.exit(1); });
