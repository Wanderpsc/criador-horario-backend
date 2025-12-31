import mongoose from 'mongoose';
import User from './src/models/User';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

async function fixAdminSchool() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB Atlas');

    // Buscar usuário admin
    const admin = await User.findOne({ email: 'admin@edusync-pro.com' });
    
    if (!admin) {
      console.log('❌ Admin não encontrado');
      return;
    }

    // Criar um ObjectId para a escola
    const schoolId = new mongoose.Types.ObjectId();
    
    // Atualizar o admin com schoolId e schoolName
    admin.school = schoolId;
    admin.schoolName = 'EduSync Pro - Administração';
    await admin.save();

    console.log('✅ Admin atualizado com sucesso!');
    console.log('   School ID:', schoolId);
    console.log('   School Name:', admin.schoolName);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

fixAdminSchool();
