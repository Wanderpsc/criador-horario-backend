/**
 * Script para criar usuário administrador padrão
 * © 2025 Wander Pires Silva Coelho
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Schema do usuário (inline para não depender do modelo)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  paymentModel: { type: String, enum: ['subscription', 'pay-per-use'], default: 'subscription' },
  credits: { type: Number, default: 0 },
  licenseKey: String,
  licenseExpiry: Date,
  maxUsers: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    console.log('🔌 Conectando ao MongoDB Atlas...');
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI não encontrada no .env');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB Atlas');

    // Verificar se já existe um admin
    const existingAdmin = await User.findOne({ email: 'admin@edusync-pro.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Usuário admin já existe:');
      console.log('   Email: admin@edusync-pro.com');
      console.log('   Senha: admin123');
      await mongoose.disconnect();
      return;
    }

    // Criar senha hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Criar usuário admin
    const adminUser = new User({
      name: 'Administrador',
      email: 'admin@edusync-pro.com',
      password: hashedPassword,
      role: 'admin',
      paymentModel: 'subscription',
      credits: 1000, // Créditos iniciais para teste
      isActive: true,
      maxUsers: 999 // Sem limite para admin
    });

    await adminUser.save();

    console.log('\n🎉 USUÁRIO ADMIN CRIADO COM SUCESSO!');
    console.log('══════════════════════════════════════');
    console.log('📧 Email:    admin@edusync-pro.com');
    console.log('🔑 Senha:    admin123');
    console.log('👤 Função:   Administrador');
    console.log('💰 Créditos: 1000 (teste)');
    console.log('══════════════════════════════════════');
    console.log('\n✨ Acesse: http://localhost:3000/login');
    
    await mongoose.disconnect();
    console.log('\n✅ Desconectado do MongoDB');
    
  } catch (error: any) {
    console.error('❌ Erro ao criar usuário admin:', error.message);
    process.exit(1);
  }
}

createAdminUser();
