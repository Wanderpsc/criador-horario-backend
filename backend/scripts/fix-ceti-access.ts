/**
 * Script para corrigir acesso do CETI
 * - Remover escola@ceti.com da collection schoolusers
 * - Manter apenas em users (role: school)
 * - Verificar se admin@schooltimetable.com existe para painel admin
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User';
import SchoolUser from '../src/models/SchoolUser';
import dotenv from 'dotenv';

dotenv.config();

async function fixCetiAccess() {
  try {
    console.log('🔍 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Conectado ao MongoDB\n');

    // 1. Remover escola@ceti.com de schoolusers
    console.log('🗑️  Removendo escola@ceti.com de schoolusers...');
    const deletedSchoolUser = await SchoolUser.deleteOne({ email: 'escola@ceti.com' });
    if (deletedSchoolUser.deletedCount > 0) {
      console.log('✅ escola@ceti.com removido de schoolusers');
    } else {
      console.log('⚠️  escola@ceti.com não estava em schoolusers');
    }

    // 2. Verificar escola@ceti.com em users
    console.log('\n🔍 Verificando escola@ceti.com em users...');
    const cetiUser = await User.findOne({ email: 'escola@ceti.com' });
    if (cetiUser) {
      console.log('✅ escola@ceti.com encontrado em users');
      console.log(`   ID: ${cetiUser._id}`);
      console.log(`   Role: ${cetiUser.role}`);
      console.log(`   Escola: ${cetiUser.schoolName}`);
      
      // Garantir que está aprovado
      cetiUser.approvedByAdmin = true;
      cetiUser.paymentStatus = 'paid';
      cetiUser.registrationStatus = 'approved';
      await cetiUser.save();
      console.log('✅ Status atualizado (aprovado e pago)');
    } else {
      console.log('❌ escola@ceti.com NÃO encontrado em users!');
    }

    // 3. Remover cliente@ceti.com (foi criado por engano)
    console.log('\n🗑️  Removendo cliente@ceti.com (criado por engano)...');
    const deletedClient = await User.deleteOne({ email: 'cliente@ceti.com' });
    if (deletedClient.deletedCount > 0) {
      console.log('✅ cliente@ceti.com removido');
    }

    // 4. Verificar admin@schooltimetable.com
    console.log('\n🔍 Verificando admin@schooltimetable.com...');
    let adminUser = await User.findOne({ email: 'admin@schooltimetable.com' });
    
    if (!adminUser) {
      console.log('⚠️  admin@schooltimetable.com não existe! Criando...');
      
      const hashedPassword = await bcrypt.hash('Admin@2026', 10);
      adminUser = new User({
        name: 'Administrador do Sistema',
        email: 'admin@schooltimetable.com',
        password: hashedPassword,
        role: 'super-admin',
        schoolName: 'School Timetable Admin',
        approvedByAdmin: true,
        paymentStatus: 'paid',
        registrationStatus: 'approved'
      });
      await adminUser.save();
      console.log('✅ admin@schooltimetable.com criado com sucesso!');
    } else {
      console.log('✅ admin@schooltimetable.com já existe');
      console.log(`   ID: ${adminUser._id}`);
      console.log(`   Role: ${adminUser.role}`);
      
      // Garantir que é super-admin
      if (adminUser.role !== 'super-admin') {
        adminUser.role = 'super-admin';
        await adminUser.save();
        console.log('✅ Role atualizado para super-admin');
      }
    }

    console.log('\n');
    console.log('════════════════════════════════════════════════════════');
    console.log('🎯 CREDENCIAIS CORRETAS:');
    console.log('════════════════════════════════════════════════════════');
    console.log('\n🏫 ACESSO CETI DESEMBARGADOR AMARAL (Dashboard da Escola):');
    console.log('   📧 Email:    escola@ceti.com');
    console.log('   🔑 Senha:    Ceti@2026');
    console.log('   🎯 Destino:  Dashboard da Escola');
    console.log('   📝 Recursos: Criar turmas, professores, horários, usuários');
    console.log('\n👨‍💼 PAINEL ADMINISTRATIVO (Gerenciar Vendas):');
    console.log('   📧 Email:    admin@schooltimetable.com');
    console.log('   🔑 Senha:    Admin@2026');
    console.log('   🎯 Destino:  Painel Administrativo');
    console.log('   📝 Recursos: Gerenciar escolas, licenças, pagamentos');
    console.log('\n📱 URL: https://criador-horario-aula.surge.sh/#/login');
    console.log('════════════════════════════════════════════════════════\n');

    await mongoose.connection.close();
    console.log('✅ Conexão fechada');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

fixCetiAccess();
