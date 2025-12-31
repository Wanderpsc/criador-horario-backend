import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-timetable';

async function testMetadataRoute() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado!\n');

    // Importar o modelo
    const GeneratedTimetable = require('./src/models/GeneratedTimetable').default;

    console.log('📋 Simulando rota /metadata\n');

    // Buscar dados exatamente como na rota
    const timetables = await GeneratedTimetable.find()
      .select('_id title scheduleId classId createdAt')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📚 Encontrados ${timetables.length} registros\n`);

    if (timetables.length === 0) {
      console.log('⚠️ NENHUM REGISTRO ENCONTRADO! Verifique o banco de dados.');
      await mongoose.disconnect();
      return;
    }

    // Agrupar por título
    const groupedByTitle: any = {};
    
    for (const tt of timetables) {
      const title = tt.title || 'Sem título';
      console.log(`📦 Processando: title="${title}", _id=${tt._id}`);
      if (!groupedByTitle[title]) {
        groupedByTitle[title] = {
          _id: tt._id.toString(),
          title: title,
          scheduleId: tt.scheduleId,
          createdAt: tt.createdAt,
          classIds: [tt.classId]
        };
      } else {
        groupedByTitle[title].classIds.push(tt.classId);
      }
    }

    console.log(`\n📦 groupedByTitle keys: ${Object.keys(groupedByTitle).length}`);
    console.log('📦 groupedByTitle:', JSON.stringify(groupedByTitle, null, 2));

    // Converter para array e formatar
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

    console.log(`\n📤 Retornaria ${formattedTimetables.length} horários`);
    console.log('\n📤 formattedTimetables:', JSON.stringify(formattedTimetables, null, 2));

    await mongoose.disconnect();
    console.log('\n✅ Desconectado do MongoDB');
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testMetadataRoute();
