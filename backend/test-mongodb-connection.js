const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 Testando conexão com MongoDB Atlas...\n');
console.log('String de conexão:', process.env.MONGODB_URI?.replace(/:[^:@]+@/, ':****@'));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ SUCESSO! Conectado ao MongoDB Atlas!');
    console.log('Host:', mongoose.connection.host);
    console.log('Database:', mongoose.connection.name);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ ERRO ao conectar:', error.message);
    console.error('\nDetalhes completos:');
    console.error(error);
    process.exit(1);
  });
