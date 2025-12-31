/**
 * Script para corrigir índice de turmas
 * © 2025 Wander Pires Silva Coelho
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixIndex = async () => {
  try {
    console.log('🔄 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Conectado!');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    const collection = db.collection('classes');

    console.log('📋 Índices existentes:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => console.log(` - ${idx.name}:`, idx.key));

    // Dropar índice antigo
    try {
      console.log('\n🗑️ Dropando índice userId_1_gradeId_1_name_1...');
      await collection.dropIndex('userId_1_gradeId_1_name_1');
      console.log('✅ Índice antigo removido!');
    } catch (error: any) {
      if (error.code === 27) {
        console.log('ℹ️ Índice já foi removido anteriormente');
      } else {
        throw error;
      }
    }

    // Criar novo índice parcial
    console.log('\n🔨 Criando novo índice parcial (apenas turmas ativas)...');
    await collection.createIndex(
      { userId: 1, gradeId: 1, name: 1 },
      { 
        unique: true,
        partialFilterExpression: { isActive: true },
        name: 'userId_1_gradeId_1_name_1_active'
      }
    );
    console.log('✅ Novo índice criado!');

    console.log('\n📋 Índices atualizados:');
    const newIndexes = await collection.indexes();
    newIndexes.forEach(idx => console.log(` - ${idx.name}:`, idx.key));

    console.log('\n✅ Índice corrigido com sucesso!');
    console.log('Agora você pode recadastrar turmas que foram excluídas.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
};

fixIndex();
