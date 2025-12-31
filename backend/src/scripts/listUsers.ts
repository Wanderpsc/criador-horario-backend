import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado ao MongoDB');

    const users = await User.find({}).select('name email role schoolName createdAt');
    
    console.log(`\n📊 Total de usuários: ${users.length}\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}`);
      console.log(`   Nome: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Escola: ${user.schoolName || 'N/A'}`);
      console.log(`   Criado em: ${user.createdAt}`);
      console.log('');
    });

    await mongoose.disconnect();
    console.log('✅ Desconectado do MongoDB');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

listUsers();
