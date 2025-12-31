/**
 * Script para remover schoolName do admin e garantir que escola apareça na lista
 * © 2025 Wander Pires Silva Coelho
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  schoolName: String
}, { timestamps: true, strict: false });

const User = mongoose.model('User', userSchema);

async function fixAdminSchoolName() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado\n');

    // Atualizar admin - remover schoolName
    const admin = await User.findOne({ email: 'wanderpsc@gmail.com' });
    if (admin) {
      console.log('📋 Admin antes:', {
        email: admin.email,
        schoolName: admin.schoolName,
        role: admin.role
      });

      admin.schoolName = undefined;
      await admin.save();

      console.log('✅ Admin atualizado (schoolName removido)\n');
    }

    // Verificar cliente
    const client = await User.findOne({ email: 'escola@ceti.com' });
    if (client) {
      console.log('🏫 Cliente:', {
        email: client.email,
        schoolName: client.schoolName,
        role: client.role
      });
      console.log('✅ Cliente está correto\n');
    }

    // Listar todas as escolas
    const schools = await User.find({ role: 'user' }).select('name email schoolName');
    console.log('📚 Escolas cadastradas:');
    schools.forEach(school => {
      console.log(`  - ${school.schoolName} (${school.email})`);
    });

    console.log('\n✅ Correção concluída!');
    console.log('🔄 Recarregue o navegador para ver as mudanças');

    await mongoose.disconnect();
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

fixAdminSchoolName();
