/**
 * Script para verificar dados do escola@ceti.com no banco
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import SchoolUser from '../src/models/SchoolUser';
import User from '../src/models/User';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-timetable';

async function checkEscolaCeti() {
  try {
    console.log('🔄 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB\n');

    const email = 'escola@ceti.com';

    // 1. Verificar na collection users
    console.log('📋 COLLECTION: users');
    console.log('─'.repeat(50));
    const userDoc = await User.findOne({ email });
    if (userDoc) {
      console.log('✅ Encontrado na collection users:');
      console.log('   _id:', userDoc._id);
      console.log('   name:', userDoc.name);
      console.log('   email:', userDoc.email);
      console.log('   role:', userDoc.role);
      console.log('   schoolName:', userDoc.schoolName);
    } else {
      console.log('❌ NÃO encontrado na collection users');
    }

    // 2. Verificar na collection schoolusers
    console.log('\n📋 COLLECTION: schoolusers');
    console.log('─'.repeat(50));
    const schoolUsers = await SchoolUser.find({ email });
    if (schoolUsers.length > 0) {
      console.log(`✅ Encontrado ${schoolUsers.length} registro(s) na collection schoolusers:\n`);
      schoolUsers.forEach((user, index) => {
        console.log(`   [${index + 1}]`);
        console.log('   _id:', user._id);
        console.log('   name:', user.name);
        console.log('   email:', user.email);
        console.log('   role:', user.role);
        console.log('   schoolId:', user.schoolId);
        console.log('   isActive:', user.isActive);
        console.log('   permissions:', user.permissions ? 'Sim' : 'Não');
        console.log('');
      });
    } else {
      console.log('❌ NÃO encontrado na collection schoolusers');
    }

    // 3. Resumo
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║             DIAGNÓSTICO                  ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('\n📊 RESUMO:');
    console.log(`   Collection users: ${userDoc ? '✅ Existe (role: ' + userDoc.role + ')' : '❌ Não existe'}`);
    console.log(`   Collection schoolusers: ${schoolUsers.length > 0 ? '✅ Existe (' + schoolUsers.length + ' registro(s))' : '❌ Não existe'}`);
    
    if (schoolUsers.length > 0) {
      const adminUser = schoolUsers.find(u => u.role === 'admin');
      if (adminUser) {
        console.log('\n✅ ADMIN ENCONTRADO na collection schoolusers!');
        console.log('   Esse é o usuário que deveria ser retornado no login.');
      } else {
        console.log('\n⚠️ NENHUM usuário com role="admin" na collection schoolusers!');
      }
    }

    console.log('\n💡 PROBLEMA IDENTIFICADO:');
    console.log('   O login está retornando o usuário da collection "users" (role: school)');
    console.log('   ao invés da collection "schoolusers" (role: admin)');
    console.log('\n🔧 SOLUÇÃO:');
    console.log('   A rota /api/school-users/login já está correta (usa SchoolUser)');
    console.log('   O problema pode ser o frontend usando a rota errada ou cache.\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkEscolaCeti();
