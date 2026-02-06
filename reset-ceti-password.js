const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Modelo de User
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['super-admin', 'admin', 'teacher'], default: 'teacher' },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  status: { type: String, enum: ['active', 'pending_approval', 'suspended', 'rejected'], default: 'active' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function resetPassword() {
  try {
    // Conectar ao MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-timetable';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Buscar o usuário
    const user = await User.findOne({ email: 'escola@ceti.com' });
    
    if (!user) {
      console.log('❌ Usuário não encontrado:', 'escola@ceti.com');
      process.exit(1);
    }

    console.log('📋 Usuário encontrado:');
    console.log('  - Email:', user.email);
    console.log('  - Nome:', user.name);
    console.log('  - Role:', user.role);
    console.log('  - Status:', user.status);

    // Hash da nova senha
    const newPassword = 'Ceti@2026';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar a senha
    user.password = hashedPassword;
    user.status = 'active'; // Garante que está ativo
    await user.save();

    console.log('\n✅ Senha resetada com sucesso!');
    console.log('📧 Email: escola@ceti.com');
    console.log('🔑 Senha: Ceti@2026');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    process.exit(0);
  }
}

resetPassword();
