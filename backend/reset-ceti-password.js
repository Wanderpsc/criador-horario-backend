const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  schoolName: String,
  isActive: Boolean
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function resetCetiPassword() {
  try {
    // Usando exatamente a mesma URI do .env
    const mongoUri = 'mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority';
    
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB\n');

    const email = 'escola@ceti.com';
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ Usuário não encontrado');
      await mongoose.disconnect();
      return;
    }

    console.log('👤 Usuário encontrado:', user.name);
    console.log('   Role atual:', user.role);
    console.log('');
    
    // Nova senha
    const newPassword = 'Ceti2025@';
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.isActive = true;
    
    await user.save();

    console.log('✅ SENHA RESETADA COM SUCESSO!\n');
    console.log('══════════════════════════════════════');
    console.log('🏫 Escola: CETI Desembargador Amaral');
    console.log('📧 Email: escola@ceti.com');
    console.log('🔑 Senha: Ceti2025@');
    console.log('👤 Role: school');
    console.log('══════════════════════════════════════\n');

    await mongoose.disconnect();
    console.log('✅ Processo concluído!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

resetCetiPassword();
