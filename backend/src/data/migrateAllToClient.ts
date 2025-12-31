/**
 * Script para migrar TODOS os dados do admin para o cliente
 * © 2025 Wander Pires Silva Coelho
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function migrateAllData() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado\n');

    const Teacher = mongoose.model('Teacher', new mongoose.Schema({}, { strict: false }));
    const Subject = mongoose.model('Subject', new mongoose.Schema({}, { strict: false }));
    const Grade = mongoose.model('Grade', new mongoose.Schema({}, { strict: false }));
    const Class = mongoose.model('Class', new mongoose.Schema({}, { strict: false }));
    const Schedule = mongoose.model('Schedule', new mongoose.Schema({}, { strict: false }));
    const TeacherSubject = mongoose.model('TeacherSubject', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    const admin = await User.findOne({ email: 'wanderpsc@gmail.com' });
    const client = await User.findOne({ email: 'escola@ceti.com' });

    if (!admin || !client) {
      console.error('❌ Admin ou cliente não encontrado');
      process.exit(1);
    }

    const adminId = (admin as any)._id.toString();
    const clientId = (client as any)._id.toString();

    console.log('📋 IDs:');
    console.log('  Admin:', adminId);
    console.log('  Cliente:', clientId);
    console.log('\n🔄 Migrando dados...\n');

    // Migrar professores
    const teachers = await Teacher.updateMany(
      { userId: adminId },
      { $set: { userId: clientId, schoolId: clientId } }
    );
    console.log(`  ✅ ${teachers.modifiedCount} professores migrados`);

    // Migrar disciplinas
    const subjects = await Subject.updateMany(
      { userId: adminId },
      { $set: { userId: clientId } }
    );
    console.log(`  ✅ ${subjects.modifiedCount} disciplinas migradas`);

    // Migrar anos/séries
    const grades = await Grade.updateMany(
      { userId: adminId },
      { $set: { userId: clientId } }
    );
    console.log(`  ✅ ${grades.modifiedCount} anos/séries migrados`);

    // Migrar turmas
    const classes = await Class.updateMany(
      { userId: adminId },
      { $set: { userId: clientId } }
    );
    console.log(`  ✅ ${classes.modifiedCount} turmas migradas`);

    // Migrar horários
    const schedules = await Schedule.updateMany(
      { userId: adminId },
      { $set: { userId: clientId } }
    );
    console.log(`  ✅ ${schedules.modifiedCount} horários migrados`);

    // Migrar associações
    const teacherSubjects = await TeacherSubject.updateMany(
      { userId: adminId },
      { $set: { userId: clientId } }
    );
    console.log(`  ✅ ${teacherSubjects.modifiedCount} associações migradas`);

    const total = teachers.modifiedCount + subjects.modifiedCount + 
                  grades.modifiedCount + classes.modifiedCount + 
                  schedules.modifiedCount + teacherSubjects.modifiedCount;

    console.log('\n═══════════════════════════════════════');
    console.log('🎉 MIGRAÇÃO COMPLETA!');
    console.log('═══════════════════════════════════════');
    console.log(`📊 Total de registros migrados: ${total}`);
    console.log('\n✅ Todos os dados estão agora no cliente CETI');
    console.log('✅ Admin está livre para gerenciar o sistema');
    console.log('\n🔄 Recarregue o navegador para ver os dados!');

    await mongoose.disconnect();
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

migrateAllData();
