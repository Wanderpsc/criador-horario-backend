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
import ClassPayment from '../models/ClassPayment';

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
    const { month, year, startDate: startDateParam, endDate: endDateParam } = req.query;
    const schoolId = req.user?.schoolId || req.user?.id;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID não encontrado' });
    }

    // Aceitar período customizado (startDate/endDate) OU mês/ano
    let startOfMonth: Date;
    let endOfMonth: Date;
    let startDateStr: string;
    let endDateStr: string;
    let reportMonth: number;
    let reportYear: number;

    if (startDateParam && endDateParam) {
      // Período customizado
      startOfMonth = new Date(String(startDateParam) + 'T00:00:00');
      endOfMonth = new Date(String(endDateParam) + 'T23:59:59.999');
      startDateStr = String(startDateParam);
      endDateStr = String(endDateParam);
      reportMonth = startOfMonth.getMonth() + 1;
      reportYear = startOfMonth.getFullYear();
    } else {
      if (!month || !year) {
        return res.status(400).json({ message: 'Mês e ano são obrigatórios (ou use startDate/endDate)' });
      }
      startOfMonth = new Date(Number(year), Number(month) - 1, 1);
      endOfMonth = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      endDateStr = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      reportMonth = Number(month);
      reportYear = Number(year);
    }

    // Buscar todos os professores ativos
    const teachers = await Teacher.find({ schoolId, isActive: true });

    const reports = [];

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

    // Pré-carregar todos os pagamentos do período antes do loop de professores
    const allPaymentsPre = await ClassPayment.find({
      schoolId,
      date: { $gte: startDateStr, $lte: endDateStr },
    }).sort({ date: 1, period: 1 });

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

      // Indexar registros de frequência por data para lookup rápido
      const attendanceByDate = new Map<string, any>();
      for (const record of attendanceRecords) {
        attendanceByDate.set(record.date, record);
      }

      // Data de hoje para saber quais dias já passaram
      const today = new Date();
      today.setHours(23, 59, 59, 999);

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

        // CONTAR AULAS PREVISTAS e DADAS por disciplina/turma dia a dia
        let predicted = 0;
        let given = 0;
        
        for (const schoolDay of schoolDays) {
          const targetDay = getDayName(schoolDay);
          if (!targetDay) continue;
          
          // Contar aulas do professor nesta disciplina/turma neste dia no horário
          let scheduledInDay = 0;
          for (const timetable of timetables) {
            if (timetable.slots && timetable.classId?.toString() === classId) {
              scheduledInDay += timetable.slots.filter((slot: any) => 
                slot.day === targetDay &&
                slot.teacherId === teacher._id.toString() &&
                slot.subjectId === subjectId
              ).length;
            }
          }
          
          predicted += scheduledInDay;

          // Só contar aulas dadas para dias que já passaram (até hoje)
          const schoolDayDate = new Date(schoolDay.date);
          if (schoolDayDate <= today && scheduledInDay > 0) {
            // Formatar data como string YYYY-MM-DD para buscar no registro de frequência
            const dayStr = schoolDayDate.toISOString().split('T')[0];
            const record = attendanceByDate.get(dayStr);

            if (record && record.classes && Array.isArray(record.classes)) {
              // Tem registro de frequência: contar aulas com status 'present'
              const classesPresent = record.classes.filter((cls: any) => 
                cls.status === 'present' &&
                cls.subjectId === subjectId &&
                cls.classId === classId
              ).length;
              // Aulas com status 'absent' explícito não contam
              given += classesPresent;
            } else {
              // SEM registro de frequência para este dia passado:
              // Assumir que todas as aulas previstas foram dadas (professor presente)
              given += scheduledInDay;
            }
          }
        }

        const deficit = predicted > given ? predicted - given : 0;
        const surplus = given > predicted ? given - predicted : 0;

        totalPredicted += predicted;
        totalGiven += given;

        // Coletar datas de ausência com status de pagamento para esta disciplina/turma
        const absenceDates: any[] = [];
        for (const rec of attendanceRecords) {
          if (!rec.classes || !Array.isArray(rec.classes)) continue;
          const absentEntries = (rec.classes as any[]).filter(
            (c: any) => c.status === 'absent' && c.subjectId === subjectId && c.classId === classId
          );
          for (const entry of absentEntries) {
            const payment = allPaymentsPre.find(p =>
              p.absentTeacherId === teacher._id.toString() &&
              p.date === rec.date &&
              p.classId === classId
            );
            absenceDates.push({
              date: rec.date,
              period: entry.period ?? null,
              paymentStatus: payment ? payment.status : null,
              paymentDate: payment ? (payment.filledAt || (payment as any).updatedAt || null) : null,
              substituteTeacherName: payment?.substituteTeacherName || null,
            });
          }
        }
        absenceDates.sort((a, b) => a.date.localeCompare(b.date));

        subjectClassDetails.push({
          subjectId: subject._id,
          subjectName: (subject as any).name,
          classId: classObj._id,
          className: (classObj as any).name,
          predictedClasses: predicted,
          givenClasses: given,
          deficit,
          surplus,
          absenceDates,
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

          // Contar aulas dadas/previstas dia a dia (mesma lógica)
          let given = 0;
          let predicted = 0;

          for (const schoolDay of schoolDays) {
            const targetDay = getDayName(schoolDay);
            if (!targetDay) continue;

            let scheduledInDay = 0;
            for (const timetable of timetables) {
              if (timetable.slots && timetable.classId?.toString() === cls.classId) {
                scheduledInDay += timetable.slots.filter((slot: any) =>
                  slot.day === targetDay &&
                  slot.teacherId === teacher._id.toString() &&
                  slot.subjectId === cls.subjectId
                ).length;
              }
            }

            predicted += scheduledInDay;

            const schoolDayDate = new Date(schoolDay.date);
            if (schoolDayDate <= today && scheduledInDay > 0) {
              const dayStr = schoolDayDate.toISOString().split('T')[0];
              const dayRecord = attendanceByDate.get(dayStr);

              if (dayRecord && dayRecord.classes && Array.isArray(dayRecord.classes)) {
                given += dayRecord.classes.filter((c: any) =>
                  c.status === 'present' &&
                  c.subjectId === cls.subjectId &&
                  c.classId === cls.classId
                ).length;
              } else {
                given += scheduledInDay;
              }
            }
          }

          const deficit = predicted > given ? predicted - given : 0;
          const surplus = given > predicted ? given - predicted : 0;
          totalPredicted += predicted;
          totalGiven += given;

          // Coletar datas de ausência para fallback
          const absenceDatesFallback: any[] = [];
          for (const rec of attendanceRecords) {
            if (!rec.classes || !Array.isArray(rec.classes)) continue;
            const absentEntries = (rec.classes as any[]).filter(
              (c: any) => c.status === 'absent' && c.subjectId === cls.subjectId && c.classId === cls.classId
            );
            for (const entry of absentEntries) {
              const payment = allPaymentsPre.find(p =>
                p.absentTeacherId === teacher._id.toString() &&
                p.date === rec.date &&
                p.classId === cls.classId
              );
              absenceDatesFallback.push({
                date: rec.date,
                period: entry.period ?? null,
                paymentStatus: payment ? payment.status : null,
                paymentDate: payment ? (payment.filledAt || (payment as any).updatedAt || null) : null,
                substituteTeacherName: payment?.substituteTeacherName || null,
              });
            }
          }
          absenceDatesFallback.sort((a, b) => a.date.localeCompare(b.date));

          subjectClassDetails.push({
            subjectId: cls.subjectId,
            subjectName: cls.subjectName || (subjectMap.get(cls.subjectId) as any)?.name || 'Disciplina',
            classId: cls.classId,
            className: cls.className || (classMap.get(cls.classId) as any)?.name || 'Turma',
            predictedClasses: predicted,
            givenClasses: given,
            deficit,
            surplus,
            absenceDates: absenceDatesFallback,
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

    // ──────────────────────────────────────────────────────
    // Enriquecer relatório com dados de Pagamento de Aulas
    // ──────────────────────────────────────────────────────
    const allPayments = allPaymentsPre;

    for (const report of reports) {
      const tid = report.teacherId.toString();

      // Aulas cobertas por substituto (professor estava ausente, alguém cobriu)
      const coveredBySubstitute = allPayments
        .filter(p => p.absentTeacherId === tid && p.substituteTeacherName)
        .map(p => ({
          date: p.date,
          period: p.period,
          startTime: p.startTime,
          endTime: p.endTime,
          className: p.className,
          subjectName: p.subjectName,
          substituteTeacherName: p.substituteTeacherName,
          status: p.status,
          filledViaLink: p.filledViaLink,
          paymentId: p._id,
        }));

      // Aulas dadas como substituto (esse professor cobriu ausência de outro)
      const givenAsSubstitute = allPayments
        .filter(p => p.substituteTeacherName === report.teacherName ||
                     (p.substituteTeacherId && p.substituteTeacherId === tid))
        .map(p => ({
          date: p.date,
          period: p.period,
          startTime: p.startTime,
          endTime: p.endTime,
          className: p.className,
          subjectName: p.subjectName,
          absentTeacherName: p.absentTeacherName,
          status: p.status,
          filledViaLink: p.filledViaLink,
          paymentId: p._id,
        }));

      (report as any).coveredBySubstitute = coveredBySubstitute;
      (report as any).givenAsSubstitute = givenAsSubstitute;
      (report as any).totalCoveredClasses = coveredBySubstitute.length;
      (report as any).totalSubstituteClasses = givenAsSubstitute.length;
    }

    res.json({
      month: reportMonth,
      year: reportYear,
      startDate: startDateStr,
      endDate: endDateStr,
      totalTeachers: teachers.length,
      reports
    });

  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório', error: error.message });
  }
});

export default router;
