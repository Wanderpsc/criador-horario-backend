const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://wanderpsc:Wpsc2025%40@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority';

async function listAllEmergencies() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado!');

    const EmergencySchedule = mongoose.model('EmergencySchedule', new mongoose.Schema({}, { strict: false }));

    // Buscar TODOS os horários
    console.log('\n📅 Buscando TODOS os horários emergenciais...');
    const schedules = await EmergencySchedule.find({}).sort({ createdAt: -1 });

    console.log(`\n📊 Total encontrado: ${schedules.length}\n`);
    
    schedules.forEach((schedule, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`${index + 1}. ID: ${schedule._id}`);
      console.log(`   Nome: ${schedule.name || 'Sem nome'}`);
      console.log(`   Data: ${schedule.date} (Tipo: ${typeof schedule.date})`);
      console.log(`   Dia da semana: ${schedule.dayOfWeek}`);
      console.log(`   Turma: ${schedule.classId}`);
      console.log(`   Base Schedule ID: ${schedule.baseScheduleId}`);
      console.log(`   Professores ausentes: ${schedule.absentTeachersNames || 'N/A'}`);
      console.log(`   Slots originais: ${schedule.originalSlots?.length || 0}`);
      console.log(`   Slots emergenciais: ${schedule.emergencySlots?.length || 0}`);
      console.log(`   Criado em: ${schedule.createdAt}`);
      console.log(`   Atualizado em: ${schedule.updatedAt}`);
    });

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão fechada');
  }
}

listAllEmergencies();
