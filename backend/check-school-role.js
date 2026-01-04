const mongoose = require('mongoose');
const User = require('./dist/models/User').default;

const MONGODB_URI = 'mongodb+srv://wanderpscCoelho:NLYqQ49Z3w21qnSn@escola.zsq6z.mongodb.net/school-timetable?retryWrites=true&w=majority&appName=Escola';

async function checkSchool() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');
    
    const schoolId = '6948aa5c54a857ec2cf21a84';
    const school = await User.findById(schoolId);
    
    if (!school) {
      console.log('❌ Escola não encontrada');
      return;
    }
    
    console.log('\n📋 Dados da escola:');
    console.log('ID:', school._id);
    console.log('Email:', school.email);
    console.log('Nome:', school.schoolName || school.name);
    console.log('Role ATUAL:', school.role);
    console.log('Approved:', school.approvedByAdmin);
    console.log('Active:', school.isActive);
    
    // Verificar se o role está incorreto
    if (school.role !== 'admin' && school.role !== 'school') {
      console.log('\n⚠️  PROBLEMA ENCONTRADO: Role inválido:', school.role);
      console.log('Corrigindo para "school"...');
      school.role = 'school';
      await school.save();
      console.log('✅ Role corrigido!');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Desconectado do MongoDB');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

checkSchool();
