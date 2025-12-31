import mongoose from 'mongoose';
import EmergencySchedule from './src/models/EmergencySchedule';
import GeneratedTimetable from './src/models/GeneratedTimetable';
import Class from './src/models/Class';
import Grade from './src/models/Grade';
import Subject from './src/models/Subject';
import Teacher from './src/models/Teacher';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-timetable';

async function fixEmergencySchedule() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Buscar todos os horários emergenciais
    const emergencySchedules = await EmergencySchedule.find();
    console.log(`\n📋 Encontrados ${emergencySchedules.length} horário(s) emergencial(is)\n`);

    for (const schedule of emergencySchedules) {
      console.log(`\n🔧 Processando: ${new Date(schedule.date).toLocaleDateString('pt-BR')}`);
      console.log(`   ID: ${schedule._id}`);
      console.log(`   Base Schedule ID: ${schedule.baseScheduleId}`);
      
      // Buscar o horário base
      const baseTimetable = await GeneratedTimetable.findById(schedule.baseScheduleId);
      if (!baseTimetable || !baseTimetable.timetable) {
        console.log('   ❌ Horário base não encontrado ou sem dados de horário');
        continue;
      }

      // Buscar todas as turmas
      const classes = await Class.find();
      const grades = await Grade.find();
      const subjects = await Subject.find();
      const teachers = await Teacher.find();

      console.log(`   📚 ${classes.length} turmas disponíveis`);

      let updated = false;

      // Atualizar emergencySlots
      for (const slot of schedule.emergencySlots) {
        // Se já tem className e gradeName, pular
        if (slot.className && slot.gradeName) {
          continue;
        }

        // Buscar classId no horário base
        let classId = slot.classId;
        
        // Se não tem classId, buscar no baseTimetable
        if (!classId) {
          for (const [cId, timetable] of Object.entries(baseTimetable.timetable)) {
            const classSlots = timetable as any[];
            const found = classSlots.find((s: any) => 
              s.day === slot.day && 
              s.period === slot.period &&
              s.subjectId === slot.subjectId
            );
            
            if (found) {
              classId = cId;
              slot.classId = cId;
              break;
            }
          }
        }

        if (classId) {
          const classObj = classes.find((c: any) => 
            c._id.toString() === classId || 
            c.id === classId
          );
          
          if (classObj) {
            const grade = grades.find((g: any) => 
              g._id.toString() === classObj.gradeId?.toString()
            );
            
            slot.className = classObj.name;
            slot.gradeName = grade?.name || 'Desconhecida';
            console.log(`   ✅ Slot atualizado: ${slot.gradeName} - ${slot.className} (período ${slot.period})`);
            updated = true;
          }
        }

        // Adicionar nomes se ainda não tem
        if (!slot.subjectName) {
          const subject = subjects.find((s: any) => 
            s._id.toString() === slot.subjectId || 
            s.id === slot.subjectId
          );
          if (subject) {
            slot.subjectName = subject.name;
            slot.subjectColor = subject.color;
          }
        }

        if (!slot.teacherName) {
          const teacher = teachers.find((t: any) => 
            t._id.toString() === slot.teacherId || 
            t.id === slot.teacherId
          );
          if (teacher) {
            slot.teacherName = teacher.name;
          }
        }
      }

      // Atualizar originalSlots também
      for (const slot of schedule.originalSlots) {
        if (slot.className && slot.gradeName) {
          continue;
        }

        let classId = slot.classId;
        
        if (!classId) {
          for (const [cId, timetable] of Object.entries(baseTimetable.timetable)) {
            const classSlots = timetable as any[];
            const found = classSlots.find((s: any) => 
              s.day === slot.day && 
              s.period === slot.period &&
              s.subjectId === slot.subjectId
            );
            
            if (found) {
              classId = cId;
              slot.classId = cId;
              break;
            }
          }
        }

        if (classId) {
          const classObj = classes.find((c: any) => 
            c._id.toString() === classId || 
            c.id === classId
          );
          
          if (classObj) {
            const grade = grades.find((g: any) => 
              g._id.toString() === classObj.gradeId?.toString()
            );
            
            slot.className = classObj.name;
            slot.gradeName = grade?.name || 'Desconhecida';
            updated = true;
          }
        }

        if (!slot.subjectName) {
          const subject = subjects.find((s: any) => 
            s._id.toString() === slot.subjectId || 
            s.id === slot.subjectId
          );
          if (subject) {
            slot.subjectName = subject.name;
            slot.subjectColor = subject.color;
          }
        }

        if (!slot.teacherName) {
          const teacher = teachers.find((t: any) => 
            t._id.toString() === slot.teacherId || 
            t.id === slot.teacherId
          );
          if (teacher) {
            slot.teacherName = teacher.name;
          }
        }
      }

      if (updated) {
        await schedule.save();
        console.log(`   💾 Horário salvo com sucesso!`);
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

fixEmergencySchedule();
