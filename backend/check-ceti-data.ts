/**
 * Script para verificar dados do usuário escola@ceti.com
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkCetiData() {
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

    console.log('👤 Usuário encontrado:');
    console.log('   ID:', user._id);
    console.log('   Nome:', user.name);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('');

    // Verificar dados associados
    const Teacher = mongoose.model('Teacher', new mongoose.Schema({}, { strict: false }));
    const Subject = mongoose.model('Subject', new mongoose.Schema({}, { strict: false }));
    const Schedule = mongoose.model('Schedule', new mongoose.Schema({}, { strict: false }));
    const Timetable = mongoose.model('Timetable', new mongoose.Schema({}, { strict: false }));
    const GeneratedTimetable = mongoose.model('GeneratedTimetable', new mongoose.Schema({}, { strict: false }));

    const teachers = await Teacher.find({ userId: user._id });
    const subjects = await Subject.find({ userId: user._id });
    const schedules = await Schedule.find({ userId: user._id });
    const timetables = await Timetable.find({ userId: user._id });
    const generated = await GeneratedTimetable.find({ userId: user._id });

    console.log('📊 DADOS CADASTRADOS (escola@ceti.com):');
    console.log('   Professores:', teachers.length);
    console.log('   Componentes:', subjects.length);
    console.log('   Horários:', schedules.length);
    console.log('   Timetables:', timetables.length);
    console.log('   Generated Timetables:', generated.length);
    console.log('   TOTAL DE GRADES:', timetables.length + generated.length);
    console.log('');

    await mongoose.disconnect();
    console.log('✅ Verificação concluída');
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkCetiData();
