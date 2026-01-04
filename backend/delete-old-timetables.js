const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://wanderpsc:Wpsc2025%40@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority';

async function listOldTimetables() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado!');

    const GeneratedTimetable = mongoose.model('GeneratedTimetable', new mongoose.Schema({}, { strict: false }));

    // Buscar horários de dezembro/2025
    console.log('\n📅 Buscando horários de dezembro/2025...');
    const timetables = await GeneratedTimetable.find({
      createdAt: { 
        $gte: new Date('2025-12-01'),
        $lt: new Date('2026-01-01')
      }
    }).sort({ createdAt: -1 });

    console.log(`\n📊 Total encontrado: ${timetables.length}\n`);
    
    if (timetables.length === 0) {
      console.log('❌ Nenhum horário encontrado em dezembro/2025');
      
      // Buscar os mais antigos
      console.log('\n📅 Buscando os 5 horários mais antigos...');
      const oldest = await GeneratedTimetable.find({}).sort({ createdAt: 1 }).limit(5);
      
      oldest.forEach((timetable, index) => {
        console.log(`\n${index + 1}. ID: ${timetable._id}`);
        console.log(`   Nome: ${timetable.name || 'Sem nome'}`);
        console.log(`   Turma: ${timetable.classId}`);
        console.log(`   Criado em: ${timetable.createdAt}`);
      });
    } else {
      timetables.forEach((timetable, index) => {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`${index + 1}. ID: ${timetable._id}`);
        console.log(`   Nome: ${timetable.name || 'Sem nome'}`);
        console.log(`   Turma: ${timetable.classId}`);
        console.log(`   Criado em: ${timetable.createdAt}`);
        console.log(`   Slots: ${timetable.timetable?.monday?.length || 0} por dia`);
      });

      // Perguntar se quer excluir
      console.log('\n🗑️ Deseja excluir TODOS estes horários? (S/N)');
      console.log('Excluindo automaticamente...');
      
      for (const timetable of timetables) {
        await GeneratedTimetable.deleteOne({ _id: timetable._id });
        console.log(`✅ Excluído: ${timetable.name || timetable._id}`);
      }
      
      console.log(`\n✅ Total de ${timetables.length} horário(s) excluído(s)!`);
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexão fechada');
  }
}

listOldTimetables();
