import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const emailToDelete = process.argv[2];

async function deleteUser() {
  try {
    if (!emailToDelete) {
      console.log('❌ Uso: ts-node src/scripts/deleteUserByEmail.ts email@exemplo.com');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado ao MongoDB');

    const user = await User.findOne({ email: emailToDelete });
    
    if (!user) {
      console.log(`❌ Usuário com email "${emailToDelete}" não encontrado`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`\n📋 Usuário encontrado:`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Escola: ${user.schoolName || 'N/A'}`);

    await User.deleteOne({ _id: user._id });
    console.log(`\n✅ Usuário "${user.email}" deletado com sucesso!`);

    await mongoose.disconnect();
    console.log('✅ Desconectado do MongoDB');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

deleteUser();
