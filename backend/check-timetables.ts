/**
 * Script para verificar grades geradas
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkTimetables() {
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

    // Verificar todas as coleções relacionadas a grades
    const Timetable = mongoose.model('Timetable', new mongoose.Schema({}, { strict: false }));
    const GeneratedTimetable = mongoose.model('GeneratedTimetable', new mongoose.Schema({}, { strict: false }));
    const EmergencySchedule = mongoose.model('EmergencySchedule', new mongoose.Schema({}, { strict: false }));

    const timetables: any[] = await Timetable.find({ userId: user._id });
    const generatedTimetables: any[] = await GeneratedTimetable.find({ userId: user._id });
    const emergencySchedules: any[] = await EmergencySchedule.find({ userId: user._id });

    // Verificar TODAS as grades no banco
    const allTimetables: any[] = await Timetable.find({});
    const allGeneratedTimetables: any[] = await GeneratedTimetable.find({});

    console.log('📊 GRADES DO USUÁRIO escola@ceti.com:');
    console.log('   Timetables:', timetables.length);
    console.log('   GeneratedTimetables:', generatedTimetables.length);
    console.log('   EmergencySchedules:', emergencySchedules.length);
    console.log('');

    console.log('📊 TOTAL DE GRADES NO BANCO (TODOS OS USUÁRIOS):');
    console.log('   Timetables:', allTimetables.length);
    console.log('   GeneratedTimetables:', allGeneratedTimetables.length);
    console.log('');

    if (timetables.length > 0) {
      console.log('📅 TIMETABLES ENCONTRADAS:');
      timetables.forEach((t: any) => {
        console.log(`   - ${t.name || 'Sem nome'}`);
        console.log(`     ID: ${t._id}`);
        console.log(`     Série: ${t.grade || 'N/A'}`);
        console.log('');
      });
    }

    if (generatedTimetables.length > 0) {
      console.log('📅 GENERATED TIMETABLES ENCONTRADAS:');
      generatedTimetables.forEach((t: any) => {
        console.log(`   - ${t.name || 'Sem nome'}`);
        console.log(`     ID: ${t._id}`);
        console.log(`     Turma: ${t.className || 'N/A'}`);
        console.log('');
      });
    }

    if (allGeneratedTimetables.length > 0 && generatedTimetables.length === 0) {
      console.log('⚠️  ATENÇÃO: Existem grades de outros usuários:');
      allGeneratedTimetables.forEach((t: any) => {
        console.log(`   - UserId: ${t.userId?.toString() || 'sem-userId'}`);
        console.log(`     Nome: ${t.name || 'Sem nome'}`);
        console.log(`     Turma: ${t.className || 'N/A'}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Verificação concluída');
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkTimetables();
