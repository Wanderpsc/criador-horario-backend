import mongoose from 'mongoose';
import EmergencySchedule from './src/models/EmergencySchedule';
import Class from './src/models/Class';
import Grade from './src/models/Grade';
import Subject from './src/models/Subject';
import Teacher from './src/models/Teacher';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-timetable';

async function quickFixEmergency() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Buscar todos os dados necessários
    const classes = await Class.find();
    const grades = await Grade.find();
    const subjects = await Subject.find();
    const teachers = await Teacher.find();

    console.log(`\n📚 ${classes.length} turmas`);
    console.log(`📐 ${grades.length} séries`);
    console.log(`📖 ${subjects.length} disciplinas`);
    console.log(`👨‍🏫 ${teachers.length} professores\n`);

    // Buscar todos os horários emergenciais
    const emergencySchedules = await EmergencySchedule.find();
    console.log(`📋 ${emergencySchedules.length} horário(s) emergencial(is)\n`);

    for (const schedule of emergencySchedules) {
      console.log(`🔧 Processando: ${new Date(schedule.date).toLocaleDateString('pt-BR')}`);
      console.log(`   ID: ${schedule._id}`);
      console.log(`   classId do horário: ${schedule.classId}`);
      
      let updated = false;

      // Se tem um classId único no schedule, usar esse para TODOS os slots
      if (schedule.classId && schedule.classId !== 'multiple') {
        const classObj = classes.find((c: any) => 
          c._id.toString() === schedule.classId || 
          c.id === schedule.classId
        );

        if (classObj) {
          const grade = grades.find((g: any) => 
            g._id.toString() === classObj.gradeId?.toString()
          );

          const className = classObj.name;
          const gradeName = grade?.name || 'Desconhecida';

          console.log(`   📚 Turma: ${gradeName} - ${className}`);

          // Atualizar TODOS os slots com essa turma
          for (const slot of schedule.emergencySlots) {
            if (!slot.className || !slot.gradeName) {
              slot.classId = schedule.classId;
              slot.className = className;
              slot.gradeName = gradeName;
              updated = true;
            }

            // Adicionar nomes se faltarem
            if (!slot.subjectName) {
              const subject = subjects.find((s: any) => 
                s._id.toString() === slot.subjectId || 
                s.id === slot.subjectId
              );
              if (subject) {
                slot.subjectName = subject.name;
                slot.subjectColor = subject.color;
                updated = true;
              }
            }

            if (!slot.teacherName && slot.teacherId) {
              const teacher = teachers.find((t: any) => 
                t._id.toString() === slot.teacherId || 
                t.id === slot.teacherId
              );
              if (teacher) {
                slot.teacherName = teacher.name;
                updated = true;
              }
            }
          }

          for (const slot of schedule.originalSlots) {
            if (!slot.className || !slot.gradeName) {
              slot.classId = schedule.classId;
              slot.className = className;
              slot.gradeName = gradeName;
              updated = true;
            }

            if (!slot.subjectName) {
              const subject = subjects.find((s: any) => 
                s._id.toString() === slot.subjectId || 
                s.id === slot.subjectId
              );
              if (subject) {
                slot.subjectName = subject.name;
                slot.subjectColor = subject.color;
                updated = true;
              }
            }

            if (!slot.teacherName && slot.teacherId) {
              const teacher = teachers.find((t: any) => 
                t._id.toString() === slot.teacherId || 
                t.id === slot.teacherId
              );
              if (teacher) {
                slot.teacherName = teacher.name;
                updated = true;
              }
            }
          }
        }
      }

      if (updated) {
        await schedule.save();
        console.log(`   ✅ ${schedule.emergencySlots.length} slots atualizados com sucesso!`);
      } else {
        console.log(`   ℹ️ Nenhuma atualização necessária`);
      }
    }

    console.log('\n✅ Processo concluído!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

quickFixEmergency();
