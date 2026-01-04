const mongoose = require('mongoose');
const User = require('./dist/models/User.js').default;

const uri = 'mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable';

mongoose.connect(uri)
  .then(async () => {
    console.log('\n════════════════════════════════════════');
    console.log('👥 TODOS OS USUÁRIOS NO BANCO:');
    console.log('════════════════════════════════════════');
    
    const all = await User.find({}, 'email role schoolName registrationStatus approvedByAdmin');
    
    all.forEach(u => {
      console.log(`\n📧 ${u.email}`);
      console.log(`   Role: ${u.role}`);
      console.log(`   Escola: ${u.schoolName || 'N/A'}`);
      console.log(`   Status: ${u.registrationStatus || 'N/A'}`);
      console.log(`   Aprovado: ${u.approvedByAdmin || false}`);
    });
    
    console.log('\n════════════════════════════════════════');
    console.log(`Total: ${all.length} usuários`);
    console.log('════════════════════════════════════════\n');
    
    // Contar por role
    const admins = await User.countDocuments({ role: { $in: ['admin', 'super-admin'] } });
    const schools = await User.countDocuments({ role: 'user' });
    
    console.log(`👑 Admins: ${admins}`);
    console.log(`🏫 Escolas (role=user): ${schools}`);
    console.log('');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Erro:', err);
    process.exit(1);
  });
