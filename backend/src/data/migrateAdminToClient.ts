/**
 * Script para migrar dados do Admin para um novo usuário Cliente
 * © 2025 Wander Pires Silva Coelho
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Schemas
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  schoolName: String,
  paymentModel: String,
  credits: Number,
  isActive: Boolean,
  maxUsers: Number
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Models que precisam ser migrados
const Teacher = mongoose.model('Teacher', new mongoose.Schema({}, { strict: false }));
const Subject = mongoose.model('Subject', new mongoose.Schema({}, { strict: false }));
const Grade = mongoose.model('Grade', new mongoose.Schema({}, { strict: false }));
const Class = mongoose.model('Class', new mongoose.Schema({}, { strict: false }));
const Schedule = mongoose.model('Schedule', new mongoose.Schema({}, { strict: false }));
const TeacherSubject = mongoose.model('TeacherSubject', new mongoose.Schema({}, { strict: false }));
const Timetable = mongoose.model('Timetable', new mongoose.Schema({}, { strict: false }));

async function migrateAdminToClient() {
  try {
    console.log('🔌 Conectando ao MongoDB Atlas...');
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI não encontrada no .env');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB Atlas\n');

    // 1. Buscar o usuário admin
    const adminUser = await User.findOne({ email: 'wanderpsc@gmail.com', role: 'admin' });
    
    if (!adminUser) {
      console.log('❌ Usuário admin não encontrado!');
      process.exit(1);
    }

    const adminId = adminUser._id;
    console.log(`📋 Admin encontrado: ${adminUser.name}`);
    console.log(`🆔 Admin ID: ${adminId}\n`);

    // 2. Verificar se já existe usuário cliente
    let clientUser = await User.findOne({ email: 'escola@ceti.com' });
    
    if (clientUser) {
      console.log('⚠️  Usuário cliente já existe. Usando existente...');
    } else {
      // 3. Criar novo usuário cliente
      console.log('👤 Criando usuário cliente...');
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Escola2025@', salt);

      clientUser = new User({
        name: 'CETI Desembargador Amaral',
        email: 'escola@ceti.com',
        password: hashedPassword,
        role: 'user',
        schoolName: 'CETI Desembargador Amaral',
        paymentModel: 'subscription',
        credits: 100,
        isActive: true,
        maxUsers: 5
      });

      await clientUser.save();
      console.log('✅ Cliente criado com sucesso!\n');
    }

    const clientId = clientUser._id;

    // 4. Migrar dados do admin para o cliente
    console.log('📦 Iniciando migração de dados...\n');

    // Migrar Professores
    const teachers = await Teacher.updateMany(
      { userId: adminId },
      { $set: { userId: clientId } }
    );
    console.log(`  ✅ ${teachers.modifiedCount} professores migrados`);

    // Migrar Disciplinas
    const subjects = await Subject.updateMany(
      { userId: adminId },
      { $set: { userId: clientId } }
    );
    console.log(`  ✅ ${subjects.modifiedCount} disciplinas migradas`);

    // Migrar Anos/Séries
    const grades = await Grade.updateMany(
      { userId: adminId },
      { $set: { userId: clientId } }
    );
    console.log(`  ✅ ${grades.modifiedCount} anos/séries migrados`);

    // Migrar Turmas
    const classes = await Class.updateMany(
      { userId: adminId },
      { $set: { userId: clientId } }
    );
    console.log(`  ✅ ${classes.modifiedCount} turmas migradas`);

    // Migrar Horários
    const schedules = await Schedule.updateMany(
      { userId: adminId },
      { $set: { userId: clientId } }
    );
    console.log(`  ✅ ${schedules.modifiedCount} horários migrados`);

    // Migrar Associações Professor-Disciplina
    const teacherSubjects = await TeacherSubject.updateMany(
      { userId: adminId },
      { $set: { userId: clientId } }
    );
    console.log(`  ✅ ${teacherSubjects.modifiedCount} associações professor-disciplina migradas`);

    // Migrar Grades de Horários
    const timetables = await Timetable.updateMany(
      { userId: adminId },
      { $set: { userId: clientId } }
    );
    console.log(`  ✅ ${timetables.modifiedCount} grades de horário migradas`);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📊 RESUMO:');
    console.log(`  👤 Admin: ${adminUser.email} (${adminUser.role})`);
    console.log(`  🏫 Cliente: ${clientUser.email} (${clientUser.role})`);
    console.log(`  📚 Total migrado: ${teachers.modifiedCount + subjects.modifiedCount + grades.modifiedCount + classes.modifiedCount + schedules.modifiedCount + teacherSubjects.modifiedCount + timetables.modifiedCount} registros`);
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('🔐 CREDENCIAIS DO CLIENTE:');
    console.log('═══════════════════════════════════════════════════');
    console.log('📧 Email:    escola@ceti.com');
    console.log('🔑 Senha:    Escola2025@');
    console.log('🏫 Escola:   CETI Desembargador Amaral');
    console.log('👤 Função:   Cliente (user)');
    console.log('💰 Créditos: 100');
    console.log('═══════════════════════════════════════════════════');
    
    console.log('\n✅ O admin está agora livre de dados de escola!');
    console.log('✅ Você pode usar o admin para gerenciar o sistema comercial.');
    
    await mongoose.disconnect();
    console.log('\n✅ Desconectado do MongoDB\n');
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

migrateAdminToClient();
