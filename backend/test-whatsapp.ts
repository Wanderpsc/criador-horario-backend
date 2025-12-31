/**
 * Script de Teste - WhatsApp Business API
 * Execute: npx ts-node test-whatsapp.ts
 */

import WhatsAppService from './src/services/whatsapp.service';
import dotenv from 'dotenv';

dotenv.config();

async function testWhatsApp() {
  console.log('\n🧪 TESTE DE INTEGRAÇÃO WHATSAPP BUSINESS API\n');
  console.log('='.repeat(50));

  // 1. Verificar configuração
  console.log('\n1️⃣ Verificando configuração...');
  const isConfigured = WhatsAppService.isConfigured();
  
  if (!isConfigured) {
    console.log('\n❌ WhatsApp não configurado!');
    console.log('\n📋 Para configurar:');
    console.log('   1. Leia o guia: WHATSAPP_SETUP.md');
    console.log('   2. Obtenha credenciais em: https://developers.facebook.com/apps');
    console.log('   3. Adicione ao arquivo .env:');
    console.log('      - WHATSAPP_ACCESS_TOKEN');
    console.log('      - WHATSAPP_PHONE_NUMBER_ID');
    console.log('\n');
    return;
  }

  console.log('✅ Configuração encontrada');

  // 2. Testar conexão
  console.log('\n2️⃣ Testando conexão com API...');
  const connected = await WhatsAppService.testConnection();
  
  if (!connected) {
    console.log('\n❌ Falha na conexão!');
    console.log('\n🔍 Verifique:');
    console.log('   - Access Token está correto?');
    console.log('   - Phone Number ID está correto?');
    console.log('   - Número foi verificado no painel da Meta?');
    console.log('\n');
    return;
  }

  console.log('✅ Conexão bem-sucedida');

  // 3. Enviar mensagem de teste
  console.log('\n3️⃣ Enviando mensagem de teste...');
  console.log('   Destinatário: (89) 98139-8723 (seu número)');
  
  const result = await WhatsAppService.sendMessage({
    to: '5589981398723', // Seu número
    message: `✅ *Teste de Integração WhatsApp Business*\n\nSistema: Horário Escolar\nData: ${new Date().toLocaleString('pt-BR')}\n\n🎉 Integração funcionando perfeitamente!`,
    recipientName: 'Wander Pires',
  });

  console.log('\n📊 Resultado:');
  if (result.success) {
    console.log(`   ✅ Mensagem enviada com sucesso!`);
    console.log(`   📱 ID da Mensagem: ${result.messageId}`);
    console.log(`\n   🔔 Verifique seu WhatsApp: (89) 98139-8723`);
  } else {
    console.log(`   ❌ Falha no envio`);
    console.log(`   ⚠️  Erro: ${result.error}`);
    console.log('\n🔍 Possíveis causas:');
    console.log('   - Número não está na lista de permitidos (modo teste)');
    console.log('   - Número não tem WhatsApp ativo');
    console.log('   - Rate limit excedido');
    console.log('   - Permissões da API não aprovadas');
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n✨ Teste concluído!\n');
}

// Executar teste
testWhatsApp().catch(error => {
  console.error('\n❌ Erro no teste:', error);
  process.exit(1);
});
