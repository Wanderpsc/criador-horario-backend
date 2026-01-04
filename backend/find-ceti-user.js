const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  schoolName: String,
  isActive: Boolean
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function findCetiUser() {
  try {
    const mongoUri = 'mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority';
    
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB\n');

    // Buscar usuário da escola CETI
    const users = await User.find({ 
      $or: [
        { schoolName: /ceti/i },
        { email: /ceti/i },
        { name: /ceti/i }
      ]
    });
    
    if (users.length === 0) {
      console.log('❌ Nenhum usuário da escola CETI encontrado\n');
    } else {
      console.log(`📋 Encontrados ${users.length} usuário(s):\n`);
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🏫 Escola: ${user.schoolName}`);
        console.log(`   👤 Role: ${user.role}`);
        console.log(`   ✅ Ativo: ${user.isActive}`);
        console.log(`   🆔 ID: ${user._id}`);
        console.log('');
      });
    }

    await mongoose.disconnect();
    console.log('✅ Desconectado do MongoDB');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

findCetiUser();
