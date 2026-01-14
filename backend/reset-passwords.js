/**
 * Script para resetar senhas no banco de produção
 * © 2025 Wander Pires Silva Coelho
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Conectar ao MongoDB
const MONGODB_URI = 'mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable';

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  schoolName: String,
  role: String
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function resetPasswords() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado!\n');

    // Buscar admin
    const admin = await User.findOne({ email: 'admin@schooltimetable.com' });
    if (admin) {
      const newPassword = 'Admin@2026';
      admin.password = await bcrypt.hash(newPassword, 10);
      await admin.save();
      console.log('✅ Admin atualizado:');
      console.log('   Email:', admin.email);
      console.log('   Senha:', newPassword);
      console.log('');
    } else {
      console.log('⚠️  Admin não encontrado\n');
    }

    // Buscar usuário CETI
    const ceti = await User.findOne({ 
      $or: [
        { schoolName: /CETI/i },
        { email: /ceti/i }
      ]
    });
    
    if (ceti) {
      const newPassword = 'Ceti@2026';
      ceti.password = await bcrypt.hash(newPassword, 10);
      await ceti.save();
      console.log('✅ CETI atualizado:');
      console.log('   Nome:', ceti.name);
      console.log('   Email:', ceti.email);
      console.log('   Escola:', ceti.schoolName);
      console.log('   Senha:', newPassword);
      console.log('');
    } else {
      console.log('⚠️  CETI não encontrado\n');
    }

    // Listar todos usuários
    console.log('📋 Todos os usuários no banco:');
    const allUsers = await User.find({}).select('name email schoolName role');
    allUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Escola: ${user.schoolName || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado');
  }
}

resetPasswords();
