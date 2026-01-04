const axios = require('axios');

async function createTestSchool() {
  try {
    console.log('1. Fazendo login como admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@edusync-pro.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado\n');
    
    console.log('2. Verificando escolas existentes...');
    const schoolsResponse = await axios.get('http://localhost:5000/api/admin/schools', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ ${schoolsResponse.data.data.length} escolas encontradas no banco\n`);
    
    if (schoolsResponse.data.data.length === 0) {
      console.log('⚠️  Nenhuma escola cadastrada. Criando escola de teste...\n');
      
      // Criar escola de teste
      const registerResponse = await axios.post('http://localhost:5000/api/auth/register', {
        email: 'escola.teste@example.com',
        password: 'senha123',
        name: 'João Silva',
        schoolName: 'Escola Teste Municipal',
        phone: '(11) 98765-4321',
        cnpj: '12.345.678/0001-90',
        selectedPlan: 'Básico',
        role: 'school'
      });
      
      console.log('✅ Escola de teste criada:', registerResponse.data);
      console.log('   Email: escola.teste@example.com');
      console.log('   Senha: senha123\n');
      
      // Verificar novamente
      const schoolsResponse2 = await axios.get('http://localhost:5000/api/admin/schools', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`✅ Agora há ${schoolsResponse2.data.data.length} escola(s) no sistema\n`);
      
      if (schoolsResponse2.data.data.length > 0) {
        const school = schoolsResponse2.data.data[0];
        console.log('📋 Dados da escola criada:');
        console.log(`   ID: ${school._id || school.id}`);
        console.log(`   Nome: ${school.schoolName}`);
        console.log(`   Email: ${school.email}`);
        console.log(`   Aprovada: ${school.approvedByAdmin}`);
        console.log(`   Ativa: ${school.isActive}`);
        console.log(`   Role: ${school.role}\n`);
      }
    } else {
      console.log('📋 Escolas existentes:');
      schoolsResponse.data.data.forEach((school, i) => {
        console.log(`\n${i + 1}. ${school.schoolName || school.email}`);
        console.log(`   Email: ${school.email}`);
        console.log(`   Aprovada: ${school.approvedByAdmin}`);
        console.log(`   Ativa: ${school.isActive}`);
        console.log(`   Role: ${school.role}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

createTestSchool();
