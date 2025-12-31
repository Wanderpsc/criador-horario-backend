/**
 * Script para migrar grades sem userId para escola@ceti.com
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function migrateGeneratedTimetables() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI não encontrada');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB\n');

    // Buscar usuário CETI
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const user: any = await User.findOne({ email: 'escola@ceti.com' });
    
    if (!user) {
      console.log('❌ Usuário escola@ceti.com não encontrado');
      return;
    }

    console.log('👤 Usuário: escola@ceti.com');
    console.log('   ID:', user._id.toString());
    console.log('');

    // Buscar grades sem userId
    const GeneratedTimetable = mongoose.model('GeneratedTimetable', new mongoose.Schema({}, { strict: false }));
    const orphanTimetables: any[] = await GeneratedTimetable.find({
      $or: [
        { userId: { $exists: false } },
        { userId: null },
        { userId: 'sem-userId' }
      ]
    });

    console.log(`📊 Grades sem userId encontradas: ${orphanTimetables.length}\n`);

    if (orphanTimetables.length === 0) {
      console.log('✅ Não há grades para migrar');
      await mongoose.disconnect();
      return;
    }

    // Atualizar todas as grades
    let updated = 0;
    for (const timetable of orphanTimetables) {
      timetable.userId = user._id;
      await timetable.save();
      updated++;
      console.log(`   ✓ Grade ${updated}/${orphanTimetables.length} atualizada`);
    }

    console.log(`\n✅ ${updated} grades migradas com sucesso!`);
    console.log('   Agora elas aparecem no dashboard do usuário escola@ceti.com');

    await mongoose.disconnect();
    console.log('\n✅ Desconectado do MongoDB');
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

migrateGeneratedTimetables();
