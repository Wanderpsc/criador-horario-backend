const axios = require('axios');

async function findSchool() {
  try {
    // Login
    const loginResp = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@edusync-pro.com',
      password: 'admin123'
    });
    
    const token = loginResp.data.token;
    
    // Buscar escolas
    const schoolsResp = await axios.get('http://localhost:5000/api/admin/schools', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`\n📊 Total de escolas retornadas pela API: ${schoolsResp.data.data.length}\n`);
    
    if (schoolsResp.data.data.length === 0) {
      console.log('❌ Nenhuma escola foi retornada pela API\n');
      console.log('Vou buscar diretamente no banco por nome...\n');
      
      // Criar script para buscar no MongoDB
      const mongoose = require('mongoose');
      const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://wanderpscCoelho:NLYqQ49Z3w21qnSn@escola.zsq6z.mongodb.net/school-timetable?retryWrites=true&w=majority&appName=Escola';
      
      await mongoose.connect(MONGODB_URI);
      const db = mongoose.connection.db;
      const users = db.collection('users');
      
      // Buscar escola pelo nome
      const cetiSchool = await users.findOne({ 
        schoolName: { $regex: /CETI.*Amaral/i } 
      });
      
      if (cetiSchool) {
        console.log('✅ Escola encontrada no banco:\n');
        console.log(`ID: ${cetiSchool._id}`);
        console.log(`Email: ${cetiSchool.email}`);
        console.log(`Nome: ${cetiSchool.schoolName}`);
        console.log(`Role: ${cetiSchool.role}`);
        console.log(`Aprovada: ${cetiSchool.approvedByAdmin || false}`);
        console.log(`Ativa: ${cetiSchool.isActive || false}\n`);
        
        if (cetiSchool.role !== 'school') {
          console.log(`⚠️ PROBLEMA: O role da escola é "${cetiSchool.role}", mas deveria ser "school"`);
          console.log('Isso explica por que não aparece na listagem!\n');
        }
      } else {
        console.log('❌ Escola "CETI Desembargador Amaral" não encontrada no banco\n');
        
        // Listar todas as escolas no banco
        const allUsers = await users.find({}).project({ 
          email: 1, 
          name: 1, 
          schoolName: 1, 
          role: 1 
        }).toArray();
        
        console.log('📋 Todos os usuários no banco:\n');
        allUsers.forEach(u => {
          console.log(`- ${u.schoolName || u.name || u.email} (role: ${u.role})`);
        });
      }
      
      await mongoose.disconnect();
    } else {
      console.log('📋 Escolas retornadas:\n');
      schoolsResp.data.data.forEach((school, i) => {
        console.log(`${i + 1}. ${school.schoolName}`);
        console.log(`   Email: ${school.email}`);
        console.log(`   Role: ${school.role || 'N/A'}`);
        console.log(`   Aprovada: ${school.approvedByAdmin}`);
        console.log(`   Ativa: ${school.isActive}\n`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

findSchool();
