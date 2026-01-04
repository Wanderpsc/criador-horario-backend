const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://wanderpscCoelho:NLYqQ49Z3w21qnSn@escola.zsq6z.mongodb.net/school-timetable?retryWrites=true&w=majority&appName=Escola';

async function checkUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB\n');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Contar todos os usuários
    const totalUsers = await usersCollection.countDocuments();
    console.log(`📊 Total de usuários no banco: ${totalUsers}\n`);
    
    // Verificar por role
    const admins = await usersCollection.countDocuments({ role: 'admin' });
    const schools = await usersCollection.countDocuments({ role: 'school' });
    const users = await usersCollection.countDocuments({ role: 'user' });
    const others = totalUsers - admins - schools - users;
    
    console.log('📋 Usuários por role:');
    console.log(`   Admins: ${admins}`);
    console.log(`   Schools: ${schools}`);
    console.log(`   Users: ${users}`);
    console.log(`   Outros: ${others}\n`);
    
    // Listar todos os usuários com detalhes
    const allUsers = await usersCollection.find({}).project({
      _id: 1,
      email: 1,
      name: 1,
      schoolName: 1,
      role: 1,
      approvedByAdmin: 1,
      isActive: 1
    }).toArray();
    
    console.log('👥 Todos os usuários:\n');
    allUsers.forEach(user => {
      console.log(`ID: ${user._id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Nome: ${user.name || user.schoolName || 'N/A'}`);
      console.log(`Role: ${user.role}`);
      console.log(`Aprovado: ${user.approvedByAdmin || false}`);
      console.log(`Ativo: ${user.isActive || false}`);
      console.log('---\n');
    });
    
    await mongoose.disconnect();
    console.log('✅ Desconectado do MongoDB');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkUsers();
