/**
 * Script para verificar e resetar senha do admin@schooltimetable.com
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User';
import dotenv from 'dotenv';

dotenv.config();

async function resetAdminPassword() {
  try {
    console.log('🔍 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Conectado ao MongoDB\n');

    const ADMIN_EMAIL = 'admin@schooltimetable.com';
    const NEW_PASSWORD = 'Admin@2026';

    console.log('🔍 Buscando admin@schooltimetable.com...');
    const admin = await User.findOne({ email: ADMIN_EMAIL });

    if (!admin) {
      console.log('❌ Usuário não encontrado! Criando...\n');
      
      const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);
      const newAdmin = new User({
        name: 'Administrador do Sistema',
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'super-admin',
        schoolName: 'School Timetable Admin',
        approvedByAdmin: true,
        paymentStatus: 'paid',
        registrationStatus: 'approved'
      });
      
      await newAdmin.save();
      console.log('✅ Administrador criado com sucesso!');
    } else {
      console.log('✅ Usuário encontrado!');
      console.log(`   ID: ${admin._id}`);
      console.log(`   Nome: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Status: ${admin.registrationStatus}`);
      console.log(`   Aprovado: ${admin.approvedByAdmin}`);
      
      // Resetar senha
      console.log('\n🔄 Resetando senha...');
      console.log('   Gerando hash com bcrypt...');
      const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);
      console.log('   Hash gerado:', hashedPassword.substring(0, 30) + '...');
      
      // IMPORTANTE: Usar updateOne diretamente para evitar o middleware pre-save
      // que faria hash do hash!
      console.log('   Atualizando diretamente no banco (sem middleware)...');
      await User.updateOne(
        { email: ADMIN_EMAIL },
        {
          $set: {
            password: hashedPassword,
            role: 'super-admin',
            approvedByAdmin: true,
            paymentStatus: 'paid',
            registrationStatus: 'approved'
          }
        }
      );
      console.log('✅ Senha resetada e salva com sucesso!');
    }

    // Aguardar um momento para garantir que o MongoDB sincronizou
    await new Promise(resolve => setTimeout(resolve, 500));

    // Testar a senha - buscar novamente do banco
    console.log('\n🧪 Testando senha...');
    console.log('   Buscando usuário novamente do banco...');
    const adminCheck = await User.findOne({ email: ADMIN_EMAIL });
    if (adminCheck) {
      console.log('   Hash do banco:', adminCheck.password.substring(0, 30) + '...');
      console.log('   Testando bcrypt.compare...');
      const isMatch = await bcrypt.compare(NEW_PASSWORD, adminCheck.password);
      if (isMatch) {
        console.log('✅ SENHA CONFIRMADA! Login vai funcionar.');
      } else {
        console.log('❌ ERRO: Senha não bate!');
        console.log('   Tentando comparar manualmente...');
        const testHash = await bcrypt.hash(NEW_PASSWORD, 10);
        console.log('   Novo hash de teste:', testHash.substring(0, 30) + '...');
      }
    }

    console.log('\n════════════════════════════════════════');
    console.log('🎯 CREDENCIAIS DO PAINEL ADMINISTRATIVO:');
    console.log('════════════════════════════════════════');
    console.log('📧 Email:    admin@schooltimetable.com');
    console.log('🔑 Senha:    Admin@2026');
    console.log('🎯 Role:     super-admin');
    console.log('📱 URL:      https://criador-horario-aula.surge.sh/#/login');
    console.log('════════════════════════════════════════\n');

    await mongoose.connection.close();
    console.log('✅ Conexão fechada');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

resetAdminPassword();
