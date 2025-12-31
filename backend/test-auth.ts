/**
 * Script para testar autenticação e verificar userId
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testAuth() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI não encontrada');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const user: any = await User.findOne({ email: 'escola@ceti.com' });
    
    if (!user) {
      console.log('❌ Usuário não encontrado');
      return;
    }

    console.log('👤 Usuário encontrado:');
    console.log('   _id:', user._id);
    console.log('   _id.toString():', user._id.toString());
    console.log('   Tipo de _id:', typeof user._id);
    console.log('   Email:', user.email);
    console.log('');

    // Simular geração de token (como no login)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    console.log('🎫 Token gerado:', token.substring(0, 50) + '...');
    
    // Decodificar token
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    console.log('');
    console.log('🔓 Token decodificado:');
    console.log('   id:', decoded.id);
    console.log('   Tipo de id:', typeof decoded.id);
    console.log('   role:', decoded.role);
    console.log('');

    // Verificar se são iguais
    console.log('🔍 Comparação:');
    console.log('   decoded.id === user._id.toString():', decoded.id === user._id.toString());
    console.log('   decoded.id === user._id:', decoded.id === user._id);
    console.log('');

    // Buscar dados com esse userId
    const Teacher = mongoose.model('Teacher', new mongoose.Schema({}, { strict: false }));
    
    const teachers1 = await Teacher.find({ userId: decoded.id });
    const teachers2 = await Teacher.find({ userId: user._id });
    const teachers3 = await Teacher.find({ userId: user._id.toString() });
    
    console.log('📊 Resultados da busca:');
    console.log('   Com decoded.id (string):', teachers1.length);
    console.log('   Com user._id (ObjectId):', teachers2.length);
    console.log('   Com user._id.toString():', teachers3.length);
    console.log('');

    if (teachers2.length > 0) {
      const t: any = teachers2[0];
      console.log('📝 Exemplo de professor no banco:');
      console.log('   userId:', t.userId);
      console.log('   Tipo de userId:', typeof t.userId);
      console.log('   userId.toString():', t.userId?.toString());
    }

    await mongoose.disconnect();
    console.log('\n✅ Teste concluído');
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testAuth();
