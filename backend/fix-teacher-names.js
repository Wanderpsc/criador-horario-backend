const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority')
  .then(async () => {
    console.log('✅ Conectado ao MongoDB\n');
    
    const EmergencySchedule = mongoose.model('EmergencySchedule', new mongoose.Schema({}, { collection: 'emergencyschedules', strict: false }));
    const Teacher = mongoose.model('Teacher', new mongoose.Schema({}, { collection: 'teachers', strict: false }));
    
    // Buscar todos os professores
    const teachers = await Teacher.find({});
    const teacherMap = new Map(teachers.map(t => [t._id.toString(), t.name]));
    
    console.log(`👥 ${teachers.length} professores no banco\n`);
    
    // Buscar horários emergenciais sem nomes
    const schedules = await EmergencySchedule.find({});
    
    console.log(`📋 ${schedules.length} horário(s) emergencial(is) encontrado(s)\n`);
    
    let updated = 0;
    
    for (const schedule of schedules) {
      let needsUpdate = false;
      let names = [];
      
      // Verificar se absentTeachersNames está vazio ou é "N/A"
      if (!schedule.absentTeachersNames || schedule.absentTeachersNames === 'N/A') {
        console.log(`📝 Corrigindo horário ${schedule._id}:`);
        console.log(`   Data: ${schedule.date}`);
        console.log(`   IDs professores: ${JSON.stringify(schedule.absentTeacherIds)}`);
        
        // Buscar nomes dos professores
        if (schedule.absentTeacherIds && schedule.absentTeacherIds.length > 0) {
          schedule.absentTeacherIds.forEach(id => {
            const name = teacherMap.get(id.toString());
            if (name) {
              names.push(name);
            }
          });
          
          if (names.length > 0) {
            const namesStr = names.join(', ');
            console.log(`   Nomes encontrados: ${namesStr}`);
            
            await EmergencySchedule.updateOne(
              { _id: schedule._id },
              { $set: { absentTeachersNames: namesStr } }
            );
            
            updated++;
            needsUpdate = true;
          } else {
            console.log(`   ⚠️ Nenhum nome encontrado para esses IDs`);
          }
        } else {
          console.log(`   ⚠️ Sem IDs de professores ausentes`);
        }
        console.log('');
      }
    }
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Correção concluída!`);
    console.log(`   ${updated} horário(s) atualizado(s)`);
    console.log(`   ${schedules.length - updated} horário(s) já estava(m) correto(s)`);
    
    // Verificar resultado
    console.log(`\n🔍 Verificando resultado:\n`);
    const verifySchedules = await EmergencySchedule.find({}).sort({ createdAt: -1 });
    
    verifySchedules.forEach(s => {
      console.log(`   - ID: ${s._id}`);
      console.log(`     Data: ${s.date}`);
      console.log(`     Professores: ${s.absentTeachersNames || 'N/A'}`);
      console.log('');
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  });
