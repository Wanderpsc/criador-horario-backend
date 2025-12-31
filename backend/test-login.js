const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔐 Testando login...\n');
    
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@edusync-pro.com',
      password: 'admin123'
    });
    
    console.log('✅ Login bem-sucedido!');
    console.log('Token:', response.data.token?.substring(0, 50) + '...');
    console.log('User:', response.data.user);
  } catch (error) {
    console.error('❌ Erro no login:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Erro:', error.message);
    }
  }
}

testLogin();
