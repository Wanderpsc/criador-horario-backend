/**
 * Rotas para Relatórios de Frequência de Professores
 * Com déficits e saldos por disciplina e turma
 * © 2025 Wander Pires Silva Coelho
 */

import express from 'express';
import { auth, AuthRequest } from '../middleware/auth';
import TeacherSubject from '../models/TeacherSubject';
import Teacher from '../models/Teacher';
import Subject from '../models/Subject';
import Class from '../models/Class';
import SchoolDay from '../models/SchoolDay';
import Schedule from '../models/Schedule';
import GeneratedTimetable from '../models/GeneratedTimetable';
import TeacherAttendance from '../models/TeacherAttendance';

const router = express.Router();

// GET /api/teacher-frequency-report/workload/:teacherId
// Calcular carga horária prevista de um professor baseado no calendário letivo
router.get('/workload/:teacherId', auth, async (req: AuthRequest, res) => {
  try {
    const { teacherId } = req.params;
    const { month, year } = req.query;
    const schoolId = req.user?.schoolId || req.user?.id;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID não encontrado' });
    }

    // Buscar professor
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Professor não encontrado' });
    }

    // Buscar disciplinas que o professor leciona
    const teacherSubjects = await TeacherSubject.find({ teacherId, schoolId })
      .populate('subjectId')
      .populate('classId');

    // Buscar dias letivos do mês (regular + saturday)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const schoolDays = await SchoolDay.find({
      schoolId,
      date: { $gte: startDate, $lte: endDate },
      dayType: { $in: ['regular', 'saturday'] }
    });

    // Buscar horários gerados para calcular aulas por semana
    const timetables = await GeneratedTimetable.find({ schoolId });

    // Calcular aulas por disciplina/turma
    const workloadBySubjectClass: any[] = [];

    for (const ts of teacherSubjects) {
      const subject: any = ts.subjectId;
      const classObj: any = ts.classId;

      if (!subject || !classObj) continue;

      // Contar quantas aulas por semana esse professor tem nessa disciplina/turma
      let weeklyClasses = ts.weeklyHours || 0;

      // Se não tem weeklyHours definido, calcular pelo horário gerado
      if (!weeklyClasses) {
        const timetable = timetables.find((t: any) => 
          t.slots?.some((s: any) => 
            s.teacherId === teacherId && 
            s.subjectId === ts.subjectId && 
            s.classId === ts.classId
          )
        );

        if (timetable) {
          weeklyClasses = timetable.slots.filter((s: any) => 
            s.teacherId === teacherId && 
            s.subjectId === ts.subjectId && 
            s.classId === ts.classId
          ).length;
        }
      }

      // Calcular quantas semanas letivas tem no mês
      const totalWeeks = Math.floor(schoolDays.length / 5); // Estimativa: 5 dias letivos = 1 semana
      const predictedClasses = weeklyClasses * totalWeeks;

      workloadBySubjectClass.push({
        subjectId: subject._id,
        subjectName: subject.name,
        classId: classObj._id,
        className: classObj.name,
        weeklyClasses,
        totalSchoolDays: schoolDays.length,
        predictedClasses,
        givenClasses: 0, // Será preenchido com dados reais
        deficit: 0,
        surplus: 0
      });
    }

    res.json({
      teacherId: teacher._id,
      teacherName: teacher.name,
      weeklyWorkload: teacher.weeklyWorkload || 0,
      month,
      year,
      totalSchoolDays: schoolDays.length,
      workloadBySubjectClass
    });

  } catch (error: any) {
    console.error('Erro ao calcular carga horária:', error);
    res.status(500).json({ message: 'Erro ao calcular carga horária', error: error.message });
  }
});

