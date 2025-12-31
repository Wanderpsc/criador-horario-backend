import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-timetable';
    const conn = await mongoose.connect(mongoURI);
    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
    console.log('\n📌 INSTRUÇÕES PARA CONFIGURAR MONGODB:\n');
    console.log('Opção 1 - MongoDB Atlas (Cloud - RECOMENDADO):');
    console.log('1. Acesse: https://www.mongodb.com/cloud/atlas/register');
    console.log('2. Crie conta gratuita e um cluster');
    console.log('3. Copie a string de conexão');
    console.log('4. Cole no arquivo backend/.env na variável MONGODB_URI\n');
    console.log('Opção 2 - MongoDB Local:');
    console.log('1. Baixe: https://www.mongodb.com/try/download/community');
    console.log('2. Instale e inicie o serviço MongoDB');
    console.log('3. Use: mongodb://localhost:27017/school-timetable\n');
    console.log('⏸️  Servidor continuará tentando conectar...\n');
    // Tentar reconectar após 10 segundos
    setTimeout(connectDB, 10000);
  }
};

export default connectDB;
