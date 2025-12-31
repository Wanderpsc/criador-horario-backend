/**
 * Script para verificar TODOS os dados no banco
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkAllData() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI não encontrada');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB\n');

    // Buscar TODOS os usuários
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const users: any[] = await User.find({});
    
    console.log(`👥 USUÁRIOS CADASTRADOS: ${users.length}`);
    users.forEach((u: any) => {
      console.log(`   - ${u.email} (ID: ${u._id}) - Role: ${u.role}`);
    });
    console.log('');

    // Buscar usuário Wander
    const wanderUser = users.find((u: any) => u.email === 'wanderpsc@gmail.com');
    if (!wanderUser) {
      console.log('❌ Usuário wanderpsc@gmail.com não encontrado');
      await mongoose.disconnect();
      return;
    }

    console.log('🔍 Verificando dados de: wanderpsc@gmail.com');
    console.log('   ID do usuário:', wanderUser._id.toString());
    console.log('');

    // Verificar TODOS os dados (sem filtro de userId)
    const Teacher = mongoose.model('Teacher', new mongoose.Schema({}, { strict: false }));
    const Subject = mongoose.model('Subject', new mongoose.Schema({}, { strict: false }));
    const Schedule = mongoose.model('Schedule', new mongoose.Schema({}, { strict: false }));
    const Timetable = mongoose.model('Timetable', new mongoose.Schema({}, { strict: false }));
    const Grade = mongoose.model('Grade', new mongoose.Schema({}, { strict: false }));
    const Class = mongoose.model('Class', new mongoose.Schema({}, { strict: false }));

    const allTeachers: any[] = await Teacher.find({});
    const allSubjects: any[] = await Subject.find({});
    const allSchedules: any[] = await Schedule.find({});
    const allTimetables: any[] = await Timetable.find({});
    const allGrades: any[] = await Grade.find({});
    const allClasses: any[] = await Class.find({});

    console.log('📊 TOTAL DE DADOS NO BANCO:');
    console.log('   Professores:', allTeachers.length);
    console.log('   Componentes:', allSubjects.length);
    console.log('   Horários:', allSchedules.length);
    console.log('   Grades:', allTimetables.length);
    console.log('   Séries:', allGrades.length);
    console.log('   Turmas:', allClasses.length);
    console.log('');

    // Agrupar por userId
    const teachersByUser: any = {};
    const subjectsByUser: any = {};
    const schedulesByUser: any = {};
    const timetablesByUser: any = {};
    const gradesByUser: any = {};
    const classesByUser: any = {};

    allTeachers.forEach((t: any) => {
      const uid = t.userId?.toString() || 'sem-userId';
      teachersByUser[uid] = (teachersByUser[uid] || 0) + 1;
    });

    allSubjects.forEach((s: any) => {
      const uid = s.userId?.toString() || 'sem-userId';
      subjectsByUser[uid] = (subjectsByUser[uid] || 0) + 1;
    });

    allSchedules.forEach((s: any) => {
      const uid = s.userId?.toString() || 'sem-userId';
      schedulesByUser[uid] = (schedulesByUser[uid] || 0) + 1;
    });

    allTimetables.forEach((t: any) => {
      const uid = t.userId?.toString() || 'sem-userId';
      timetablesByUser[uid] = (timetablesByUser[uid] || 0) + 1;
    });

    allGrades.forEach((g: any) => {
      const uid = g.userId?.toString() || 'sem-userId';
      gradesByUser[uid] = (gradesByUser[uid] || 0) + 1;
    });

    allClasses.forEach((c: any) => {
      const uid = c.userId?.toString() || 'sem-userId';
      classesByUser[uid] = (classesByUser[uid] || 0) + 1;
    });

    console.log('📈 DADOS POR USUÁRIO:');
    const allUserIds = new Set([
      ...Object.keys(teachersByUser),
      ...Object.keys(subjectsByUser),
      ...Object.keys(schedulesByUser),
      ...Object.keys(timetablesByUser),
      ...Object.keys(gradesByUser),
      ...Object.keys(classesByUser)
    ]);

    allUserIds.forEach(uid => {
      const user = users.find((u: any) => u._id.toString() === uid);
      const email = user ? user.email : 'Usuário não encontrado';
      
      console.log(`\n   UserId: ${uid}`);
      console.log(`   Email: ${email}`);
      console.log(`   - Professores: ${teachersByUser[uid] || 0}`);
      console.log(`   - Componentes: ${subjectsByUser[uid] || 0}`);
      console.log(`   - Horários: ${schedulesByUser[uid] || 0}`);
      console.log(`   - Grades: ${timetablesByUser[uid] || 0}`);
      console.log(`   - Séries: ${gradesByUser[uid] || 0}`);
      console.log(`   - Turmas: ${classesByUser[uid] || 0}`);
    });

    // Verificar escola CETI
    console.log('\n\n🏫 DADOS DA ESCOLA "CETI":');
    const cetiTeachers = allTeachers.filter((t: any) => 
      t.schoolName?.includes('CETI') || t.schoolName?.includes('Desembargador')
    );
    const cetiSubjects = allSubjects.filter((s: any) => 
      s.schoolName?.includes('CETI') || s.schoolName?.includes('Desembargador')
    );
    
    console.log('   Professores com "CETI":', cetiTeachers.length);
    console.log('   Componentes com "CETI":', cetiSubjects.length);

    if (cetiTeachers.length > 0) {
      console.log('\n   Exemplo de professor:');
      const t = cetiTeachers[0];
      console.log('   Nome:', t.name);
      console.log('   Escola:', t.schoolName);
      console.log('   UserId:', t.userId?.toString());
    }

    await mongoose.disconnect();
    console.log('\n\n✅ Verificação concluída');
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkAllData();
