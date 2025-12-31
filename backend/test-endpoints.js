const https = require('http');

// Função para fazer requisição
function makeRequest(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: body });
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  try {
    console.log('1. Testando login...');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@edusync-pro.com',
      password: 'admin123'
    });
    console.log(`   Status: ${loginRes.status}`);
    
    if (loginRes.status !== 200) {
      console.log(`   Erro: ${loginRes.body}`);
      return;
    }

    const loginData = JSON.parse(loginRes.body);
    const token = loginData.token;
    console.log(`   ✅ Token obtido: ${token.substring(0, 20)}...`);

    console.log('\n2. Testando GET /api/admin/schools...');
    const schoolsRes = await makeRequest('GET', '/api/admin/schools', null, token);
    console.log(`   Status: ${schoolsRes.status}`);
    
    if (schoolsRes.status === 200) {
      const schools = JSON.parse(schoolsRes.body);
      console.log(`   ✅ Resposta: ${JSON.stringify(schools, null, 2)}`);
    } else {
      console.log(`   ❌ Erro: ${schoolsRes.body}`);
    }

    console.log('\n3. Testando GET /api/admin/schools/stats...');
    const statsRes = await makeRequest('GET', '/api/admin/schools/stats', null, token);
    console.log(`   Status: ${statsRes.status}`);
    
    if (statsRes.status === 200) {
      const stats = JSON.parse(statsRes.body);
      console.log(`   ✅ Resposta: ${JSON.stringify(stats, null, 2)}`);
    } else {
      console.log(`   ❌ Erro: ${statsRes.body}`);
    }

  } catch (error) {
    console.error('Erro:', error.message);
  }
}

test();
