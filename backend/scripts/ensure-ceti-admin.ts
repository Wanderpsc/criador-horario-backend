/**
 * Script para garantir que escola@ceti.com seja admin da escola CETI
 * Execute: ts-node backend/scripts/ensure-ceti-admin.ts
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import SchoolUser from '../src/models/SchoolUser';
import User from '../src/models/User';
import { defaultAdminPermissions } from '../src/models/SchoolUser';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-timetable';

async function ensureCetiAdmin() {
  try {
    console.log('🔄 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB\n');

    const ADMIN_EMAIL = 'escola@ceti.com';
    const ADMIN_PASSWORD = 'Ceti@2026';
    const ADMIN_NAME = 'Administrador CETI';
    const SCHOOL_NAME = 'CETI Desembargador Amaral';

    // 1. Buscar ou criar a escola no sistema principal
    console.log('🏫 Verificando escola no sistema...');
    let school = await User.findOne({ 
      $or: [
        { email: ADMIN_EMAIL },
        { schoolName: SCHOOL_NAME }
      ]
    });

    if (!school) {
      console.log('   ❌ Escola não encontrada. Criando...');
      
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

      school = new User({
        name: SCHOOL_NAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'school',
        schoolName: SCHOOL_NAME,
        isActive: true,
        approvedByAdmin: true,
        paymentStatus: 'paid',
        registrationStatus: 'complete'
      });

      await school.save();
      console.log('   ✅ Escola criada no sistema principal!');
    } else {
      console.log('   ✅ Escola encontrada:', school.schoolName || school.name);
    }

    const schoolId = school._id;
    console.log('   ID da Escola:', schoolId);

    // 2. Verificar se já existe admin no SchoolUser
    console.log('\n👤 Verificando administrador da escola...');
    let admin = await SchoolUser.findOne({ 
      email: ADMIN_EMAIL, 
      schoolId 
    });

    if (admin) {
      console.log('   ℹ️  Usuário já existe!');
      console.log('   Nome:', admin.name);
      console.log('   Email:', admin.email);
      console.log('   Role atual:', admin.role);
      
      if (admin.role !== 'admin') {
        console.log('   🔧 Atualizando para role="admin"...');
        admin.role = 'admin';
        admin.permissions = defaultAdminPermissions;
        await admin.save();
        console.log('   ✅ Role atualizado para admin!');
      } else {
        console.log('   ✅ Já é administrador!');
      }
    } else {
      console.log('   ❌ Administrador não encontrado. Criando...');
      
      admin = new SchoolUser({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
        permissions: defaultAdminPermissions,
        schoolId: schoolId,
        isActive: true
      });

      await admin.save();
      console.log('   ✅ Administrador criado com sucesso!');
    }

    // 3. Resumo final
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║  ✅ CONFIGURAÇÃO CONCLUÍDA COM SUCESSO   ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('\n📋 CREDENCIAIS DE ACESSO:');
    console.log('   Email: ', ADMIN_EMAIL);
    console.log('   Senha: ', ADMIN_PASSWORD);
    console.log('   Role:  ', 'admin');
    console.log('   Escola:', school.schoolName || school.name);
    console.log('\n🌐 ACESSE O SISTEMA:');
    console.log('   Local:  http://localhost:3000/school-user-login');
    console.log('   Online: https://wanderpsc.github.io/criador-horario-backend/school-user-login');
    console.log('\n💡 IMPORTANTE:');
    console.log('   • Este usuário pode criar novos usuários através de Settings');
    console.log('   • Há diferença entre admin do sistema (super-admin) e admin da escola');
    console.log('   • Este é o admin da escola CETI, que gerencia usuários da escola\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

ensureCetiAdmin();
