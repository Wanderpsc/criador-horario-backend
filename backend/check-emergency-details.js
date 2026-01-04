const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://wanderpsc:Wpsc2025%40@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority';

async function checkEmergencyDetails() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado!');

    const EmergencySchedule = mongoose.model('EmergencySchedule', new mongoose.Schema({}, { strict: false }));

    const schedules = await EmergencySchedule.find({}).sort({ createdAt: -1 }).limit(2);

    schedules.forEach((schedule, index) => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`${index + 1}. ID: ${schedule._id}`);
      console.log(`   Nome: ${schedule.name}`);
      console.log(`   absentTeachersNames (raw):`, schedule.absentTeachersNames);
      console.log(`   absentTeachersNames (tipo):`, typeof schedule.absentTeachersNames);
      console.log(`   absentTeachersNames (é array?):`, Array.isArray(schedule.absentTeachersNames));
      console.log(`   makeupClasses:`, schedule.makeupClasses?.length || 0, 'aulas');
      
      if (schedule.makeupClasses && schedule.makeupClasses.length > 0) {
        console.log(`\n   📋 MakeupClasses detalhado:`);
        schedule.makeupClasses.forEach((mc, i) => {
          console.log(`      ${i + 1}. Professor: ${mc.originalTeacherName}`);
          console.log(`         Matéria: ${mc.subjectName}`);
          console.log(`         Turma: ${mc.gradeName} - ${mc.className}`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexão fechada');
  }
}

checkEmergencyDetails();
