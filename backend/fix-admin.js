const mongoose = require('mongoose');
require('dotenv').config();

async function fixAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const admin = await User.findOne({ email: 'admin@edusync-pro.com' });
    
    if (!admin) {
      console.log('❌ Admin não encontrado');
      process.exit(1);
    }

    // Adicionar schoolId se não existir
    if (!admin.schoolId) {
      console.log('⚙️ Adicionando schoolId ao admin...');
      admin.schoolId = new mongoose.Types.ObjectId();
      admin.schoolName = 'Escola Administradora';
      await admin.save();
      console.log('✅ schoolId adicionado:', admin.schoolId);
    } else {
      console.log('✅ Admin já possui schoolId:', admin.schoolId);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Concluído!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

fixAdmin();
