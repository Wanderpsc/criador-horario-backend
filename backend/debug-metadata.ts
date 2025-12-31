import mongoose from 'mongoose';
import GeneratedTimetable from './src/models/GeneratedTimetable';
import dotenv from 'dotenv';

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-timetable';

async function debugMetadata() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado!\n');

    // Buscar todos os horários
    const timetables = await GeneratedTimetable.find()
      .select('_id title scheduleId classId createdAt')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📚 Total de registros: ${timetables.length}\n`);

    if (timetables.length > 0) {
      console.log('🔍 Primeiro registro (raw do MongoDB):');
      console.log(JSON.stringify(timetables[0], null, 2));
      console.log('\n📋 Campos do primeiro registro:');
      console.log('- _id:', timetables[0]._id);
      console.log('- _id type:', typeof timetables[0]._id);
      console.log('- _id.toString():', timetables[0]._id.toString());
      console.log('- title:', timetables[0].title);
      console.log('- scheduleId:', timetables[0].scheduleId);
      console.log('- classId:', timetables[0].classId);
      console.log('- createdAt:', timetables[0].createdAt);
    }

    // Agrupar por título
    const groupedByTitle: any = {};
    
    for (const tt of timetables) {
      const title = tt.title || 'Sem título';
      if (!groupedByTitle[title]) {
        groupedByTitle[title] = {
          _id: tt._id,
          title: title,
          scheduleId: tt.scheduleId,
          createdAt: tt.createdAt,
          classIds: [tt.classId]
        };
      } else {
        groupedByTitle[title].classIds.push(tt.classId);
      }
    }

    console.log('\n📦 Grupos por título:', Object.keys(groupedByTitle).length);

    // Simular formatação do endpoint
    const formattedTimetables = Object.values(groupedByTitle).map((group: any) => ({
      _id: String(group._id),
      id: String(group._id),
      name: String(group.title),
      title: String(group.title),
      scheduleId: group.scheduleId,
      createdAt: group.createdAt ? new Date(group.createdAt).toISOString() : new Date().toISOString(),
      classCount: group.classIds.length,
      timetable: {}
    }));

    console.log('\n📤 Dados formatados (como seriam retornados pela API):');
    console.log(JSON.stringify(formattedTimetables, null, 2));

    if (formattedTimetables.length > 0) {
      console.log('\n🔍 Primeiro item formatado - Campos individuais:');
      console.log('- _id:', formattedTimetables[0]._id);
      console.log('- id:', formattedTimetables[0].id);
      console.log('- name:', formattedTimetables[0].name);
      console.log('- title:', formattedTimetables[0].title);
      console.log('- createdAt:', formattedTimetables[0].createdAt);
      console.log('- classCount:', formattedTimetables[0].classCount);
    }

    await mongoose.disconnect();
    console.log('\n✅ Desconectado do MongoDB');
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

debugMetadata();
