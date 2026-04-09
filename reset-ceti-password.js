const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI não definido!');
    console.error('   Execute com: $env:MONGODB_URI="mongodb+srv://..." ; node reset-ceti-password.js');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    const host = mongoose.connection.host;
    console.log('✅ Conectado ao MongoDB:', host);

    const db = mongoose.connection.db;

    // Buscar o usuário diretamente via driver (evita validação de schema)
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: 'escola@ceti.com' });

    if (!user) {
      console.log('❌ Usuário não encontrado: escola@ceti.com');
      console.log('   Verifique se está conectado ao banco de PRODUÇÃO correto.');
      process.exit(1);
    }

    console.log('\n📋 Usuário encontrado:');
    console.log('  - Email:', user.email);
    console.log('  - Nome:', user.name);
    console.log('  - Role:', user.role);
    console.log('  - registrationStatus:', user.registrationStatus);
    console.log('  - approvedByAdmin:', user.approvedByAdmin);

    // Hash da nova senha
    const newPassword = 'Ceti@2026';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar diretamente no MongoDB (evita hooks/validação de schema)
    const result = await usersCollection.updateOne(
      { email: 'escola@ceti.com' },
      {
        $set: {
          password: hashedPassword,
          approvedByAdmin: true,
          registrationStatus: 'approved',
          isActive: true,
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 1) {
      console.log('\n✅ Senha e status resetados com sucesso!');
      console.log('📧 Email: escola@ceti.com');
      console.log('🔑 Senha: Ceti@2026');
      console.log('✅ approvedByAdmin: true');
      console.log('✅ registrationStatus: approved');
    } else {
      console.log('⚠️ Nenhum documento modificado. Verifique o email.');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    process.exit(0);
  }
}

resetPassword();
