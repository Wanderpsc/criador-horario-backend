/**
 * Ver horários do banco
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const checkSchedules = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Conectado ao MongoDB\n');

    const db = mongoose.connection.db;
    if (!db) throw new Error('DB not connected');
    
    const schedules = await db.collection('schedules').find({}).toArray();
    
    console.log(`📋 Total de horários: ${schedules.length}\n`);
    
    schedules.forEach((schedule, idx) => {
      console.log(`\n${idx + 1}. ${schedule.name}`);
      console.log(`   ID: ${schedule._id}`);
      console.log(`   Períodos (${schedule.periods?.length || 0}):`);
      
      if (schedule.periods && schedule.periods.length > 0) {
        schedule.periods.forEach((p: any) => {
          console.log(`     ${p.period}º: ${p.startTime || '(vazio)'} - ${p.endTime || '(vazio)'}`);
        });
      } else {
        console.log('     ⚠️ Nenhum período cadastrado!');
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
};

checkSchedules();
