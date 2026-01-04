const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('❌ Erro ao conectar:', err));

const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const User = mongoose.model('User', userSchema);

async function findSchools() {
  try {
    const schools = await User.find({ role: 'school' }).select('_id email name school');
    console.log('\n🏫 Escolas encontradas:');
    schools.forEach((school, idx) => {
      console.log(`\n${idx + 1}. ID: ${school._id}`);
      console.log(`   Email: ${school.email}`);
      console.log(`   Nome: ${school.name || 'N/A'}`);
      console.log(`   School field: ${school.school || 'N/A'}`);
    });
    
    if (schools.length > 0) {
      console.log('\n✅ Use o ID da primeira escola para testar');
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
  }
}

findSchools();
