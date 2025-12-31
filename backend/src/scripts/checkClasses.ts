import mongoose from 'mongoose';
import Class from '../models/Class';

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable';

async function checkClasses() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB');

    const classes = await Class.find({}).limit(5);
    
    console.log(`\n📊 Turmas encontradas:\n`);

    classes.forEach((cls: any) => {
      console.log('Turma:', cls.name);
      console.log('  _id:', cls._id);
      console.log('  _id tipo:', typeof cls._id);
      console.log('  _id.toString():', cls._id.toString());
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkClasses();
