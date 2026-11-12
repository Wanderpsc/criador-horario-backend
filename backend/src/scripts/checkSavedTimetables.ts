import mongoose from 'mongoose';
import GeneratedTimetable from '../models/GeneratedTimetable';

const mongoUri = process.env.MONGODB_URI || '';

async function checkTimetables() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB');

    const timetables = await GeneratedTimetable.find({}).limit(10);
    
    console.log(`\n📊 Total de horários salvos: ${timetables.length}\n`);

    timetables.forEach((tt: any, index) => {
      console.log(`\n${index + 1}. Horário:`);
      console.log('   _id:', tt._id);
      console.log('   classId:', tt.classId);
      console.log('   scheduleId:', tt.scheduleId);
      console.log('   title:', tt.title);
      console.log('   slots:', tt.slots?.length || 0, 'aulas');
      console.log('   createdAt:', tt.createdAt);
      
      if (tt.slots && tt.slots.length > 0) {
        console.log('   Exemplo de slot:', {
          day: tt.slots[0].day,
          period: tt.slots[0].period,
          subjectId: tt.slots[0].subjectId,
          teacherId: tt.slots[0].teacherId
        });
      }
    });

    // Listar classIds únicos
    const uniqueClassIds = [...new Set(timetables.map(tt => tt.classId))];
    console.log('\n📋 ClassIds únicos:', uniqueClassIds);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkTimetables();
