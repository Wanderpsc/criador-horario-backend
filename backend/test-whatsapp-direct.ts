import axios from 'axios';

/**
 * Script de Teste Direto do WhatsApp Business API
 * Testa envio usando suas credenciais
 */

// Suas credenciais
const ACCESS_TOKEN = 'EAFoILZANSy6YBQXslxjXMXKJugdWH6LCxmULZBf8EapnHTyRKcYMArYdCqloCiZA7Oz7gqja2jXVZAylznZCaSAPcvst4YqnVBKADAmnGzOOAkiKZBQWsOTjwddfGIn1PZAG4egB8CQ8owuTh41pZBO6ejSdybDoZB3yPHetoQs49c34Q9jkmhYGm3vWx9sKtQoS7PSJaqUR5MG8R0bbS7umrOXmdvbVSu9kllEaHytZCNvKx6iozIi58BYaP5R3BQiZC9BCgsw1YnCwT8sgy0KSW26';
const PHONE_NUMBER_ID = '926094580586210';
const API_VERSION = 'v18.0';

// Números de teste
const TEST_NUMBERS = {
  meta: '15551539233',        // Número de teste da Meta
  real: '5589981398723'       // Seu número real
};

async function testWhatsAppMessage(phoneNumber: string, message: string) {
  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  
  console.log('\n🧪 Testando WhatsApp Business API...');
  console.log(`📱 Para: ${phoneNumber}`);
  console.log(`💬 Mensagem: ${message}`);
  console.log(`🔗 URL: ${url}\n`);

  try {
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Mensagem enviada com sucesso!');
    console.log('📊 Resposta da API:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n🎉 WhatsApp ID:', response.data.messages[0].id);
    return response.data;

  } catch (error: any) {
    console.error('❌ Erro ao enviar mensagem:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', JSON.stringify(error.response.data, null, 2));
      
      // Explicar erros comuns
      if (error.response.status === 401) {
        console.error('\n⚠️  Token inválido ou expirado. Gere um novo token no Meta for Developers.');
      } else if (error.response.status === 403) {
        console.error('\n⚠️  Número não verificado ou sem permissão.');
      } else if (error.response.data?.error?.code === 131026) {
        console.error('\n⚠️  Número de destino inválido ou não permitido.');
      }
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   WhatsApp Business API - Teste de Integração         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Teste 1: Número de teste da Meta
  console.log('📋 TESTE 1: Enviar para número de teste da Meta');
  console.log('─────────────────────────────────────────────────────');
  try {
    await testWhatsAppMessage(
      TEST_NUMBERS.meta,
      '🚀 Teste do Sistema de Horário Escolar - Mensagem via WhatsApp Business API!'
    );
  } catch (error) {
    console.log('\n❌ Teste 1 falhou\n');
  }

  // Aguardar 2 segundos entre testes
  console.log('\n⏳ Aguardando 2 segundos...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Teste 2: Seu número real
  console.log('📋 TESTE 2: Enviar para seu número real');
  console.log('─────────────────────────────────────────────────────');
  try {
    await testWhatsAppMessage(
      TEST_NUMBERS.real,
      `📚 Sistema de Horário Escolar\n\nOlá! Esta é uma mensagem de teste do sistema.\n\n✅ WhatsApp integrado com sucesso!\n\nData: ${new Date().toLocaleString('pt-BR')}`
    );
  } catch (error) {
    console.log('\n❌ Teste 2 falhou\n');
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   Testes Concluídos!                                   ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

// Executar testes
runTests().catch(error => {
  console.error('\n💥 Erro fatal:', error.message);
  process.exit(1);
});
