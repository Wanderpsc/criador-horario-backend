const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({
  name: String,
  isActive: Boolean
});

const TeacherSubjectSchema = new mongoose.Schema({
  teacherId: mongoose.Schema.Types.ObjectId,
  subjectId: mongoose.Schema.Types.ObjectId,
  classId: mongoose.Schema.Types.ObjectId
});

const SubjectSchema = new mongoose.Schema({
  name: String,
  weeklyHours: Number
});

const ClassSchema = new mongoose.Schema({
  name: String
});

const Teacher = mongoose.model('Teacher', TeacherSchema);
const TeacherSubject = mongoose.model('TeacherSubject', TeacherSubjectSchema);
const Subject = mongoose.model('Subject', SubjectSchema);
const Class = mongoose.model('Class', ClassSchema);

async function checkClaudia() {
  try {
    await mongoose.connect('mongodb+srv://wanderpsc:Wander2211@cluster0.n6lso.mongodb.net/school-timetable', {
      serverSelectionTimeoutMS: 5000
    });
    
    const claudia = await Teacher.findOne({ name: /Claudia/i });
    if (!claudia) {
      console.log('❌ Professora Claudia não encontrada');
      return;
    }
    
    console.log('👩‍🏫 Professora:', claudia.name);
    console.log('ID:', claudia._id);
    console.log('\n' + '='.repeat(80));
    
    const teacherSubjects = await TeacherSubject.find({ teacherId: claudia._id });
    
    console.log(`\n📋 Total de registros TeacherSubject: ${teacherSubjects.length}`);
    console.log('\n' + '='.repeat(80));
    console.log('DETALHAMENTO POR COMPONENTE E TURMA:\n');
    
    let totalCalculado = 0;
    const componentesPorTurma = {};
    
    for (const ts of teacherSubjects) {
      const subject = await Subject.findById(ts.subjectId);
      const classInfo = ts.classId ? await Class.findById(ts.classId) : null;
      
      if (subject) {
        const weeklyHours = subject.weeklyHours || 0;
        const className = classInfo ? classInfo.name : 'SEM TURMA';
        const key = subject.name;
        
        if (!componentesPorTurma[key]) {
          componentesPorTurma[key] = [];
        }
        
        componentesPorTurma[key].push({
          turma: className,
          weeklyHours: weeklyHours
        });
        
        totalCalculado += weeklyHours;
        
        console.log(`📚 ${subject.name}`);
        console.log(`   Turma: ${className}`);
        console.log(`   Carga Horária: ${weeklyHours} aulas/semana`);
        console.log(`   Total acumulado: ${totalCalculado}`);
        console.log('');
      }
    }
    
    console.log('='.repeat(80));
    console.log('\n📊 RESUMO POR COMPONENTE:\n');
    
    const componentesUnicos = Object.keys(componentesPorTurma);
    console.log(`Total de componentes únicos: ${componentesUnicos.length}`);
    
    for (const [componente, turmas] of Object.entries(componentesPorTurma)) {
      console.log(`\n${componente}:`);
      turmas.forEach(t => {
        console.log(`  • ${t.turma} - ${t.weeklyHours}h/semana`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ TOTAL DE TURMAS: ${new Set(teacherSubjects.map(ts => ts.classId?.toString()).filter(Boolean)).size}`);
    console.log(`✅ TOTAL DE COMPONENTES: ${componentesUnicos.length}`);
    console.log(`\n🎯 TOTAL DE AULAS/SEMANA CALCULADO: ${totalCalculado}`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkClaudia();
