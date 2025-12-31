/**
 * Deletar horário vazio
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const deleteEmptySchedule = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Conectado\n');

    const db = mongoose.connection.db;
    if (!db) throw new Error('DB not connected');
    
    const result = await db.collection('schedules').deleteOne({
      _id: new mongoose.Types.ObjectId('69482037101db97dab10f021')
    });
    
    console.log(`🗑️ Horário deletado: ${result.deletedCount} documento(s)`);
    console.log('\n✅ Agora clique em "Novo Horário" e cadastre do zero!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
};

deleteEmptySchedule();
