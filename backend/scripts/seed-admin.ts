/**
 * Script para criar o primeiro administrador do sistema multi-usuários
 * Execute: npm run seed-admin
 * 
 * Credenciais padrão:
 * Email: escola@ceti.com
 * Senha: Ceti@2026
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import SchoolUser from '../src/models/SchoolUser';
import User from '../src/models/User';
import { defaultAdminPermissions } from '../src/models/SchoolUser';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-timetable';

async function seedAdmin() {
  try {
    console.log('🔄 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Dados do administrador
    const ADMIN_EMAIL = 'escola@ceti.com';
    const ADMIN_PASSWORD = 'Ceti@2026';
    const ADMIN_NAME = 'Administrador CETI';

    // Buscar a escola (User role=school)
    console.log('\n🔍 Buscando escola no sistema...');
    const school = await User.findOne({ role: 'school' }).sort({ createdAt: -1 });
    
    if (!school) {
      console.log('❌ ERRO: Nenhuma escola encontrada no sistema!');
      console.log('   Primeiro faça login como escola através da rota principal /login');
      process.exit(1);
    }

    console.log('✅ Escola encontrada:', school.schoolName || school.name);
    console.log('   ID da Escola:', school._id);

    // Verificar se já existe admin com este email
    const existingAdmin = await SchoolUser.findOne({ 
      email: ADMIN_EMAIL, 
      schoolId: school._id 
    });

    if (existingAdmin) {
      console.log('\n⚠️  Administrador já existe!');
      console.log('   Nome:', existingAdmin.name);
      console.log('   Email:', existingAdmin.email);
      console.log('   Role:', existingAdmin.role);
      console.log('\n💡 Se deseja resetar a senha, delete este usuário primeiro.');
      process.exit(0);
    }

    // Criar administrador
    console.log('\n🔧 Criando administrador...');
    const admin = new SchoolUser({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
      permissions: defaultAdminPermissions,
      schoolId: school._id,
      isActive: true
    });

    await admin.save();

    console.log('\n✅ ADMINISTRADOR CRIADO COM SUCESSO!');
    console.log('================================');
    console.log('📧 Email:', ADMIN_EMAIL);
    console.log('🔑 Senha:', ADMIN_PASSWORD);
    console.log('🏫 Escola:', school.schoolName || school.name);
    console.log('👤 Nome:', ADMIN_NAME);
    console.log('================================');
    console.log('\n🌐 Acesse:');
    console.log('   Frontend: https://wanderpsc.github.io/criador-horario-backend/school-user-login');
    console.log('   Ou: http://localhost:3000/school-user-login');
    console.log('\n✅ Pronto! O administrador pode agora criar mais usuários através da página Settings.\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ ERRO ao criar administrador:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedAdmin();
