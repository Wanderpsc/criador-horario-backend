/**
 * Script para verificar dados no banco
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkData() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI não encontrada');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB\n');

    // Buscar usuário Wander
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const user: any = await User.findOne({ email: 'wanderpsc@gmail.com' });
    
    if (!user) {
      console.log('❌ Usuário wanderpsc@gmail.com não encontrado');
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

    const teachers = await Teacher.find({ userId: user._id });
    const subjects = await Subject.find({ userId: user._id });
    const schedules = await Schedule.find({ userId: user._id });
    const timetables = await Timetable.find({ userId: user._id });

    console.log('📊 DADOS CADASTRADOS:');
    console.log('   Professores:', teachers.length);
    console.log('   Componentes:', subjects.length);
    console.log('   Horários:', schedules.length);
    console.log('   Grades:', timetables.length);
    console.log('');

    // Se houver grades, mostrar detalhes
    if (timetables.length > 0) {
      console.log('📅 GRADES ENCONTRADAS:');
      timetables.forEach((t: any) => {
        console.log(`   - ${t.name || 'Sem nome'} (ID: ${t._id})`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Verificação concluída');
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkData();
