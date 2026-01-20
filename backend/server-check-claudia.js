const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());

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
  weeklyHours: Number,
  classIds: [mongoose.Schema.Types.ObjectId]
});

const ClassSchema = new mongoose.Schema({
  name: String,
  gradeId: mongoose.Schema.Types.ObjectId
});

const GradeSchema = new mongoose.Schema({
  title: String,
  name: String
});

const Teacher = mongoose.model('Teacher', TeacherSchema);
const TeacherSubject = mongoose.model('TeacherSubject', TeacherSubjectSchema);
const Subject = mongoose.model('Subject', SubjectSchema);
const Class = mongoose.model('Class', ClassSchema);
const Grade = mongoose.model('Grade', GradeSchema);

mongoose.connect('mongodb+srv://wanderpsc:Wander2211@cluster0.n6lso.mongodb.net/school-timetable')
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('❌ Erro ao conectar:', err));

app.get('/api/check-claudia', async (req, res) => {
  try {
    const claudia = await Teacher.findOne({ name: /Claudia/i });
    
    if (!claudia) {
      return res.json({ error: 'Professora Claudia não encontrada' });
    }

    const teacherSubjects = await TeacherSubject.find({ teacherId: claudia._id });
    
    const detalhes = [];
    let totalGeral = 0;
    
    for (const ts of teacherSubjects) {
      const subject = await Subject.findById(ts.subjectId);
      const classInfo = ts.classId ? await Class.findById(ts.classId).populate('gradeId') : null;
      
      if (subject) {
        const weeklyHours = subject.weeklyHours || 0;
        let className = 'SEM TURMA';
        
        if (classInfo) {
          const grade = classInfo.gradeId;
          const gradeName = grade?.title || grade?.name || 'Sem Série';
          className = `${gradeName}-${classInfo.name}`;
        }
        
        detalhes.push({
          componente: subject.name,
          turma: className,
          weeklyHours: weeklyHours,
          teacherSubjectId: ts._id.toString(),
          subjectId: ts.subjectId.toString(),
          classId: ts.classId ? ts.classId.toString() : null
        });
        
        totalGeral += weeklyHours;
      }
    }
    
    // Agrupar por componente
    const porComponente = {};
    detalhes.forEach(d => {
      if (!porComponente[d.componente]) {
        porComponente[d.componente] = [];
      }
      porComponente[d.componente].push(d);
    });
    
    res.json({
      success: true,
      professora: claudia.name,
      totalRegistrosTeacherSubject: teacherSubjects.length,
      totalAulas: totalGeral,
      totalComponentes: Object.keys(porComponente).length,
      totalTurmas: new Set(detalhes.map(d => d.classId).filter(Boolean)).size,
      detalhes: detalhes,
      porComponente: porComponente
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Acesse: http://localhost:${PORT}/api/check-claudia\n`);
});
