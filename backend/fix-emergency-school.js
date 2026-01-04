const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority';

async function fixEmergencySchedules() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    const schoolId = '6948aa5c54a857ec2cf21a84';
    
    const EmergencySchedule = mongoose.model('EmergencySchedule', new mongoose.Schema({}, { strict: false, collection: 'emergencyschedules' }));
    
    // Buscar horários sem school
    const schedulesWithoutSchool = await EmergencySchedule.find({ 
      $or: [
        { school: { $exists: false } },
        { school: null }
      ]
    });
    
    console.log(`\n📋 Encontrados ${schedulesWithoutSchool.length} horários sem campo school`);
    
    if (schedulesWithoutSchool.length > 0) {
      console.log('\n🔧 Atualizando horários...');
      
      for (const schedule of schedulesWithoutSchool) {
        console.log(`   Atualizando ${schedule._id} (${schedule.date})`);
        await EmergencySchedule.updateOne(
          { _id: schedule._id },
          { $set: { school: new mongoose.Types.ObjectId(schoolId) } }
        );
      }
      
      console.log('\n✅ Todos os horários foram atualizados!');
      
      // Verificar
      const updated = await EmergencySchedule.find({ school: new mongoose.Types.ObjectId(schoolId) });
      console.log(`\n✅ Verificação: ${updated.length} horários agora têm school = ${schoolId}`);
    } else {
      console.log('\n✅ Todos os horários já têm o campo school');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
  }
}

fixEmergencySchedules();
