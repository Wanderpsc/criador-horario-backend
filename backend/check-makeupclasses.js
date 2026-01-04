const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('❌ Erro ao conectar:', err));

const emergencySchema = new mongoose.Schema({}, { strict: false, collection: 'emergencyschedules' });
const EmergencySchedule = mongoose.model('EmergencySchedule', emergencySchema);

async function checkEmergencySchedules() {
  try {
    const schoolId = '6948aa5c54a857ec2cf21a84'; // CETI
    
    const schedules = await EmergencySchedule.find({ 
      school: new mongoose.Types.ObjectId(schoolId)
    });
    
    console.log(`\n📅 Horários emergenciais para escola ${schoolId}:`);
    console.log(`Total: ${schedules.length}\n`);
    
    schedules.forEach((schedule, idx) => {
      console.log(`${idx + 1}. Data: ${schedule.date}`);
      console.log(`   Nome: ${schedule.name || 'Sem nome'}`);
      console.log(`   makeupClasses: ${schedule.makeupClasses?.length || 0} aulas`);
      if (schedule.makeupClasses && schedule.makeupClasses.length > 0) {
        console.log(`   Primeiros makeupClasses:`);
        schedule.makeupClasses.slice(0, 3).forEach((mc, i) => {
          console.log(`     ${i + 1}. Prof: ${mc.professorName}, Disc: ${mc.subject}, Turma: ${mc.className}`);
        });
      }
      console.log('');
    });
    
    const withMakeup = schedules.filter(s => s.makeupClasses && s.makeupClasses.length > 0);
    console.log(`✅ ${withMakeup.length} horários com makeupClasses`);
    console.log(`⚠️ ${schedules.length - withMakeup.length} horários sem makeupClasses`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkEmergencySchedules();
