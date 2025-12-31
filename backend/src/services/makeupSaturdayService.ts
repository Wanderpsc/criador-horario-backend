import MakeupSaturday from '../models/MakeupSaturday';
import TeacherDebtRecord from '../models/TeacherDebtRecord';
import Teacher from '../models/Teacher';
import Subject from '../models/Subject';
import Class from '../models/Class';

/**
 * Processa um sábado de reposição após sua realização
 * - Marca débitos como pagos para professores presentes
 * - Cria novos débitos acumulados para professores ausentes
 */
export async function processSaturdayAfterRealization(saturdayId: string) {
  console.log('🔄 Processando sábado após realização:', saturdayId);

  const saturday = await MakeupSaturday.findById(saturdayId);
  if (!saturday) {
    throw new Error('Sábado de reposição não encontrado');
  }

  const attendedTeachers = saturday.attendedTeachers || [];
  const scheduledTeachers = new Set<string>();
  
  // Extrair todos os professores agendados
  Object.values(saturday.schedule).forEach((slots: any[]) => {
    slots.forEach(slot => {
      if (slot.teacherId) {
        scheduledTeachers.add(slot.teacherId);
      }
    });
  });

  // Identificar professores ausentes
  const absentTeachers = Array.from(scheduledTeachers).filter(
    teacherId => !attendedTeachers.includes(teacherId)
  );

  saturday.absentTeachers = absentTeachers;

  console.log('👥 Professores agendados:', scheduledTeachers.size);
  console.log('✅ Professores presentes:', attendedTeachers.length);
  console.log('❌ Professores ausentes:', absentTeachers.length);

  // Dar baixa nos débitos dos professores presentes
  let totalRealizedHours = 0;
  for (const teacherId of attendedTeachers) {
    const teacherSlots = Object.values(saturday.schedule).flat().filter(
      (slot: any) => slot.teacherId === teacherId
    );

    for (const slot of teacherSlots) {
      // Se tem debtRecordId vinculado, atualizar
      if (slot.debtRecordId) {
        const debt = await TeacherDebtRecord.findById(slot.debtRecordId);
        if (debt && !debt.isPaid) {
          debt.hoursPaid += 1;
          debt.paidDates.push(saturday.date);
          if (!debt.makeupSaturdayIds) debt.makeupSaturdayIds = [];
          debt.makeupSaturdayIds.push(saturdayId);
          
          if (debt.hoursPaid >= debt.hoursOwed) {
            debt.isPaid = true;
          }
          await debt.save();
          console.log(`💰 Débito ${debt._id} atualizado - ${debt.hoursPaid}/${debt.hoursOwed} horas pagas`);
        }
      }
      totalRealizedHours++;
    }
  }

  // Criar débitos acumulados para professores ausentes
  for (const teacherId of absentTeachers) {
    const teacherSlots = Object.values(saturday.schedule).flat().filter(
      (slot: any) => slot.teacherId === teacherId
    );

    console.log(`⚠️ Professor ${teacherId} faltou - criando ${teacherSlots.length} débito(s) acumulado(s)`);

    for (const slot of teacherSlots) {
      // Criar novo débito acumulado
      const accumulatedDebt = new TeacherDebtRecord({
        teacherId: slot.teacherId,
        classId: slot.classId,
        subjectId: slot.subjectId,
        hoursOwed: 1,
        hoursPaid: 0,
        absenceDate: saturday.date,
        emergencyScheduleId: saturdayId, // Usar o ID do sábado como referência
        reason: `Falta em sábado de reposição (${saturday.date.toLocaleDateString('pt-BR')})`,
        isPaid: false,
        isAccumulated: true,
        accumulatedFromSaturdayId: saturdayId
      });

      await accumulatedDebt.save();
      console.log(`📝 Débito acumulado criado: ${accumulatedDebt._id}`);
    }
  }

  // Atualizar status e estatísticas do sábado
  saturday.status = 'realized';
  saturday.totalRealizedHours = totalRealizedHours;
  saturday.totalScheduledHours = Array.from(scheduledTeachers).reduce((sum, teacherId) => {
    return sum + Object.values(saturday.schedule).flat().filter(
      (slot: any) => slot.teacherId === teacherId
    ).length;
  }, 0);

  await saturday.save();

  console.log('✅ Processamento concluído!');
  console.log(`   ${totalRealizedHours} horas realizadas`);
  console.log(`   ${absentTeachers.length} professor(es) com débitos acumulados`);

  return {
    saturday,
    totalRealizedHours,
    absentTeachers: absentTeachers.length,
    attendedTeachers: attendedTeachers.length
  };
}

/**
 * Busca todos os débitos pendentes de um professor (incluindo acumulados)
 */
