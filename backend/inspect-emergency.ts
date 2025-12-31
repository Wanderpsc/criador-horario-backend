import mongoose from 'mongoose';
import EmergencySchedule from './src/models/EmergencySchedule';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-timetable';

async function inspectEmergency() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB\n');

    const schedule = await EmergencySchedule.findOne().sort({ date: -1 });
    
    if (!schedule) {
      console.log('❌ Nenhum horário emergencial encontrado');
      process.exit(0);
    }

    console.log('📋 Horário Emergencial:');
    console.log(`   Data: ${new Date(schedule.date).toLocaleDateString('pt-BR')}`);
    console.log(`   ClassID: ${schedule.classId}`);
    console.log(`   BaseScheduleID: ${schedule.baseScheduleId}`);
    console.log(`\n📊 Estrutura dos Slots:\n`);
    
    console.log(`emergencySlots (${schedule.emergencySlots.length} slots):`);
    schedule.emergencySlots.slice(0, 3).forEach((slot, idx) => {
      console.log(`\nSlot ${idx + 1}:`);
      console.log(JSON.stringify(slot, null, 2));
    });

    console.log(`\n\noriginalSlots (${schedule.originalSlots.length} slots):`);
    schedule.originalSlots.slice(0, 3).forEach((slot, idx) => {
      console.log(`\nSlot ${idx + 1}:`);
      console.log(JSON.stringify(slot, null, 2));
    });

    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

inspectEmergency();
