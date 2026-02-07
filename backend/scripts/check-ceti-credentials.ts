/**
 * Script para verificar todas as credenciais relacionadas ao CETI
 */

import mongoose from 'mongoose';
import User from '../src/models/User';
import SchoolUser from '../src/models/SchoolUser';
import dotenv from 'dotenv';

dotenv.config();

async function checkCetiCredentials() {
  try {
    console.log('🔍 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Conectado ao MongoDB\n');

    // 1. Verificar na collection Users (dono da escola)
    console.log('📋 COLLECTION USERS (Dono da Escola):');
    console.log('════════════════════════════════════════');
    
    const users = await User.find({
      $or: [
        { email: /ceti/i },
        { schoolName: /ceti/i },
        { schoolName: /desembargador/i }
      ]
    });

    if (users.length === 0) {
      console.log('❌ Nenhum usuário encontrado na collection Users');
    } else {
      users.forEach(user => {
        console.log(`\n👤 Usuário encontrado:`);
        console.log(`   ID:              ${user._id}`);
        console.log(`   Nome:            ${user.name}`);
        console.log(`   Email:           ${user.email}`);
        console.log(`   Role:            ${user.role}`);
        console.log(`   Escola:          ${user.schoolName}`);
        console.log(`   Status:          ${user.registrationStatus}`);
        console.log(`   Aprovado:        ${user.approvedByAdmin ? '✅' : '❌'}`);
        console.log(`   Status Pgto:     ${user.paymentStatus}`);
      });
    }

    // 2. Verificar na collection SchoolUsers (funcionários)
    console.log('\n\n📋 COLLECTION SCHOOLUSERS (Funcionários):');
    console.log('════════════════════════════════════════');
    
    const schoolUsers = await SchoolUser.find({
      email: /ceti/i
    });

    if (schoolUsers.length === 0) {
      console.log('❌ Nenhum funcionário encontrado');
    } else {
      schoolUsers.forEach(user => {
        console.log(`\n👥 Funcionário encontrado:`);
        console.log(`   ID:              ${user._id}`);
        console.log(`   Nome:            ${user.name}`);
        console.log(`   Email:           ${user.email}`);
        console.log(`   Role:            ${user.role}`);
        console.log(`   SchoolId:        ${user.schoolId}`);
        console.log(`   Ativo:           ${user.isActive ? '✅' : '❌'}`);
        console.log(`   Permissões:      ${JSON.stringify(user.permissions)}`);
      });
    }

    // 3. Resumo de credenciais
    console.log('\n\n📊 RESUMO DE CREDENCIAIS:');
    console.log('════════════════════════════════════════');
    
    const schoolOwner = users.find(u => u.role === 'school');
    const adminUser = schoolUsers.find(u => u.role === 'admin');

    if (schoolOwner) {
      console.log('\n🏫 ACESSO COMO DONO DA ESCOLA (Dashboard Cliente):');
      console.log(`   Email:    ${schoolOwner.email}`);
      console.log(`   Senha:    Ceti@2026 (provavelmente)`);
      console.log(`   Destino:  Dashboard da escola (gestão de turmas, horários, etc)`);
    }

    if (adminUser) {
      console.log('\n👨‍💼 ACESSO COMO ADMINISTRADOR (Painel Admin):');
      console.log(`   Email:    ${adminUser.email}`);
      console.log(`   Senha:    Ceti@2026 (provavelmente)`);
      console.log(`   Destino:  Painel administrativo (gestão de escolas, licenças, etc)`);
    }

    console.log('\n💡 NOTA: O mesmo email (escola@ceti.com) existe nas duas collections.');
    console.log('   O backend PRIORIZA schoolusers, então sempre abre o painel admin.');
    console.log('   Para acessar como escola, precisa usar credencial diferente.');
    console.log('\n   Opções:');
    console.log('   1. Criar novo email para o dono da escola (ex: cliente@ceti.com)');
    console.log('   2. Remover escola@ceti.com da collection schoolusers');
    console.log('   3. Criar usuário específico para testes de cliente');

    await mongoose.connection.close();
    console.log('\n✅ Conexão fechada');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

checkCetiCredentials();
