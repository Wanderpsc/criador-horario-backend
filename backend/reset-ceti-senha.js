const axios = require('axios');

async function resetCetiPassword() {
  try {
    // 1. Login como admin
    console.log('1️⃣ Fazendo login como admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'wanderpsc@gmail.com',
      password: 'Wpsc2025@'
    });
    
    const adminToken = loginResponse.data.token;
    console.log('✅ Admin logado');
    
    // 2. Buscar escola CETI
    console.log('\n2️⃣ Buscando escola CETI...');
    const schoolsResponse = await axios.get('http://localhost:5000/api/admin/schools', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const ceti = schoolsResponse.data.data.find(s => s.name && s.name.includes('CETI'));
    
    if (!ceti) {
      console.log('❌ Escola CETI não encontrada');
      return;
    }
    
    console.log('✅ Escola encontrada:', ceti.name);
    console.log('   ID:', ceti._id || ceti.id);
    console.log('   Email:', ceti.email);
    
    // 3. Resetar senha (vou fazer via update direto)
    console.log('\n3️⃣ Resetando senha...');
    const bcrypt = require('bcryptjs');
    const mongoose = require('mongoose');
    
    await mongoose.connect('mongodb://localhost:27017/school-timetable');
    
    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      password: String,
      name: String,
      role: String,
      schoolName: String
    }));
    
    const school = await User.findOne({ email: ceti.email });
    
    if (!school) {
      console.log('❌ Escola não encontrada no banco');
      mongoose.disconnect();
      return;
    }
    
    const newPassword = 'Ceti2025@';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    school.password = hashedPassword;
    await school.save();
    
    console.log('✅ Senha resetada com sucesso!');
    console.log('\n📚 CREDENCIAIS DA ESCOLA CETI:');
    console.log('📧 Email:', school.email);
    console.log('🔑 Senha:', newPassword);
    console.log('🏫 Nome:', school.schoolName || school.name);
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('Detalhes:', error.response.data);
    }
  }
}

resetCetiPassword();