// GET /api/teacher-frequency-report/deficit-surplus
// Relatório de déficits e saldos de todos os professores
router.get('/deficit-surplus', auth, async (req: AuthRequest, res) => {
  try {
    const { month, year } = req.query;
    const schoolId = req.user?.schoolId || req.user?.id;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID não encontrado' });
    }

    if (!month || !year) {
      return res.status(400).json({ message: 'Mês e ano são obrigatórios' });
    }

    // Buscar todos os professores ativos
    const teachers = await Teacher.find({ schoolId, isActive: true });

    const reports = [];

    for (const teacher of teachers) {
      // Buscar disciplinas e turmas do professor
      const teacherSubjects = await TeacherSubject.find({ 
        teacherId: teacher._id, 
        schoolId 
      }).populate('subjectId').populate('classId');

      // Buscar dias letivos do mês
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      const schoolDays = await SchoolDay.find({
        schoolId,
        date: { $gte: startDate, $lte: endDate },
        dayType: { $in: ['regular', 'saturday'] }
      });

      // Buscar registros de frequência do mês
      const attendanceRecords = await TeacherAttendance.find({
        schoolId,
        teacherId: teacher._id,
        date: { $gte: startDate, $lte: endDate }
      });

      const subjectClassDetails = [];
      let totalPredicted = 0;
      let totalGiven = 0;

      // Buscar horários gerados para contar aulas previstas
      const timetables = await GeneratedTimetable.find({ school: schoolId });
      
      for (const ts of teacherSubjects) {
        const subject: any = ts.subjectId;
        const classObj: any = ts.classId;

        if (!subject || !classObj) continue;

        // CONTAR AULAS PREVISTAS por disciplina/turma no calendário letivo
        let predicted = 0;
        
        for (const schoolDay of schoolDays) {
          const dateObj = new Date(schoolDay.date);
          let targetDay: string;
          
          // Se for sábado de reposição, usar o dia que ele segue
          if (schoolDay.dayType === 'saturday' && schoolDay.followWeekday) {
            const weekdayMap: { [key: string]: string } = {
              'monday': 'Segunda',
              'tuesday': 'Terça',
              'wednesday': 'Quarta',
              'thursday': 'Quinta',
              'friday': 'Sexta'
            };
            targetDay = weekdayMap[schoolDay.followWeekday];
          } else {
            // Dia normal
            const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
            const dayMap: { [key: string]: string } = {
              'segunda-feira': 'Segunda',
              'terça-feira': 'Terça',
              'quarta-feira': 'Quarta',
              'quinta-feira': 'Quinta',
              'sexta-feira': 'Sexta',
              'sábado': 'Sábado'
            };
            targetDay = dayMap[dayOfWeek.toLowerCase()];
          }
          
          // Contar aulas do professor nesta disciplina/turma neste dia
          for (const timetable of timetables) {
            if (timetable.slots && timetable.classId.toString() === classObj._id.toString()) {
              const classesInDay = timetable.slots.filter((slot: any) => 
                slot.day === targetDay &&
                slot.teacherId === teacher._id.toString() &&
                slot.subjectId === subject._id.toString()
              ).length;
              
              predicted += classesInDay;
            }
          }
        }

        // CONTAR AULAS DADAS por disciplina/turma nos registros de frequência
        let given = 0;
        
        for (const record of attendanceRecords) {
          if (record.classes && Array.isArray(record.classes)) {
            const classesGiven = record.classes.filter((cls: any) => 
              cls.status === 'present' &&
              cls.subjectId === subject._id.toString() &&
              cls.classId === classObj._id.toString()
            ).length;
            
            given += classesGiven;
          }
        }

        const deficit = predicted > given ? predicted - given : 0;
        const surplus = given > predicted ? given - predicted : 0;

        totalPredicted += predicted;
        totalGiven += given;

        subjectClassDetails.push({
          subjectId: subject._id,
          subjectName: subject.name,
          classId: classObj._id,
          className: classObj.name,
          predictedClasses: predicted,
          givenClasses: given,
          deficit,
          surplus
        });
      }

      const totalDeficit = totalPredicted > totalGiven ? totalPredicted - totalGiven : 0;
      const totalSurplus = totalGiven > totalPredicted ? totalGiven - totalPredicted : 0;

      reports.push({
        teacherId: teacher._id,
        teacherName: teacher.name,
        weeklyWorkload: teacher.weeklyWorkload || 0,
        totalPredictedClasses: totalPredicted,
        totalGivenClasses: totalGiven,
        totalDeficit,
        totalSurplus,
        subjectClassDetails
      });
    }

    res.json({
      month,
      year,
      totalTeachers: teachers.length,
      reports
    });

  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório', error: error.message });
  }
});

export default router;
