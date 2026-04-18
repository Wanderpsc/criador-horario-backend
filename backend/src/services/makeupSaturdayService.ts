import MakeupSaturday from '../models/MakeupSaturday';
import TeacherDebtRecord from '../models/TeacherDebtRecord';
import Teacher from '../models/Teacher';
import Subject from '../models/Subject';
import Class from '../models/Class';
import TeacherSubject from '../models/TeacherSubject';

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
  maxPeriods: number = 4,
  lessonDuration: number = 60,
  startTime: string = '08:00',
  selectedTeacherIds?: string[] // Novo parâmetro: IDs dos professores selecionados
) {
  try {
    console.log('🎯 Gerando horário de sábado automaticamente...');
    console.log('📅 Data:', saturdayDate);
    console.log('🏫 Escola:', schoolId);
    console.log(`⏰ Configuração: ${maxPeriods} aulas de ${lessonDuration} minutos iniciando às ${startTime}`);
    if (selectedTeacherIds && selectedTeacherIds.length > 0) {
      console.log(`👥 Filtrando ${selectedTeacherIds.length} professores selecionados`);
    }

    // Buscar horários emergenciais com makeupClasses da escola
    console.log('📦 Importando modelo EmergencySchedule...');
    const EmergencySchedule = (await import('../models/EmergencySchedule')).default;
    console.log('✅ Modelo importado');
    
    // Primeiro, buscar TODOS os horários emergenciais da escola
    console.log('🔍 Buscando horários emergenciais...');
    let allSchedules: any[] = [];
    try {
      allSchedules = await EmergencySchedule.find({ school: schoolId }).sort({ date: 1 });
    } catch (castErr: any) {
      // schoolId pode não ser ObjectId válido; tentar sem filtro de escola
      console.warn('⚠️ Erro ao filtrar por school, buscando sem filtro de escola:', castErr.message);
      allSchedules = [];
    }
    console.log(`📋 Total de ${allSchedules.length} horário(s) emergencial(is) no banco para escola ${schoolId}`);
  
  // Filtrar os que têm makeupClasses pendentes (não repaid)
  const emergencySchedules = allSchedules.filter(schedule => 
    schedule.makeupClasses && schedule.makeupClasses.some((mc: any) => !mc.isRepaid)
  );
  
  console.log(`📚 ${emergencySchedules.length} horário(s) emergencial(is) com aulas de reposição`);
  
  if (emergencySchedules.length > 0) {
    console.log('📋 Exemplos de horários encontrados:');
    emergencySchedules.slice(0, 3).forEach(sch => {
      console.log(`   - ${sch.date} (${sch.dayOfWeek}): ${sch.makeupClasses?.length || 0} aulas`);
    });
  }

  // Extrair todos os makeupClasses
  const allMakeupClasses: any[] = [];
  emergencySchedules.forEach(schedule => {
    console.log(`   📋 Processando schedule ${schedule._id}:`, {
      date: schedule.date,
      makeupClassesLength: schedule.makeupClasses?.length || 0,
      absentTeacherNames: schedule.absentTeacherNames
    });
    
    if (schedule.makeupClasses && schedule.makeupClasses.length > 0) {
      // Apenas incluir makeupClasses ainda não abatidos
      const pending = schedule.makeupClasses.filter((mc: any) => !mc.isRepaid);
      console.log(`      ✅ Adicionando ${pending.length} makeupClasses pendentes (${schedule.makeupClasses.length - pending.length} já repaid)`);
      allMakeupClasses.push(...pending);
    } else {
      console.log(`      ⚠️ Sem makeupClasses para adicionar`);
    }
  });

  console.log(`📊 ${allMakeupClasses.length} aula(s) de reposição encontrada(s)`);
  
  if (allMakeupClasses.length === 0) {
    console.log('⚠️ ATENÇÃO: Nenhuma aula de reposição encontrada!');
    console.log('   Isso pode indicar que:');
    console.log('   1. Nenhum horário emergencial tem makeupClasses');
    console.log('   2. Os horários foram criados antes da implementação de makeupClasses');
    console.log('   3. Todos os professores ausentes já repuseram suas aulas');
  }
  
  if (allMakeupClasses.length > 0) {
    console.log('👥 Exemplos de professores com débitos:');
    const uniqueTeachers = new Set(allMakeupClasses.map(m => m.originalTeacherName));
    Array.from(uniqueTeachers).slice(0, 5).forEach(name => {
      console.log(`   - ${name}`);
    });
  }

  // Agrupar por professor
  const debtsByTeacher = new Map<string, any[]>();
  for (const makeup of allMakeupClasses) {
    const teacherId = makeup.originalTeacherId;
    
    // 🎯 FILTRAR: Se selectedTeacherIds foi fornecido, incluir apenas os selecionados
    if (selectedTeacherIds && selectedTeacherIds.length > 0) {
      if (!selectedTeacherIds.includes(teacherId)) {
        continue; // Pula professores não selecionados
      }
    }
    
    if (!debtsByTeacher.has(teacherId)) {
      debtsByTeacher.set(teacherId, []);
    }
    debtsByTeacher.get(teacherId)!.push(makeup);
  }
  
  console.log(`📊 ${debtsByTeacher.size} professor(es) incluído(s) no horário`);

  // Buscar informações dos professores
  const teacherIds = Array.from(debtsByTeacher.keys());
  const teachers = await Teacher.find({ _id: { $in: teacherIds } });

  const teacherMap = new Map(teachers.map(t => [t._id.toString(), t]));

  // Estrutura do horário: { classId: [slots] }
  const schedule: any = {};
  const teacherDebts: any[] = [];

  // Horários padrão (8h-12h, 4 períodos)
  // Gerar períodos dinamicamente baseado na duração das aulas
  const periods = [];
  const [initialHour, initialMinute] = startTime.split(':').map(Number);
  let startHour = initialHour;
  let startMinute = initialMinute;
  
  for (let i = 1; i <= maxPeriods; i++) {
    const endHour = startHour + Math.floor((startMinute + lessonDuration) / 60);
    const endMinute = (startMinute + lessonDuration) % 60;
    
    periods.push({
      period: i,
      startTime: `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
      endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`
    });
    
    startHour = endHour;
    startMinute = endMinute;
  }

  console.log('⏰ Períodos gerados:', periods);
  let currentPeriod = 0;

  // --- Fallback: se nenhum débito foi encontrado para os selecionados, usar TeacherSubject ---
  if (debtsByTeacher.size === 0 && selectedTeacherIds && selectedTeacherIds.length > 0) {
    console.log('⚠️ Nenhum débito encontrado — usando TeacherSubject como fallback');
    const assignments = await TeacherSubject.find({ teacherId: { $in: selectedTeacherIds } });
    const fallbackTeachers = await Teacher.find({ _id: { $in: selectedTeacherIds } });
    const fallbackTeacherMap = new Map(fallbackTeachers.map(t => [t._id.toString(), t]));
    const subjectIds = [...new Set(assignments.map(a => a.subjectId))];
    const classIds = [...new Set(assignments.map(a => a.classId).filter(Boolean))];
    const subjects = await Subject.find({ _id: { $in: subjectIds } });
    const classes = await Class.find({ _id: { $in: classIds } }).populate('gradeId');
    const subjectMap = new Map(subjects.map(s => [s._id.toString(), s]));
    const classMap = new Map(classes.map(c => [c._id.toString(), c]));

    // Rastrear períodos usados por professor e por turma para evitar conflitos
    const teacherUsedPeriods = new Map<string, Set<number>>();
    const classUsedPeriods = new Map<string, Set<number>>();
    const seenTeachers = new Set<string>();

    for (const assignment of assignments) {
      const teacher = fallbackTeacherMap.get(assignment.teacherId?.toString());
      if (!teacher) continue;
      const subject = subjectMap.get(assignment.subjectId?.toString());
      if (!assignment.classId) continue;
      const cls = classMap.get(assignment.classId.toString());
      if (!cls) continue;

      const teacherId = teacher._id.toString();
      const classId = cls._id.toString();

      // Encontrar o primeiro período livre para este professor E esta turma
      const teacherBusy = teacherUsedPeriods.get(teacherId) || new Set<number>();
      const classBusy = classUsedPeriods.get(classId) || new Set<number>();
      let availablePeriod: typeof periods[0] | null = null;
      for (let p = 1; p <= maxPeriods; p++) {
        if (!teacherBusy.has(p) && !classBusy.has(p)) {
          availablePeriod = periods[p - 1];
          teacherBusy.add(p);
          classBusy.add(p);
          break;
        }
      }
      if (!availablePeriod) continue; // sem período disponível sem conflito

      teacherUsedPeriods.set(teacherId, teacherBusy);
      classUsedPeriods.set(classId, classBusy);

      if (!schedule[classId]) schedule[classId] = [];
      schedule[classId].push({
        period: availablePeriod.period,
        startTime: availablePeriod.startTime,
        endTime: availablePeriod.endTime,
        teacherId,
        teacherName: teacher.name,
        subjectId: subject?._id.toString() || assignment.subjectId,
        subjectName: subject?.name || '',
        classId,
        className: `${(cls as any).gradeId?.name || ''} - ${cls.name}`.replace(/^- /, '').trim(),
      });
      if (!seenTeachers.has(teacherId)) {
        teacherDebts.push({ teacherId, teacherName: teacher.name, totalHours: 0, details: [] });
        seenTeachers.add(teacherId);
      }
    }
    const fallbackSlots = Object.values(schedule).reduce((s: number, arr: any) => s + arr.length, 0);
    console.log(`✅ Fallback: ${fallbackSlots} slot(s) gerado(s) a partir de TeacherSubject para ${seenTeachers.size} professor(es)`);
    return { schedule, teacherDebts, totalScheduledHours: fallbackSlots };
  }

  // Distribuir débitos no horário — sem conflitos de professor ou turma
  const teacherUsedPeriodsDebts = new Map<string, Set<number>>();
  const classUsedPeriodsDebts = new Map<string, Set<number>>();
  let totalSlots = 0;

  for (const [teacherId, makeupClasses] of debtsByTeacher) {
    const teacher = teacherMap.get(teacherId);
    if (!teacher) continue;

    const teacherDebtSummary: any = {
      teacherId,
      teacherName: teacher.name,
      totalHours: 0,
      details: []
    };

    for (const makeup of makeupClasses) {
      const classId = makeup.classId;

      // Encontrar o primeiro período livre para este professor E esta turma
      const teacherBusy = teacherUsedPeriodsDebts.get(teacherId) || new Set<number>();
      const classBusy = classUsedPeriodsDebts.get(classId) || new Set<number>();
      let availablePeriod: typeof periods[0] | null = null;
      for (let p = 1; p <= maxPeriods; p++) {
        if (!teacherBusy.has(p) && !classBusy.has(p)) {
          availablePeriod = periods[p - 1];
          teacherBusy.add(p);
          classBusy.add(p);
          break;
        }
      }
      if (!availablePeriod) continue; // sem período disponível sem conflito

      teacherUsedPeriodsDebts.set(teacherId, teacherBusy);
      classUsedPeriodsDebts.set(classId, classBusy);

      const period = availablePeriod;
      if (!schedule[classId]) {
        schedule[classId] = [];
      }

      schedule[classId].push({
        period: period.period,
        startTime: period.startTime,
        endTime: period.endTime,
        teacherId: teacher._id.toString(),
        teacherName: teacher.name,
        subjectId: makeup.subjectId,
        subjectName: makeup.subjectName,
        classId: makeup.classId,
        className: `${makeup.gradeName} - ${makeup.className}`,
        makeupClassId: makeup._id
      });

      teacherDebtSummary.totalHours++;
      totalSlots++;

      const existingDetail = teacherDebtSummary.details.find(
        (d: any) => d.classId === classId && d.subjectId === makeup.subjectId
      );
      if (existingDetail) {
        existingDetail.hours++;
      } else {
        teacherDebtSummary.details.push({
          classId: makeup.classId,
          className: `${makeup.gradeName} - ${makeup.className}`,
          subjectId: makeup.subjectId,
          subjectName: makeup.subjectName,
          hours: 1
        });
      }
    }

    if (teacherDebtSummary.totalHours > 0) {
      teacherDebts.push(teacherDebtSummary);
    }
  }

  console.log('✅ Horário gerado com sucesso!');
  console.log(`   ${Object.keys(schedule).length} turma(s)`);
  console.log(`   ${teacherDebts.length} professor(es)`);
  console.log(`   ${totalSlots} slot(s) preenchido(s)`);

  return {
    schedule,
    teacherDebts,
    totalScheduledHours: totalSlots
  };
  } catch (error: any) {
    console.error('❌ ERRO em generateSaturdayScheduleFromDebts:', error);
    console.error('❌ Stack:', error.stack);
    console.error('❌ Mensagem:', error.message);
    throw error;
  }
}
