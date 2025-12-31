import mongoose from 'mongoose';
import Class from '../models/Class';
import Subject from '../models/Subject';
import TeacherSubject from '../models/TeacherSubject';

async function fillClassSubjectsFromTeacherAssignments() {
  try {
    // Conectar ao MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-timetable';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB conectado\n');

    console.log('🚀 Iniciando preenchimento automático de Turmas & Componentes...\n');

    // Buscar todas as lotações (associações professor-componente-turma)
    const teacherSubjects = await TeacherSubject.find({})
      .populate('teacherId')
      .populate('subjectId')
      .lean();

    console.log(`📋 Encontradas ${teacherSubjects.length} lotações de professores\n`);

    // Agrupar por turma
    const classBySubjects: { [classId: string]: Set<string> } = {};

    for (const ts of teacherSubjects) {
      if (!ts.classId) continue;

      const classId = ts.classId.toString();
      if (!classBySubjects[classId]) {
        classBySubjects[classId] = new Set();
      }
      classBySubjects[classId].add(ts.subjectId.toString());
    }

    console.log(`🏫 Processando ${Object.keys(classBySubjects).length} turmas...\n`);

    // Buscar todos os componentes para pegar carga horária padrão
    const allSubjects = await Subject.find({}).lean();
    const subjectMap = new Map(allSubjects.map(s => [s._id.toString(), s]));

    // Atualizar cada turma
    let updatedCount = 0;
    for (const [classId, subjectIds] of Object.entries(classBySubjects)) {
      const classItem = await Class.findById(classId);
      if (!classItem) {
        console.log(`⚠️  Turma ${classId} não encontrada, pulando...`);
        continue;
      }

      // Preparar subjectIds e weeklyHours
      const newSubjectIds = Array.from(subjectIds);
      const subjectWeeklyHours: { [key: string]: number } = {};

      for (const subjectId of newSubjectIds) {
        const subject = subjectMap.get(subjectId);
        // Usar weeklyHours do componente ou 2 como padrão
        subjectWeeklyHours[subjectId] = subject?.weeklyHours || 2;
      }

      // Atualizar turma
      classItem.subjectIds = newSubjectIds as any;
      classItem.subjectWeeklyHours = subjectWeeklyHours;
      await classItem.save();

      updatedCount++;
      console.log(`✅ Turma "${classItem.name}": ${newSubjectIds.length} componentes associados`);
      
      // Mostrar quais componentes foram associados
      for (const subjectId of newSubjectIds) {
        const subject = subjectMap.get(subjectId);
        const hours = subjectWeeklyHours[subjectId];
        console.log(`   - ${subject?.name || 'Desconhecido'}: ${hours}h/semana`);
      }
      console.log('');
    }

    console.log(`\n✅ Processo concluído!`);
    console.log(`📊 ${updatedCount} turma(s) atualizada(s) com componentes curriculares`);

  } catch (error) {
    console.error('❌ Erro ao preencher associações:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

fillClassSubjectsFromTeacherAssignments();
