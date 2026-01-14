/**
 * Script para aprovar conta do administrador
 * © 2025 Wander Pires Silva Coelho
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable';

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  schoolName: String,
  role: String,
  approvedByAdmin: Boolean,
  registrationStatus: String,
  paymentStatus: String,
  isActive: Boolean
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function approveAdmin() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado!\n');

    // Atualizar admin
    const result = await User.updateOne(
      { email: 'admin@schooltimetable.com' },
      { 
        $set: {
          approvedByAdmin: true,
          registrationStatus: 'approved',
          paymentStatus: 'paid',
          isActive: true,
          role: 'super-admin'
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Admin aprovado com sucesso!');
      console.log('');
      console.log('📧 Email: admin@schooltimetable.com');
      console.log('🔑 Senha: Admin@2026');
      console.log('👑 Role: super-admin');
      console.log('✅ Status: approved');
      console.log('');
      console.log('Pode fazer login agora!');
    } else {
      console.log('⚠️ Nenhuma alteração feita (admin já pode estar aprovado)');
      
      // Mostrar dados atuais
      const admin = await User.findOne({ email: 'admin@schooltimetable.com' });
      if (admin) {
        console.log('\n📋 Dados atuais do admin:');
        console.log('   Email:', admin.email);
        console.log('   Role:', admin.role);
        console.log('   Aprovado:', admin.approvedByAdmin);
        console.log('   Status:', admin.registrationStatus);
        console.log('   Pagamento:', admin.paymentStatus);
        console.log('   Ativo:', admin.isActive);
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado');
  }
}

approveAdmin();
