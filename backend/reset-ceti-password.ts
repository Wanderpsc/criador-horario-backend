/**
 * Script para resetar senha do usuário escola@ceti.com
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  schoolName: String,
  isActive: Boolean
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function resetPassword() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI não encontrada');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB\n');

    // Buscar usuário
    const user: any = await User.findOne({ email: 'escola@ceti.com' });
    
    if (!user) {
      console.log('❌ Usuário escola@ceti.com não encontrado');
      await mongoose.disconnect();
      return;
    }

    console.log('👤 Usuário encontrado:');
    console.log('   Nome:', user.name);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('');

    // Nova senha
    const newPassword = 'Ceti2025@';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.isActive = true;
    
    await user.save();

    console.log('✅ SENHA RESETADA COM SUCESSO!\n');
    console.log('══════════════════════════════════════');
    console.log('📧 Email: escola@ceti.com');
    console.log('🔑 Senha: Ceti2025@');
    console.log('══════════════════════════════════════\n');

    await mongoose.disconnect();
    console.log('✅ Desconectado do MongoDB');
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

resetPassword();
