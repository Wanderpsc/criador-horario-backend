/**
 * Script para criar usuário Wander (dono do sistema)
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
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  paymentModel: { type: String, enum: ['subscription', 'pay-per-use'], default: 'subscription' },
  credits: { type: Number, default: 0 },
  licenseKey: String,
  licenseExpiry: Date,
  maxUsers: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createWanderUser() {
  try {
    console.log('🔌 Conectando ao MongoDB Atlas...');
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI não encontrada no .env');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB Atlas');

    // Verificar se já existe
    const existingUser = await User.findOne({ email: 'wanderpsc@gmail.com' });
    
    if (existingUser) {
      console.log('⚠️  Usuário já existe. Atualizando senha...');
      
      // Atualizar senha
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Wpsc2025@', salt);
      
      existingUser.password = hashedPassword;
      existingUser.role = 'admin';
      existingUser.credits = 9999;
      existingUser.isActive = true;
      existingUser.maxUsers = 999;
      
      await existingUser.save();
      
      console.log('\n✅ USUÁRIO ATUALIZADO COM SUCESSO!');
    } else {
      // Criar senha hash
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Wpsc2025@', salt);

      // Criar usuário
      const wanderUser = new User({
        name: 'Wander Pires Silva Coelho',
        email: 'wanderpsc@gmail.com',
        password: hashedPassword,
        role: 'admin',
        paymentModel: 'subscription',
        credits: 9999,
        isActive: true,
        maxUsers: 999
      });

      await wanderUser.save();

      console.log('\n🎉 USUÁRIO CRIADO COM SUCESSO!');
    }
    
    console.log('══════════════════════════════════════');
    console.log('📧 Email:    wanderpsc@gmail.com');
    console.log('🔑 Senha:    Wpsc2025@');
    console.log('👤 Função:   Administrador');
    console.log('💰 Créditos: 9999');
    console.log('══════════════════════════════════════');
    
    await mongoose.disconnect();
    console.log('\n✅ Desconectado do MongoDB');
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

createWanderUser();
