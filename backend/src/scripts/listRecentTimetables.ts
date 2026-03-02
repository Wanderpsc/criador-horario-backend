import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Timetable from '../models/Timetable';

dotenv.config();

async function run(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI não configurado.');
  }

  await mongoose.connect(mongoUri);

  try {
    const rows = await Timetable.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .select('_id name createdAt userId scheduleId')
      .lean();

    console.log('\nULTIMOS TIMETABLES:');
    rows.forEach((row: any, index: number) => {
      console.log(
        `${index + 1}. ${row.name} | id=${row._id} | schedule=${row.scheduleId} | user=${row.userId} | ${row.createdAt}`
      );
    });
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('❌ Erro:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
