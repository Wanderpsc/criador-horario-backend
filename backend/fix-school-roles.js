const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://wanderpscCoelho:NLYqQ49Z3w21qnSn@escola.zsq6z.mongodb.net/school-timetable?retryWrites=true&w=majority&appName=Escola';

async function fixSchoolRoles() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB\n');
    
    const db = mongoose.connection.db;
    const users = db.collection('users');
    
    // Buscar escolas com role diferente de 'school' e 'admin'
    const wrongRoleUsers = await users.find({
      role: { $nin: ['school', 'admin'] },
      schoolName: { $exists: true, $ne: null }
    }).toArray();
    
    console.log(`📊 Usuários com role incorreto e schoolName: ${wrongRoleUsers.length}\n`);
    
    if (wrongRoleUsers.length > 0) {
      console.log('🔧 Corrigindo roles...\n');
      
      for (const user of wrongRoleUsers) {
        console.log(`Corrigindo: ${user.schoolName || user.email}`);
        console.log(`  Role atual: "${user.role}" → Novo role: "school"`);
        
        await users.updateOne(
          { _id: user._id },
          { $set: { role: 'school' } }
        );
      }
      
      console.log(`\n✅ ${wrongRoleUsers.length} escola(s) corrigida(s)!\n`);
    }
    
    // Buscar escola CETI especificamente
    const cetiSchool = await users.findOne({
      schoolName: { $regex: /CETI.*Amaral/i }
    });
    
    if (cetiSchool) {
      console.log('📋 Escola CETI Desembargador Amaral encontrada:');
      console.log(`   ID: ${cetiSchool._id}`);
      console.log(`   Email: ${cetiSchool.email}`);
      console.log(`   Nome: ${cetiSchool.schoolName}`);
      console.log(`   Role: ${cetiSchool.role}`);
      console.log(`   Aprovada: ${cetiSchool.approvedByAdmin || false}`);
      console.log(`   Ativa: ${cetiSchool.isActive || false}\n`);
    } else {
      console.log('❌ Escola CETI não encontrada\n');
    }
    
    // Contar escolas com role 'school'
    const schoolCount = await users.countDocuments({ role: 'school' });
    console.log(`📊 Total de escolas com role 'school': ${schoolCount}\n`);
    
    await mongoose.disconnect();
    console.log('✅ Desconectado do MongoDB');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

fixSchoolRoles();
