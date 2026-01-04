const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI;

// Schema do EmergencySchedule (simplificado)
const emergencyScheduleSchema = new mongoose.Schema({
  baseScheduleId: String,
  emergencySlots: [{
    period: Number,
    startTime: String,
    endTime: String,
    subjectId: String,
    subjectName: String,
    teacherId: String,
    teacherName: String,
    day: String,
    classId: String,
    className: String,
    gradeName: String,
    isModified: Boolean,
    isAffected: Boolean,
  }],
  originalSlots: [{
    period: Number,
    startTime: String,
    endTime: String,
    subjectId: String,
    subjectName: String,
    teacherId: String,
    teacherName: String,
    day: String,
    classId: String,
    className: String,
    gradeName: String,
  }]
}, { collection: 'emergencyschedules' });

const scheduleSchema = new mongoose.Schema({
  name: String,
  periods: [{
    period: Number,
    startTime: String,
    endTime: String
  }]
}, { collection: 'schedules' });

const generatedTimetableSchema = new mongoose.Schema({
  scheduleId: mongoose.Types.ObjectId
}, { collection: 'generatedtimetables' });

const EmergencySchedule = mongoose.model('EmergencySchedule', emergencyScheduleSchema);
const Schedule = mongoose.model('Schedule', scheduleSchema);
const GeneratedTimetable = mongoose.model('GeneratedTimetable', generatedTimetableSchema);

async function fixEmergencyTimes() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado!');

    // Buscar todos os horários emergenciais
    const emergencySchedules = await EmergencySchedule.find({});
    console.log(`📋 Encontrados ${emergencySchedules.length} horários emergenciais`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const emergency of emergencySchedules) {
      console.log(`\n🔍 Verificando: ${emergency.name || emergency._id}`);
      
      // Verificar se já tem horários preenchidos
      const hasEmptyTimes = emergency.emergencySlots.some(slot => !slot.startTime || !slot.endTime);
      
      if (!hasEmptyTimes) {
        console.log('   ⏭️ Já tem horários preenchidos, pulando...');
        skippedCount++;
        continue;
      }

      console.log('   ⚠️ Tem slots sem horários, buscando schedule...');

      // Buscar o GeneratedTimetable para pegar o scheduleId
      const generatedTimetable = await GeneratedTimetable.findById(emergency.baseScheduleId);
      
      if (!generatedTimetable || !generatedTimetable.scheduleId) {
        console.log('   ❌ Não foi possível encontrar o schedule, pulando...');
        continue;
      }

      // Buscar o Schedule com os períodos
      const schedule = await Schedule.findById(generatedTimetable.scheduleId);
      
      if (!schedule || !schedule.periods || schedule.periods.length === 0) {
        console.log('   ❌ Schedule não tem períodos definidos, pulando...');
        continue;
      }

      console.log(`   ✅ Schedule encontrado com ${schedule.periods.length} períodos`);

      // Criar mapa de períodos
      const periodsMap = {};
      schedule.periods.forEach(p => {
        periodsMap[p.period] = {
          startTime: p.startTime,
          endTime: p.endTime
        };
      });

      // Atualizar emergencySlots
      let slotsUpdated = 0;
      emergency.emergencySlots.forEach(slot => {
        if ((!slot.startTime || !slot.endTime) && periodsMap[slot.period]) {
          slot.startTime = periodsMap[slot.period].startTime;
          slot.endTime = periodsMap[slot.period].endTime;
          slotsUpdated++;
        }
      });

      // Atualizar originalSlots também
      emergency.originalSlots.forEach(slot => {
        if ((!slot.startTime || !slot.endTime) && periodsMap[slot.period]) {
          slot.startTime = periodsMap[slot.period].startTime;
          slot.endTime = periodsMap[slot.period].endTime;
          slotsUpdated++;
        }
      });

      // Salvar no banco
      await emergency.save();
      
      console.log(`   ✅ Atualizado! ${slotsUpdated} slots corrigidos`);
      updatedCount++;
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('📊 RESUMO:');
    console.log(`   ✅ ${updatedCount} horário(s) atualizado(s)`);
    console.log(`   ⏭️ ${skippedCount} horário(s) já estavam corretos`);
    console.log('═══════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

fixEmergencyTimes();
