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

    // Buscar disciplinas que o professor leciona (campos são String, não ObjectId refs)
    const teacherSubjects = await TeacherSubject.find({ teacherId, schoolId });

    // Buscar dias letivos do mês (regular + saturday) — usar Date objects para query correta
    const startOfMonth = new Date(Number(year), Number(month) - 1, 1);
    const endOfMonth = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

    const schoolDays = await SchoolDay.find({
      schoolId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
      dayType: { $in: ['regular', 'saturday'] }
    });

    // Buscar horários gerados (campo é 'school', não 'schoolId')
    const timetables = await GeneratedTimetable.find({ school: schoolId });

    // Pré-carregar disciplinas e turmas (Subject tem schoolId, Class tem userId)
    const timetableClassIds = [...new Set(timetables.map((t: any) => t.classId?.toString()).filter(Boolean))];
    const timetableSubjectIds = [...new Set(
      timetables.flatMap((t: any) => t.slots?.map((s: any) => s.subjectId?.toString()).filter(Boolean) || [])
    )];
    const allSubjects = await Subject.find(timetableSubjectIds.length > 0 ? { _id: { $in: timetableSubjectIds } } : { schoolId });
    const allClasses = await Class.find(timetableClassIds.length > 0 ? { _id: { $in: timetableClassIds } } : {});
    const subjectMap = new Map(allSubjects.map((s: any) => [s._id.toString(), s]));
    const classMap = new Map(allClasses.map((c: any) => [c._id.toString(), c]));

    // Calcular aulas por disciplina/turma
    const workloadBySubjectClass: any[] = [];

    for (const ts of teacherSubjects) {
      const subjectId = ts.subjectId?.toString();
      const classId = ts.classId?.toString();
      const subject = subjectId ? subjectMap.get(subjectId) : null;
      const classObj = classId ? classMap.get(classId) : null;

      if (!subject || !classObj) continue;

      // Contar quantas aulas por semana esse professor tem nessa disciplina/turma
      let weeklyClasses = ts.weeklyHours || 0;

      // Se não tem weeklyHours definido, calcular pelo horário gerado
      if (!weeklyClasses) {
        const timetable = timetables.find((t: any) => 
          t.slots?.some((s: any) => 
            s.teacherId === teacherId && 
            s.subjectId === subjectId && 
            s.classId === classId
          )
        );

        if (timetable) {
          weeklyClasses = timetable.slots.filter((s: any) => 
            s.teacherId === teacherId && 
            s.subjectId === subjectId && 
            s.classId === classId
          ).length;
        }
      }

      // Calcular quantas semanas letivas tem no mês
      const totalWeeks = Math.floor(schoolDays.length / 5); // Estimativa: 5 dias letivos = 1 semana
      const predictedClasses = weeklyClasses * totalWeeks;

      workloadBySubjectClass.push({
        subjectId: subject._id,
        subjectName: (subject as any).name,
        classId: classObj._id,
        className: (classObj as any).name,
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
      teacherName: (teacher as any).name,
      weeklyWorkload: (teacher as any).weeklyWorkload || 0,
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

    // Pré-carregar dados compartilhados (fora do loop de professores para performance)
    // Usar Date objects para query correta (SchoolDay.date é campo Date)
    const startOfMonth = new Date(Number(year), Number(month) - 1, 1);
    const endOfMonth = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
    // Strings para query de TeacherAttendance (date é campo String)
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const schoolDays = await SchoolDay.find({
      schoolId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
      dayType: { $in: ['regular', 'saturday'] }
    });

    // Buscar horários gerados (campo é 'school', não 'schoolId')
    const timetables = await GeneratedTimetable.find({ school: schoolId });

    // Pré-carregar todas as disciplinas e turmas para evitar N+1 queries
    // Subject tem schoolId, Class tem userId - usar IDs dos horários para carregar
    const allClassIds = [...new Set(timetables.map((t: any) => t.classId?.toString()).filter(Boolean))];
    const allSubjectIds = [...new Set(
      timetables.flatMap((t: any) => t.slots?.map((s: any) => s.subjectId?.toString()).filter(Boolean) || [])
    )];
    const allSubjects = await Subject.find(allSubjectIds.length > 0 ? { _id: { $in: allSubjectIds } } : { schoolId });
    const allClasses = await Class.find(allClassIds.length > 0 ? { _id: { $in: allClassIds } } : {});
    const subjectMap = new Map(allSubjects.map((s: any) => [s._id.toString(), s]));
    const classMap = new Map(allClasses.map((c: any) => [c._id.toString(), c]));

    // Mapear dias da semana para comparação com slots do horário
    const getDayName = (schoolDay: any): string => {
      // Se for sábado de reposição, usar o dia que ele segue
      if (schoolDay.dayType === 'saturday' && schoolDay.followWeekday) {
        const weekdayMap: { [key: string]: string } = {
          'monday': 'Segunda',
          'tuesday': 'Terça',
          'wednesday': 'Quarta',
          'thursday': 'Quinta',
          'friday': 'Sexta'
        };
        return weekdayMap[schoolDay.followWeekday] || '';
      }
      // Dia normal - schoolDay.date é um Date object do MongoDB
      const dateObj = new Date(schoolDay.date);
      const dayMap: { [key: number]: string } = {
        0: 'Domingo',
        1: 'Segunda',
        2: 'Terça',
        3: 'Quarta',
        4: 'Quinta',
        5: 'Sexta',
        6: 'Sábado'
      };
      return dayMap[dateObj.getUTCDay()] || '';
    };

    for (const teacher of teachers) {
      // Buscar disciplinas e turmas do professor (TeacherSubject tem String IDs, não refs)
      const teacherSubjects = await TeacherSubject.find({ 
        teacherId: teacher._id, 
        schoolId 
      });

      // Buscar registros de frequência do mês (TeacherAttendance.date é String)
      const attendanceRecords = await TeacherAttendance.find({
        schoolId,
        teacherId: teacher._id,
        date: { $gte: startDateStr, $lte: endDateStr }
      });

      const subjectClassDetails = [];
      let totalPredicted = 0;
      let totalGiven = 0;

      // Rastrear pares subjectId+classId já processados via TeacherSubject
      const processedPairs = new Set<string>();

      for (const ts of teacherSubjects) {
        // subjectId e classId são String simples (sem ref), NÃO usar .populate()
        const subjectId = ts.subjectId?.toString();
        const classId = ts.classId?.toString();

        if (!subjectId || !classId) continue;

        // Buscar documentos reais de Subject e Class pelo mapa pré-carregado
        const subject = subjectMap.get(subjectId);
        const classObj = classMap.get(classId);

        if (!subject || !classObj) continue;

        const pairKey = `${subjectId}_${classId}`;
        processedPairs.add(pairKey);

        // CONTAR AULAS PREVISTAS por disciplina/turma no calendário letivo
        let predicted = 0;
        
        for (const schoolDay of schoolDays) {
          const targetDay = getDayName(schoolDay);
          if (!targetDay) continue;
          
          // Contar aulas do professor nesta disciplina/turma neste dia
          for (const timetable of timetables) {
            if (timetable.slots && timetable.classId?.toString() === classId) {
              const classesInDay = timetable.slots.filter((slot: any) => 
                slot.day === targetDay &&
                slot.teacherId === teacher._id.toString() &&
                slot.subjectId === subjectId
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
              cls.subjectId === subjectId &&
              cls.classId === classId
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
          subjectName: (subject as any).name,
          classId: classObj._id,
          className: (classObj as any).name,
          predictedClasses: predicted,
          givenClasses: given,
          deficit,
          surplus
        });
      }

      // FALLBACK: Incluir pares de disciplina/turma dos registros de frequência
      // que NÃO estão em TeacherSubject (ex: aulas do horário sem lotação cadastrada)
      for (const record of attendanceRecords) {
        if (!record.classes || !Array.isArray(record.classes)) continue;
        
        for (const cls of record.classes as any[]) {
          const pairKey = `${cls.subjectId}_${cls.classId}`;
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          // Contar aulas dadas desta combinação em TODOS os registros
          let given = 0;
          for (const r of attendanceRecords) {
            if (r.classes && Array.isArray(r.classes)) {
              given += r.classes.filter((c: any) =>
                c.status === 'present' &&
                c.subjectId === cls.subjectId &&
                c.classId === cls.classId
              ).length;
            }
          }

          // Contar aulas previstas do horário
          let predicted = 0;
          for (const schoolDay of schoolDays) {
            const targetDay = getDayName(schoolDay);
            if (!targetDay) continue;
            for (const timetable of timetables) {
              if (timetable.slots && timetable.classId?.toString() === cls.classId) {
                predicted += timetable.slots.filter((slot: any) =>
                  slot.day === targetDay &&
                  slot.teacherId === teacher._id.toString() &&
                  slot.subjectId === cls.subjectId
                ).length;
              }
            }
          }

          const deficit = predicted > given ? predicted - given : 0;
          const surplus = given > predicted ? given - predicted : 0;
          totalPredicted += predicted;
          totalGiven += given;

          subjectClassDetails.push({
            subjectId: cls.subjectId,
            subjectName: cls.subjectName || (subjectMap.get(cls.subjectId) as any)?.name || 'Disciplina',
            classId: cls.classId,
            className: cls.className || (classMap.get(cls.classId) as any)?.name || 'Turma',
            predictedClasses: predicted,
            givenClasses: given,
            deficit,
            surplus
          });
        }
      }

      const totalDeficit = totalPredicted > totalGiven ? totalPredicted - totalGiven : 0;
      const totalSurplus = totalGiven > totalPredicted ? totalGiven - totalPredicted : 0;

      // Incluir professor no relatório se tiver dados (TeacherSubject OU frequência)
      if (subjectClassDetails.length > 0 || attendanceRecords.length > 0) {
        reports.push({
          teacherId: teacher._id,
          teacherName: teacher.name,
          weeklyWorkload: (teacher as any).weeklyWorkload || 0,
          totalPredictedClasses: totalPredicted,
          totalGivenClasses: totalGiven,
          totalDeficit,
          totalSurplus,
          subjectClassDetails
        });
      }
    }

    // Ordenar relatórios alfabeticamente por nome do professor
    reports.sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'pt-BR'));

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
