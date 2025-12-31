/**
 * Script para migrar dados de escola do admin para um novo usuário cliente
 * © 2025 Wander Pires Silva Coelho
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Schema do usuário
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'school'], default: 'school' },
  schoolName: String,
  cnpj: String,
  phone: String,
  paymentModel: { type: String, enum: ['subscription', 'pay-per-use'], default: 'subscription' },
  credits: { type: Number, default: 100 },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'expired', 'cancelled'], default: 'pending' },
  approvedByAdmin: { type: Boolean, default: false },
  acceptedTerms: { type: Boolean, default: true },
  registrationStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'approved' },
  totalTimetablesGenerated: { type: Number, default: 0 },
  maxUsers: { type: Number, default: 5 }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Schemas para os dados da escola
const teacherSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const subjectSchema = new mongoose.Schema({
  name: String,
  code: String,
  color: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const gradeSchema = new mongoose.Schema({
  name: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const classSchema = new mongoose.Schema({
  name: String,
  gradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Grade' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const scheduleSchema = new mongoose.Schema({
  name: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const teacherSubjectSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Teacher = mongoose.model('Teacher', teacherSchema);
const Subject = mongoose.model('Subject', subjectSchema);
const Grade = mongoose.model('Grade', gradeSchema);
const Class = mongoose.model('Class', classSchema);
const Schedule = mongoose.model('Schedule', scheduleSchema);
const TeacherSubject = mongoose.model('TeacherSubject', teacherSubjectSchema);

async function migrateSchoolData() {
  try {
    console.log('🔌 Conectando ao MongoDB Atlas...');
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI não encontrada no .env');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB Atlas\n');

    // 1. Buscar o usuário admin
    const adminUser = await User.findOne({ email: 'wanderpsc@gmail.com' });
    
    if (!adminUser) {
      console.log('❌ Usuário admin não encontrado');
      await mongoose.disconnect();
      return;
    }

    console.log(`📋 Admin encontrado: ${adminUser.name}`);
    console.log(`🏫 Escola cadastrada no admin: ${adminUser.schoolName || 'Nenhuma'}\n`);

    // 2. Criar novo usuário cliente para a escola
    const schoolEmail = 'escola@cetidesembargadoramaral.edu.br';
    const schoolPassword = 'Escola2025@';
    
    console.log('👤 Criando usuário cliente para a escola...');
    
    // Verificar se já existe
    let clientUser = await User.findOne({ email: schoolEmail });
    
    if (clientUser) {
      console.log('⚠️  Usuário cliente já existe. Usando existente...');
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(schoolPassword, salt);

      clientUser = new User({
        name: 'Diretor CETI Desembargador Amaral',
        email: schoolEmail,
        password: hashedPassword,
        role: 'school',
        schoolName: adminUser.schoolName || 'CETI Desembargador Amaral',
        cnpj: '00.000.000/0001-00',
        phone: adminUser.phone || '(86) 3000-0000',
        paymentModel: 'subscription',
        credits: 100,
        paymentStatus: 'paid',
        approvedByAdmin: true,
        acceptedTerms: true,
        registrationStatus: 'approved',
        maxUsers: 10
      });

      await clientUser.save();
      console.log('✅ Usuário cliente criado com sucesso!');
    }

    // 3. Contar dados atuais do admin
    const teachersCount = await Teacher.countDocuments({ userId: adminUser._id });
    const subjectsCount = await Subject.countDocuments({ userId: adminUser._id });
    const gradesCount = await Grade.countDocuments({ userId: adminUser._id });
    const classesCount = await Class.countDocuments({ userId: adminUser._id });
    const schedulesCount = await Schedule.countDocuments({ userId: adminUser._id });
    const teacherSubjectsCount = await TeacherSubject.countDocuments({ userId: adminUser._id });

    console.log('\n📊 DADOS ENCONTRADOS NO ADMIN:');
    console.log(`  👨‍🏫 Professores: ${teachersCount}`);
    console.log(`  📚 Disciplinas: ${subjectsCount}`);
    console.log(`  🎓 Anos/Séries: ${gradesCount}`);
    console.log(`  🏫 Turmas: ${classesCount}`);
    console.log(`  🕐 Horários: ${schedulesCount}`);
    console.log(`  🔗 Associações Prof+Disc: ${teacherSubjectsCount}`);

    if (teachersCount === 0 && subjectsCount === 0 && gradesCount === 0) {
      console.log('\n⚠️  Nenhum dado encontrado para migrar.');
      console.log('💡 O admin já está limpo!\n');
      
      console.log('══════════════════════════════════════════════════');
      console.log('✅ USUÁRIO CLIENTE CRIADO:');
      console.log('══════════════════════════════════════════════════');
      console.log(`📧 Email:    ${schoolEmail}`);
      console.log(`🔑 Senha:    ${schoolPassword}`);
      console.log(`🏫 Escola:   ${clientUser.schoolName}`);
      console.log(`👤 Função:   Cliente (school)`);
      console.log(`💰 Créditos: ${clientUser.credits}`);
      console.log('══════════════════════════════════════════════════\n');
      
      await mongoose.disconnect();
      return;
    }

    // 4. Migrar dados
    console.log('\n🔄 MIGRANDO DADOS...\n');

    const teachers = await Teacher.updateMany(
      { userId: adminUser._id },
      { userId: clientUser._id }
    );
    console.log(`  ✅ ${teachers.modifiedCount} professores migrados`);

    const subjects = await Subject.updateMany(
      { userId: adminUser._id },
      { userId: clientUser._id }
    );
    console.log(`  ✅ ${subjects.modifiedCount} disciplinas migradas`);

    const grades = await Grade.updateMany(
      { userId: adminUser._id },
      { userId: clientUser._id }
    );
    console.log(`  ✅ ${grades.modifiedCount} anos/séries migrados`);

    const classes = await Class.updateMany(
      { userId: adminUser._id },
      { userId: clientUser._id }
    );
    console.log(`  ✅ ${classes.modifiedCount} turmas migradas`);

    const schedules = await Schedule.updateMany(
      { userId: adminUser._id },
      { userId: clientUser._id }
    );
    console.log(`  ✅ ${schedules.modifiedCount} horários migrados`);

    const teacherSubjects = await TeacherSubject.updateMany(
      { userId: adminUser._id },
      { userId: clientUser._id }
    );
    console.log(`  ✅ ${teacherSubjects.modifiedCount} associações migradas`);

    // 5. Limpar dados do admin
    console.log('\n🧹 Limpando dados do admin...');
    adminUser.schoolName = undefined;
    adminUser.cnpj = undefined;
    adminUser.phone = undefined;
    await adminUser.save();
    console.log('✅ Dados removidos do admin');

    // 6. Resultado final
    console.log('\n══════════════════════════════════════════════════');
    console.log('🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('══════════════════════════════════════════════════');
    
    console.log('\n🔐 ACESSO DE ADMINISTRADOR (VOCÊ):');
    console.log('──────────────────────────────────────────────────');
    console.log('📧 Email:    wanderpsc@gmail.com');
    console.log('🔑 Senha:    Wpsc2025@');
    console.log('👤 Função:   Administrador');
    console.log('💼 Acesso:   Painel comercial completo');
    console.log('📊 Dados:    SEM dados de escola (limpo)');
    
    console.log('\n👨‍🎓 ACESSO DA ESCOLA CLIENTE:');
    console.log('──────────────────────────────────────────────────');
    console.log(`📧 Email:    ${schoolEmail}`);
    console.log(`🔑 Senha:    ${schoolPassword}`);
    console.log(`🏫 Escola:   ${clientUser.schoolName}`);
    console.log(`👤 Função:   Cliente`);
    console.log(`💰 Créditos: ${clientUser.credits}`);
    console.log(`📊 Dados:    ${teachersCount} professores, ${subjectsCount} disciplinas, etc.`);
    
    console.log('\n══════════════════════════════════════════════════\n');
    
    console.log('💡 PRÓXIMOS PASSOS:');
    console.log('  1. Faça logout do sistema');
    console.log('  2. Login como ADMIN (wanderpsc@gmail.com) para gerenciar comercial');
    console.log('  3. Login como CLIENTE (escola@...) para usar o sistema');
    console.log('');
    
    await mongoose.disconnect();
    console.log('✅ Desconectado do MongoDB\n');
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

migrateSchoolData();
