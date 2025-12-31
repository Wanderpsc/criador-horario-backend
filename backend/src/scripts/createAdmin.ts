/**
 * Script para criar usuário administrador inicial
 * © 2025 Wander Pires Silva Coelho
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-timetable';

async function createAdminUser() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB!');

    // Verificar se já existe admin
    const existingAdmin = await User.findOne({ email: 'admin@schooltimetable.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Usuário admin já existe!');
      console.log('📧 Email:', existingAdmin.email);
      return;
    }

    // Criar senha hash
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Criar usuário admin
    const admin = new User({
      name: 'Administrador',
      email: 'admin@schooltimetable.com',
      password: hashedPassword,
      school: 'Sistema',
      role: 'admin'
    });

    await admin.save();

    console.log('✅ Usuário administrador criado com sucesso!');
    console.log('');
    console.log('📧 Email: admin@schooltimetable.com');
    console.log('🔑 Senha: admin123');
    console.log('');
    console.log('Use essas credenciais para fazer login no sistema.');

  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

createAdminUser();
