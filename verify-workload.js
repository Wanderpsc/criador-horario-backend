const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://wanderpsc:Wander2211@cluster0.n6lso.mongodb.net/school-timetable?retryWrites=true&w=majority';

// Schemas
const subjectSchema = new mongoose.Schema({
  name: String,
  weeklyHours: Number,
  classIds: [mongoose.Schema.Types.ObjectId],
  classGrades: Array,
  isActive: Boolean
});

const classSchema = new mongoose.Schema({
  name: String,
  gradeName: String,
  gradeId: mongoose.Schema.Types.ObjectId,
  isActive: Boolean
});

const teacherSubjectSchema = new mongoose.Schema({
  teacherId: mongoose.Schema.Types.ObjectId,
  subjectId: mongoose.Schema.Types.ObjectId,
  classId: mongoose.Schema.Types.ObjectId
});

const Subject = mongoose.model('Subject', subjectSchema);
const Class = mongoose.model('Class', classSchema);
const TeacherSubject = mongoose.model('TeacherSubject', teacherSubjectSchema);

async function verifyWorkload() {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado!\n');

    // Buscar todas as turmas ativas
    const classes = await Class.find({ isActive: true }).sort({ gradeName: 1, name: 1 });
    console.log(`📊 Total de turmas ativas: ${classes.length}\n`);

    // Para cada turma, listar os componentes e suas cargas horárias
    for (const classItem of classes) {
      const className = `${classItem.gradeName}-${classItem.name}`;
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📚 TURMA: ${className}`);
      console.log(`${'='.repeat(80)}`);

      // Buscar componentes desta turma
      const subjects = await Subject.find({
        classIds: classItem._id,
        isActive: true
      }).sort({ name: 1 });

      if (subjects.length === 0) {
        console.log('⚠️  Nenhum componente cadastrado para esta turma\n');
        continue;
      }

      let totalWeeklyHours = 0;
      console.log('\nComponente Curricular                                      | Carga Horária');
      console.log('-'.repeat(80));

      for (const subject of subjects) {
        const hours = subject.weeklyHours || 0;
        totalWeeklyHours += hours;
        const subjectName = subject.name.padEnd(58);
        console.log(`${subjectName} | ${hours.toString().padStart(3)} aulas/semana`);
      }

      console.log('-'.repeat(80));
      console.log(`TOTAL:                                                     | ${totalWeeklyHours.toString().padStart(3)} aulas/semana`);
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('✅ Verificação concluída!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
  }
}

verifyWorkload();
