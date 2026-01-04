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

async function resetAdminPassword() {
  try {
    const mongoUri = 'mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority';
    
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB\n');

    const email = 'wanderpsc@gmail.com';
    let user = await User.findOne({ email });
    
    if (user) {
      console.log('👤 Usuário encontrado:', user.name);
      console.log('   Role atual:', user.role);
      
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash('Wpsc2025@', salt);
      user.isActive = true;
      user.role = 'super-admin';
      await user.save();
      
      console.log('✅ Senha resetada com sucesso!\n');
    } else {
      console.log('❌ Usuário não encontrado. Criando...');
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Wpsc2025@', salt);
      
      user = await User.create({
        name: 'Wander Pires Silva Coelho',
        email: 'wanderpsc@gmail.com',
        password: hashedPassword,
        role: 'super-admin',
        schoolName: 'Administração',
        isActive: true
      });
      
      console.log('✅ Usuário criado com sucesso!\n');
    }
    
    console.log('══════════════════════════════════════');
    console.log('📧 Email: wanderpsc@gmail.com');
    console.log('🔑 Senha: Wpsc2025@');
    console.log('👤 Role: super-admin');
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

resetAdminPassword();
