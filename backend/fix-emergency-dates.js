const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority')
  .then(async () => {
    console.log('✅ Conectado ao MongoDB\n');
    console.log('🔧 CORRIGINDO DATAS DOS HORÁRIOS EMERGENCIAIS\n');
    
    const EmergencySchedule = mongoose.model('EmergencySchedule', new mongoose.Schema({}, { collection: 'emergencyschedules', strict: false }));
    
    // Buscar todos os horários
    const allSchedules = await EmergencySchedule.find({});
    
    console.log(`📋 ${allSchedules.length} horário(s) encontrado(s)\n`);
    
    let corrected = 0;
    
    for (const schedule of allSchedules) {
      let needsUpdate = false;
      let normalizedDate;
      
      // Verificar se precisa corrigir
      if (typeof schedule.date === 'string') {
        // Se não está em formato ISO, precisa corrigir
        if (!schedule.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const dateObj = new Date(schedule.date);
          normalizedDate = dateObj.toISOString().split('T')[0];
          needsUpdate = true;
          
          console.log(`📝 Corrigindo horário ${schedule._id}:`);
          console.log(`   Antes: "${schedule.date}"`);
          console.log(`   Depois: "${normalizedDate}"`);
        }
      } else if (schedule.date instanceof Date) {
        // Se é Date object, converter para string ISO
        normalizedDate = schedule.date.toISOString().split('T')[0];
        needsUpdate = true;
        
        console.log(`📝 Corrigindo horário ${schedule._id}:`);
        console.log(`   Antes: ${schedule.date} (Date object)`);
        console.log(`   Depois: "${normalizedDate}" (String ISO)`);
      }
      
      if (needsUpdate) {
        await EmergencySchedule.updateOne(
          { _id: schedule._id },
          { $set: { date: normalizedDate } }
        );
        corrected++;
      }
    }
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Correção concluída!`);
    console.log(`   ${corrected} horário(s) corrigido(s)`);
    console.log(`   ${allSchedules.length - corrected} horário(s) já estava(m) correto(s)`);
    
    // Verificar resultado
    console.log(`\n🔍 Verificando resultado:\n`);
    const updated = await EmergencySchedule.find({}).sort({ createdAt: -1 });
    
    updated.forEach(s => {
      console.log(`   - ID: ${s._id}`);
      console.log(`     Data: "${s.date}" (tipo: ${typeof s.date})`);
      console.log(`     ISO? ${s.date.match(/^\d{4}-\d{2}-\d{2}$/) ? '✅ SIM' : '❌ NÃO'}`);
      console.log('');
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  });
