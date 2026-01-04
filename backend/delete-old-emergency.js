const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://wanderpsc:Wpsc2025%40@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority';

async function deleteOldEmergency() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado!');

    const EmergencySchedule = mongoose.model('EmergencySchedule', new mongoose.Schema({}, { strict: false }));

    // Buscar horários de dezembro/2025
    console.log('\n📅 Buscando horários emergenciais de dezembro/2025...');
    const schedules = await EmergencySchedule.find({
      date: { $regex: '^2025-12' }
    }).sort({ date: -1 });

    console.log(`\n📊 Total encontrado: ${schedules.length}`);
    
    if (schedules.length === 0) {
      console.log('❌ Nenhum horário encontrado em dezembro/2025');
    } else {
      schedules.forEach((schedule, index) => {
        console.log(`\n${index + 1}. ID: ${schedule._id}`);
        console.log(`   Nome: ${schedule.name || 'Sem nome'}`);
        console.log(`   Data: ${schedule.date}`);
        console.log(`   Dia da semana: ${schedule.dayOfWeek}`);
        console.log(`   Turma: ${schedule.classId}`);
        console.log(`   Professores ausentes: ${schedule.absentTeachersNames || 'N/A'}`);
        console.log(`   Slots originais: ${schedule.originalSlots?.length || 0}`);
        console.log(`   Slots emergenciais: ${schedule.emergencySlots?.length || 0}`);
      });

      // Perguntar qual excluir
      console.log('\n🗑️ Excluindo TODOS os horários de dezembro/2025...');
      
      for (const schedule of schedules) {
        await EmergencySchedule.deleteOne({ _id: schedule._id });
        console.log(`✅ Excluído: ${schedule.name || schedule._id} (${schedule.date})`);
      }
      
      console.log(`\n✅ Total de ${schedules.length} horário(s) excluído(s)!`);
    }

    // Buscar todos os horários para confirmar
    console.log('\n📋 Horários restantes:');
    const remaining = await EmergencySchedule.find().sort({ date: -1 });
    console.log(`Total: ${remaining.length}`);
    remaining.forEach((schedule, index) => {
      console.log(`${index + 1}. ${schedule.name || 'Sem nome'} - ${schedule.date}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexão fechada');
  }
}

deleteOldEmergency();
