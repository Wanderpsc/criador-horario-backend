const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/school-timetable')
  .then(async () => {
    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      password: String,
      name: String,
      role: String
    }));

    const school = await User.findOne({ email: 'escola@ceti.com' });
    
    if (school) {
      const newPassword = 'Escola2025@';
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      school.password = hashedPassword;
      await school.save();
      
      console.log('✅ Senha resetada com sucesso!');
      console.log('');
      console.log('📚 Escola: ' + school.name);
      console.log('📧 Email: ' + school.email);
      console.log('🔑 Nova Senha: ' + newPassword);
    } else {
      console.log('❌ Escola não encontrada');
    }
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  });
