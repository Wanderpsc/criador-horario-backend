const mongoose = require('mongoose');

// Conectar ao MongoDB
mongoose.connect('mongodb://localhost:27017/school-schedule', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado ao MongoDB'))
.catch(err => console.error('❌ Erro ao conectar:', err));

// Schema simplificado
const EmergencyScheduleSchema = new mongoose.Schema({}, { strict: false });
const EmergencySchedule = mongoose.model('EmergencySchedule', EmergencyScheduleSchema);

async function cleanInvalidMakeupClasses() {
  try {
    console.log('\n🔍 Buscando horários emergenciais...');
    
    const schedules = await EmergencySchedule.find({});
    console.log(`📋 Total de horários encontrados: ${schedules.length}`);
    
    let totalCleaned = 0;
    
    for (const schedule of schedules) {
      const originalCount = schedule.makeupClasses?.length || 0;
      
      if (originalCount === 0) {
        console.log(`\n⏭️  Horário "${schedule.title}" - sem makeupClasses`);
        continue;
      }
      
      // Filtrar apenas makeupClasses válidos
      const validMakeupClasses = (schedule.makeupClasses || []).filter(makeup => {
        // Remover se não tem classId, subjectId, ou é "N/A"
        if (!makeup.classId || !makeup.subjectId) return false;
        if (makeup.subjectName?.includes('N/A')) return false;
        if (makeup.subjectName?.includes('Não tinha aula neste dia')) return false;
        if (makeup.className === 'N/A') return false;
        return true;
      });
      
      const removedCount = originalCount - validMakeupClasses.length;
      
      if (removedCount > 0) {
        console.log(`\n📋 Horário: ${schedule.title || 'Sem título'}`);
        console.log(`   📅 Data: ${schedule.date}`);
        console.log(`   ❌ Removendo ${removedCount} makeupClass(es) inválido(s)`);
        console.log(`   ✅ Mantendo ${validMakeupClasses.length} makeupClass(es) válido(s)`);
        
        schedule.makeupClasses = validMakeupClasses;
        await schedule.save();
        totalCleaned += removedCount;
      } else {
        console.log(`\n✓ Horário "${schedule.title}" - OK (${originalCount} válidos)`);
      }
    }
    
    console.log(`\n✅ Limpeza concluída!`);
    console.log(`📊 Total de makeupClasses inválidos removidos: ${totalCleaned}`);
    
  } catch (error) {
    console.error('❌ Erro ao limpar makeupClasses:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Conexão fechada');
  }
}

cleanInvalidMakeupClasses();