export async function getTeacherPendingDebts(teacherId: string) {
  const debts = await TeacherDebtRecord.find({
    teacherId,
    isPaid: false
  }).sort({ absenceDate: 1 });

  const totalHoursOwed = debts.reduce((sum, d) => sum + (d.hoursOwed - d.hoursPaid), 0);
  
  // Separar débitos originais e acumulados
  const originalDebts = debts.filter(d => !d.isAccumulated);
  const accumulatedDebts = debts.filter(d => d.isAccumulated);

  return {
    debts,
    totalHoursOwed,
    totalDebts: debts.length,
    originalDebts: originalDebts.length,
    accumulatedDebts: accumulatedDebts.length
  };
}

/**
 * Gera automaticamente horário de sábado baseado nos débitos pendentes
 */
export async function generateSaturdayScheduleFromDebts(
  schoolId: string,
  saturdayDate: Date,
  maxPeriods: number = 4
) {
  console.log('🎯 Gerando horário de sábado automaticamente...');
  console.log('📅 Data:', saturdayDate);
  console.log('🏫 Escola:', schoolId);

  // Buscar todos os débitos pendentes
  const debts = await TeacherDebtRecord.find({
    isPaid: false
  }).sort({ 
    isAccumulated: -1, // Priorizar acumulados
    absenceDate: 1 // Mais antigos primeiro
  });

  console.log(`📊 ${debts.length} débito(s) pendente(s) encontrado(s)`);

  // Agrupar por professor
  const debtsByTeacher = new Map<string, any[]>();
  for (const debt of debts) {
    if (!debtsByTeacher.has(debt.teacherId)) {
      debtsByTeacher.set(debt.teacherId, []);
    }
    debtsByTeacher.get(debt.teacherId)!.push(debt);
  }

  // Buscar informações dos professores, disciplinas e turmas
  const teacherIds = Array.from(debtsByTeacher.keys());
  const teachers = await Teacher.find({ _id: { $in: teacherIds } });
  const subjects = await Subject.find({});
  const classes = await Class.find({});

  const teacherMap = new Map(teachers.map(t => [t._id.toString(), t]));
  const subjectMap = new Map(subjects.map(s => [s._id.toString(), s]));
  const classMap = new Map(classes.map(c => [c._id.toString(), c]));

  // Estrutura do horário: { classId: [slots] }
  const schedule: any = {};
  const teacherDebts: any[] = [];

  // Horários padrão (8h-12h, 4 períodos)
  const periods = [
    { period: 1, startTime: '08:00', endTime: '09:00' },
    { period: 2, startTime: '09:00', endTime: '10:00' },
    { period: 3, startTime: '10:00', endTime: '11:00' },
    { period: 4, startTime: '11:00', endTime: '12:00' }
  ];

  let currentPeriod = 0;

  // Distribuir débitos no horário
  for (const [teacherId, teacherDebts_] of debtsByTeacher) {
    const teacher = teacherMap.get(teacherId);
    if (!teacher) continue;

    const teacherDebtSummary: any = {
      teacherId,
      teacherName: teacher.name,
      totalHours: 0,
      details: []
    };

    for (const debt of teacherDebts_) {
      if (currentPeriod >= maxPeriods) break; // Limite de períodos

      const subject = subjectMap.get(debt.subjectId);
      const classInfo = classMap.get(debt.classId);
      
      if (!subject || !classInfo) continue;

      const hoursToSchedule = debt.hoursOwed - debt.hoursPaid;
      
      for (let i = 0; i < hoursToSchedule && currentPeriod < maxPeriods; i++) {
        const period = periods[currentPeriod];
        
        if (!schedule[debt.classId]) {
          schedule[debt.classId] = [];
        }

        schedule[debt.classId].push({
          period: period.period,
          startTime: period.startTime,
          endTime: period.endTime,
          teacherId: teacher._id.toString(),
          teacherName: teacher.name,
          subjectId: subject._id.toString(),
          subjectName: subject.name,
          classId: classInfo._id.toString(),
          className: classInfo.name,
          debtRecordId: debt._id.toString()
        });

        teacherDebtSummary.totalHours++;
        
        // Adicionar detalhe
        const existingDetail = teacherDebtSummary.details.find(
          (d: any) => d.classId === debt.classId && d.subjectId === debt.subjectId
        );
        if (existingDetail) {
          existingDetail.hours++;
        } else {
          teacherDebtSummary.details.push({
            classId: classInfo._id.toString(),
            className: classInfo.name,
            subjectId: subject._id.toString(),
            subjectName: subject.name,
            hours: 1
          });
        }

        currentPeriod++;
      }
    }

    if (teacherDebtSummary.totalHours > 0) {
      teacherDebts.push(teacherDebtSummary);
    }
  }

  console.log('✅ Horário gerado com sucesso!');
  console.log(`   ${Object.keys(schedule).length} turma(s)`);
  console.log(`   ${teacherDebts.length} professor(es)`);
  console.log(`   ${currentPeriod} período(s) preenchido(s)`);

  return {
    schedule,
    teacherDebts,
    totalScheduledHours: currentPeriod
  };
}
