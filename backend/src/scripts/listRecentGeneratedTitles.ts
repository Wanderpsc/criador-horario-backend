import dotenv from 'dotenv';
import mongoose from 'mongoose';
import GeneratedTimetable from '../models/GeneratedTimetable';

dotenv.config();

async function run(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI não configurado.');
  }

  await mongoose.connect(mongoUri);

  try {
    const rows = await GeneratedTimetable.find({})
      .sort({ createdAt: -1 })
      .limit(80)
      .select('title createdAt userId classId')
      .lean();

    const seen = new Set<string>();
    console.log('\nULTIMOS TITULOS GERADOS:');

    for (const row of rows as any[]) {
      const title = String(row.title || 'SEM_TITULO');
      if (seen.has(title)) {
        continue;
      }
      seen.add(title);
      console.log(`${title} | ${row.createdAt} | user=${row.userId} | class=${row.classId}`);
      if (seen.size >= 20) {
        break;
      }
    }
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('❌ Erro:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
