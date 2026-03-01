/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * E-mail: wanderpsc@gmail.com
 * Todos os direitos reservados.
 * 
 * Serviço de Geração Automática de Horários
 */

import mongoose from 'mongoose';
import Teacher from '../models/Teacher';
import Subject from '../models/Subject';
import Timetable from '../models/Timetable';
import TeacherSubject from '../models/TeacherSubject';

interface GridCell {
  day: number;
  period: number;
  teacherId?: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
}

interface ConflictInfo {
  type: 'teacher_conflict' | 'consecutive_subject' | 'workload_exceeded' | 'no_available_slots';
  message: string;
  day?: number;
  period?: number;
}

interface GenerationResult {
  success: boolean;
  message: string;
  timetableId?: mongoose.Types.ObjectId;
  conflicts?: ConflictInfo[];
  stats?: {
    totalSlots: number;
    assignedSlots: number;
    emptySlots: number;
  };
}

interface GenerationOptions {
  userId: string;
  scheduleId: string;
  name: string;
  year: number;
  semester: string;
  daysOfWeek: number; // 5 (seg-sex), 6 (incluindo sáb)
  periodsPerDay: number; // ex: 8 períodos
  saturdayEquivalent?: number; // equivalência de sábado em períodos
  avoidConsecutive?: boolean; // evitar matérias consecutivas (default: true)
  distributeEvenly?: boolean; // distribuir carga uniformemente (default: true)
  compactTeacherSchedule?: boolean; // compactar aulas do professor no mesmo dia (default: true)
  compactnessMode?: 'normal' | 'aggressive'; // intensidade da compactação (default: aggressive)
  strictSubjectAllocation?: boolean; // exige 100% da carga de todas disciplinas (default: true)
  requireAllTeachersAllocated?: boolean; // exige ao menos 1 aula por professor quando possível (default: true)
}

type SubjectCategory = 'core' | 'study' | 'regular';

/**
 * Gera um horário automaticamente evitando conflitos
 */
export async function generateTimetable(options: GenerationOptions): Promise<GenerationResult> {
  try {
    const {
      userId,
      scheduleId,
      name,
      year,
      semester,
      daysOfWeek,
      periodsPerDay,
      saturdayEquivalent,
      avoidConsecutive = true,
      distributeEvenly = true,
      compactTeacherSchedule = true,
      compactnessMode = 'aggressive',
      strictSubjectAllocation = true,
      requireAllTeachersAllocated = true
    } = options;

    // Buscar professores e disciplinas do usuário
    const teachers = await Teacher.find({ userId }).lean();
    const subjects = await Subject.find({ userId }).lean();
    const teacherSubjects = await TeacherSubject.find({ userId }).lean();

    if (teachers.length === 0) {
      return {
        success: false,
        message: 'Nenhum professor cadastrado. Por favor, cadastre professores antes de gerar o horário.'
      };
    }

    if (subjects.length === 0) {
      return {
        success: false,
        message: 'Nenhuma disciplina cadastrada. Por favor, cadastre disciplinas antes de gerar o horário.'
      };
    }

    const totalSlots = daysOfWeek * periodsPerDay;
    const totalWorkload = subjects.reduce((sum, subject) => sum + (subject.workload || subject.workloadHours || 0), 0);

    const normalizeText = (value: string): string =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();

    const coreSubjectKeywords = [
      'MATEMATICA',
      'FISICA',
      'QUIMICA',
      'PORTUGUES',
      'BIOLOGIA',
      'GEOGRAFIA',
      'HISTORIA'
    ];

    const studySubjectKeywords = [
      'HORARIO DE ESTUDO',
      'HORARIOS DE ESTUDO',
      'ESTUDOS DIRIGIDOS',
      'ESTUDO DIRIGIDO',
      'MONITORIA / HORARIO DE ESTUDO',
      'MONITORIA/HORARIO DE ESTUDO'
    ];

    const getSubjectCategory = (subjectName: string): SubjectCategory => {
      const normalizedName = normalizeText(subjectName);

      if (coreSubjectKeywords.some((keyword) => normalizedName.includes(keyword))) {
        return 'core';
      }

      if (studySubjectKeywords.some((keyword) => normalizedName.includes(keyword))) {
        return 'study';
      }

      return 'regular';
    };

    const isStudyCategory = (category: SubjectCategory): boolean => category === 'study';

    // Validar se há slots suficientes
    if (totalWorkload > totalSlots) {
      return {
        success: false,
        message: `Carga horária total (${totalWorkload} aulas) excede os períodos disponíveis (${totalSlots}). Reduza a carga horária das disciplinas.`
      };
    }

    // Criar grade vazia
    const grid: (GridCell | null)[][] = Array(daysOfWeek)
      .fill(null)
      .map((_, day) =>
        Array(periodsPerDay)
          .fill(null)
          .map((_, period) => ({ day, period }))
      );

    // Mapas para controle de conflitos
    const teacherUsage = new Map<string, Set<string>>(); // teacherId -> Set("day-period")
    const teacherAssignedLessons = new Map<string, number>(); // teacherId -> total de aulas
    const conflicts: ConflictInfo[] = [];

    for (const teacher of teachers) {
      teacherAssignedLessons.set(teacher._id.toString(), 0);
    }

    // Função para verificar se a atribuição é válida
    const isValidAssignment = (
      teacherId: mongoose.Types.ObjectId,
      subjectId: mongoose.Types.ObjectId,
      subjectCategory: SubjectCategory,
      day: number,
      period: number,
      allowConsecutiveInClass: boolean
    ): boolean => {
      const slotKey = `${day}-${period}`;
      const teacherIdStr = teacherId.toString();

      // Verificar se professor já está ocupado neste horário
      if (teacherUsage.get(teacherIdStr)?.has(slotKey)) {
        return false;
      }

      // Verificar disponibilidade do professor (se configurada)
      // TODO: Implementar verificação de disponibilidade com availabilityNotes
      // const teacher = teachers.find(t => t._id.toString() === teacherIdStr);

      // Verificar matérias consecutivas
      if (avoidConsecutive && !allowConsecutiveInClass) {
        const subjectIdStr = subjectId.toString();
        
        // Verificar período anterior
        if (period > 0 && grid[day][period - 1]?.subjectId?.toString() === subjectIdStr) {
          return false;
        }
        
        // Verificar próximo período
        if (period < periodsPerDay - 1 && grid[day][period + 1]?.subjectId?.toString() === subjectIdStr) {
          return false;
        }
      }

      if (isStudyCategory(subjectCategory)) {
        const previousSubjectId = period > 0 ? grid[day][period - 1]?.subjectId?.toString() : undefined;
        const nextSubjectId = period < periodsPerDay - 1 ? grid[day][period + 1]?.subjectId?.toString() : undefined;

        const previousCell = previousSubjectId
          ? subjects.find((item) => item._id.toString() === previousSubjectId)
          : undefined;
        const nextCell = nextSubjectId
          ? subjects.find((item) => item._id.toString() === nextSubjectId)
          : undefined;

        if (
          (previousCell && isStudyCategory(getSubjectCategory(previousCell.name))) ||
          (nextCell && isStudyCategory(getSubjectCategory(nextCell.name)))
        ) {
          return false;
        }
      }

      return true;
    };

    // Função para marcar atribuição
    const markAssignment = (
      teacherId: mongoose.Types.ObjectId,
      subjectId: mongoose.Types.ObjectId,
      day: number,
      period: number
    ) => {
      const slotKey = `${day}-${period}`;
      const teacherIdStr = teacherId.toString();

      if (!teacherUsage.has(teacherIdStr)) {
        teacherUsage.set(teacherIdStr, new Set());
      }
      teacherUsage.get(teacherIdStr)!.add(slotKey);
      teacherAssignedLessons.set(
        teacherIdStr,
        (teacherAssignedLessons.get(teacherIdStr) || 0) + 1
      );

      grid[day][period] = {
        day,
        period,
        teacherId,
        subjectId
      };
    };

    const reassignTeacherInSlot = (
      fromTeacherId: mongoose.Types.ObjectId,
      toTeacherId: mongoose.Types.ObjectId,
      day: number,
      period: number
    ) => {
      const slotKey = `${day}-${period}`;
      const fromTeacherIdStr = fromTeacherId.toString();
      const toTeacherIdStr = toTeacherId.toString();

      teacherUsage.get(fromTeacherIdStr)?.delete(slotKey);
      if (!teacherUsage.has(toTeacherIdStr)) {
        teacherUsage.set(toTeacherIdStr, new Set());
      }
      teacherUsage.get(toTeacherIdStr)!.add(slotKey);

      teacherAssignedLessons.set(
        fromTeacherIdStr,
        Math.max(0, (teacherAssignedLessons.get(fromTeacherIdStr) || 0) - 1)
      );
      teacherAssignedLessons.set(
        toTeacherIdStr,
        (teacherAssignedLessons.get(toTeacherIdStr) || 0) + 1
      );

      if (grid[day][period]) {
        grid[day][period]!.teacherId = toTeacherId;
      }
    };

    // Calcula pontuação para compactar as aulas do professor em blocos consecutivos
    const evaluateTeacherSlotScore = (
      teacherId: mongoose.Types.ObjectId,
      day: number,
      period: number
    ): number => {
      if (!compactTeacherSchedule) {
        return Math.random();
      }

      const teacherIdStr = teacherId.toString();
      const usage = teacherUsage.get(teacherIdStr);
      const periodsByDay = new Map<number, Set<number>>();
      const aggressive = compactnessMode === 'aggressive';

      if (usage) {
        for (const slot of usage) {
          const [slotDayStr, slotPeriodStr] = slot.split('-');
          const slotDay = Number(slotDayStr);
          const slotPeriod = Number(slotPeriodStr);

          if (!periodsByDay.has(slotDay)) {
            periodsByDay.set(slotDay, new Set());
          }
          periodsByDay.get(slotDay)!.add(slotPeriod);
        }
      }

      if (!periodsByDay.has(day)) {
        periodsByDay.set(day, new Set());
      }
      periodsByDay.get(day)!.add(period);

      let isolatedLessons = 0;
      let blocks = 0;
      let activeDays = 0;
      let internalGaps = 0;
      let leadingGaps = 0;
      let lastOccupiedPeriodSum = 0;

      for (const dayPeriods of periodsByDay.values()) {
        if (dayPeriods.size === 0) {
          continue;
        }

        activeDays++;
        const sortedPeriods = Array.from(dayPeriods).sort((a, b) => a - b);
        const firstPeriod = sortedPeriods[0];
        const lastPeriod = sortedPeriods[sortedPeriods.length - 1];

        leadingGaps += firstPeriod;
        lastOccupiedPeriodSum += lastPeriod;
        internalGaps += (lastPeriod - firstPeriod + 1) - sortedPeriods.length;

        for (let i = 0; i < sortedPeriods.length; i++) {
          const current = sortedPeriods[i];
          const prev = sortedPeriods[i - 1];
          const next = sortedPeriods[i + 1];

          if (i === 0 || current !== prev + 1) {
            blocks++;
          }

          const hasPreviousAdjacent = prev !== undefined && prev === current - 1;
          const hasNextAdjacent = next !== undefined && next === current + 1;
          if (!hasPreviousAdjacent && !hasNextAdjacent) {
            isolatedLessons++;
          }
        }
      }

      const score = -(
        isolatedLessons * (aggressive ? 180 : 100) +
        internalGaps * (aggressive ? 140 : 80) +
        blocks * (aggressive ? 35 : 20) +
        activeDays * (aggressive ? 14 : 10) +
        leadingGaps * (aggressive ? 12 : 8) +
        lastOccupiedPeriodSum * (aggressive ? 5 : 3)
      );

      return score + Math.random() * 0.01;
    };

    const evaluatePeriodPreferenceScore = (
      subjectCategory: SubjectCategory,
      day: number,
      period: number
    ): number => {
      const normalizedPosition = periodsPerDay > 1 ? period / (periodsPerDay - 1) : 0;
      const morningWeight = 1 - normalizedPosition;
      const laterWeight = normalizedPosition;
      const middleWeight = 1 - Math.abs(normalizedPosition - 0.6) / 0.6;

      if (subjectCategory === 'core') {
        return morningWeight * 260 + middleWeight * 20;
      }

      if (subjectCategory === 'study') {
        const firstPeriodLimit = Math.max(2, Math.ceil(periodsPerDay * 0.25));
        const firstPeriodPenalty = period < firstPeriodLimit ? -320 : 0;
        return laterWeight * 230 + middleWeight * 90 + firstPeriodPenalty;
      }

      return laterWeight * 90 + middleWeight * 110;
    };

    const evaluateSubjectDistributionScore = (
      subjectId: mongoose.Types.ObjectId,
      day: number,
      targetPerDay: number
    ): number => {
      if (!distributeEvenly || targetPerDay <= 0) {
        return 0;
      }

      let lessonsOnDay = 0;
      for (let period = 0; period < periodsPerDay; period++) {
        if (grid[day][period]?.subjectId?.toString() === subjectId.toString()) {
          lessonsOnDay++;
        }
      }

      if (lessonsOnDay >= targetPerDay) {
        return -80;
      }

      return 40;
    };

    const evaluateImmediateTeacherCompactness = (
      teacherId: mongoose.Types.ObjectId,
      day: number,
      period: number
    ): number => {
      const teacherIdStr = teacherId.toString();
      const usage = teacherUsage.get(teacherIdStr);

      if (!usage || usage.size === 0) {
        return 0;
      }

      const previousBusy = usage.has(`${day}-${period - 1}`);
      const nextBusy = usage.has(`${day}-${period + 1}`);

      if (previousBusy && nextBusy) {
        return 120;
      }

      if (previousBusy || nextBusy) {
        return 75;
      }

      return -30;
    };

    const evaluateTeacherInclusionScore = (
      teacherId: mongoose.Types.ObjectId,
      remainingLessonsToAssign: number
    ): number => {
      const teacherIdStr = teacherId.toString();
      const assignedLessons = teacherAssignedLessons.get(teacherIdStr) || 0;

      if (assignedLessons > 0) {
        return 0;
      }

      const teachersWithoutLessons = Array.from(teacherAssignedLessons.values()).filter(
        (value) => value === 0
      ).length;

      if (remainingLessonsToAssign >= teachersWithoutLessons) {
        return 280;
      }

      return 40;
    };

    const prioritizedSubjects = [...subjects].sort((left, right) => {
      const leftCategory = getSubjectCategory(left.name);
      const rightCategory = getSubjectCategory(right.name);

      const categoryWeight: Record<SubjectCategory, number> = {
        core: 0,
        regular: 1,
        study: 2
      };

      const byCategory = categoryWeight[leftCategory] - categoryWeight[rightCategory];
      if (byCategory !== 0) {
        return byCategory;
      }

      const leftWorkload = left.workload || left.workloadHours || 0;
      const rightWorkload = right.workload || right.workloadHours || 0;
      return rightWorkload - leftWorkload;
    });

    // Distribuir disciplinas pela grade
    let totalAssignedLessons = 0;

    const subjectTeacherMap = new Map<string, Set<string>>();
    for (const association of teacherSubjects) {
      const subjectId = association.subjectId?.toString();
      const teacherId = association.teacherId?.toString();
      if (!subjectId || !teacherId) continue;

      if (!subjectTeacherMap.has(subjectId)) {
        subjectTeacherMap.set(subjectId, new Set());
      }
      subjectTeacherMap.get(subjectId)!.add(teacherId);
    }

    const teacherMaxLessons = new Map<string, number>();
    for (const teacher of teachers) {
      const teacherId = teacher._id.toString();
      const weeklyWorkload = Number((teacher as any).weeklyWorkload || 0);
      teacherMaxLessons.set(teacherId, weeklyWorkload > 0 ? weeklyWorkload : Number.POSITIVE_INFINITY);
    }

    for (const subject of prioritizedSubjects) {
      // Selecionar professores que podem lecionar esta disciplina
      const hoursToAssign = subject.workload || subject.workloadHours || 0;
      const subjectCategory = getSubjectCategory(subject.name);
      const subjectIdStr = subject._id.toString();
      const allowedTeacherIds = subjectTeacherMap.get(subjectIdStr) || new Set<string>();

      const availableTeachers = teachers.filter((teacher) => allowedTeacherIds.has(teacher._id.toString()));

      if (availableTeachers.length === 0) {
        conflicts.push({
          type: 'no_available_slots',
          message: `Disciplina "${subject.name}": sem professor lotado para lecionar.`
        });

        if (strictSubjectAllocation) {
          return {
            success: false,
            message: `Disciplina "${subject.name}" sem lotação de professor.`,
            conflicts
          };
        }

        continue;
      }
      
      // Distribuir uniformemente pelos dias
      const targetPerDay = distributeEvenly 
        ? Math.ceil(hoursToAssign / daysOfWeek) 
        : hoursToAssign;

      let assigned = 0;
      let attempts = 0;
      const maxAttempts = totalSlots * 3; // Mais tentativas para encontrar slots válidos

      while (assigned < hoursToAssign && attempts < maxAttempts) {
        attempts++;

        const allowConsecutiveInClass = attempts > totalSlots;

        const subjectId = new mongoose.Types.ObjectId(subject._id);
        let bestCandidate:
          | {
              teacherId: mongoose.Types.ObjectId;
              day: number;
              period: number;
              score: number;
            }
          | null = null;

        // Buscar melhor posição para compactar o horário do professor
        for (const teacher of availableTeachers) {
          const teacherId = new mongoose.Types.ObjectId(teacher._id);
          const teacherIdStr = teacherId.toString();
          const currentLessons = teacherAssignedLessons.get(teacherIdStr) || 0;
          const maxLessons = teacherMaxLessons.get(teacherIdStr) || Number.POSITIVE_INFINITY;

          if (currentLessons >= maxLessons) {
            continue;
          }

          for (let day = 0; day < daysOfWeek; day++) {
            for (let period = 0; period < periodsPerDay; period++) {
              if (grid[day][period]?.teacherId) {
                continue;
              }

              if (!isValidAssignment(teacherId, subjectId, subjectCategory, day, period, allowConsecutiveInClass)) {
                continue;
              }

              const score =
                evaluateTeacherSlotScore(teacherId, day, period) +
                evaluateImmediateTeacherCompactness(teacherId, day, period) +
                evaluatePeriodPreferenceScore(subjectCategory, day, period) +
                evaluateSubjectDistributionScore(subjectId, day, targetPerDay) +
                evaluateTeacherInclusionScore(teacherId, totalWorkload - totalAssignedLessons) -
                (Number.isFinite(maxLessons) ? (currentLessons / Math.max(1, maxLessons)) * 120 : 0);

              if (!bestCandidate || score > bestCandidate.score) {
                bestCandidate = { teacherId, day, period, score };
              }
            }
          }
        }

        if (bestCandidate) {
          markAssignment(
            bestCandidate.teacherId,
            subjectId,
            bestCandidate.day,
            bestCandidate.period
          );
          assigned++;
          totalAssignedLessons++;
        }
      }

      // Registrar se não conseguiu alocar todas as aulas
      if (assigned < hoursToAssign) {
        conflicts.push({
          type: 'no_available_slots',
          message: `Disciplina "${subject.name}": alocadas ${assigned}/${hoursToAssign} aulas. Restam ${hoursToAssign - assigned} sem alocação.`
        });

        if (strictSubjectAllocation) {
          return {
            success: false,
            message: `Não foi possível alocar 100% da carga da disciplina "${subject.name}".`,
            conflicts
          };
        }
      }
    }

    const enforceAllTeachersIncluded = () => {
      if (!requireAllTeachersAllocated) {
        return;
      }

      if (totalWorkload < teachers.length) {
        conflicts.push({
          type: 'no_available_slots',
          message: `Não é possível alocar todos os professores: há ${teachers.length} professores e apenas ${totalWorkload} aulas totais.`
        });
        return;
      }

      const getTeachersWithoutLessons = () =>
        teachers.filter((teacher) => (teacherAssignedLessons.get(teacher._id.toString()) || 0) === 0);

      let teachersWithoutLessons = getTeachersWithoutLessons();

      for (const teacher of teachersWithoutLessons) {
        const toTeacherId = new mongoose.Types.ObjectId(teacher._id);
        let reassigned = false;

        for (let day = 0; day < daysOfWeek && !reassigned; day++) {
          for (let period = 0; period < periodsPerDay && !reassigned; period++) {
            const cell = grid[day][period];
            if (!cell?.teacherId || !cell.subjectId) {
              continue;
            }

            const fromTeacherId = cell.teacherId;
            const fromTeacherIdStr = fromTeacherId.toString();
            const fromTeacherLessons = teacherAssignedLessons.get(fromTeacherIdStr) || 0;

            if (fromTeacherLessons <= 1) {
              continue;
            }

            if (!isValidAssignment(toTeacherId, cell.subjectId, 'regular', day, period, true)) {
              continue;
            }

            reassignTeacherInSlot(fromTeacherId, toTeacherId, day, period);
            reassigned = true;
          }
        }
      }

      teachersWithoutLessons = getTeachersWithoutLessons();
      if (teachersWithoutLessons.length > 0) {
        const names = teachersWithoutLessons.map((teacher) => teacher.name).join(', ');
        conflicts.push({
          type: 'no_available_slots',
          message: `Não foi possível alocar aula para todos os professores. Sem aulas: ${names}.`
        });
      }
    };

    enforceAllTeachersIncluded();

    if (requireAllTeachersAllocated && conflicts.length > 0) {
      return {
        success: false,
        message: conflicts[0].message,
        conflicts
      };
    }

    // Converter grid para array flat
    const gridArray: GridCell[] = [];
    let assignedSlots = 0;

    for (let day = 0; day < daysOfWeek; day++) {
      for (let period = 0; period < periodsPerDay; period++) {
        const cell = grid[day][period];
        if (cell) {
          gridArray.push(cell);
          if (cell.teacherId && cell.subjectId) {
            assignedSlots++;
          }
        }
      }
    }

    // Criar e salvar o horário
    const timetable = new Timetable({
      userId: new mongoose.Types.ObjectId(userId),
      scheduleId: new mongoose.Types.ObjectId(scheduleId),
      name,
      year,
      semester,
      daysOfWeek,
      periodsPerDay,
      saturdayEquivalent,
      grid: gridArray
    });

    await timetable.save();

    return {
      success: true,
      message: conflicts.length > 0
        ? `Horário gerado com avisos. ${assignedSlots}/${totalSlots} períodos preenchidos.`
        : `Horário gerado com sucesso! ${assignedSlots}/${totalSlots} períodos preenchidos.`,
      timetableId: timetable._id as mongoose.Types.ObjectId,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      stats: {
        totalSlots,
        assignedSlots,
        emptySlots: totalSlots - assignedSlots
      }
    };

  } catch (error) {
    console.error('Erro na geração do horário:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido ao gerar horário'
    };
  }
}

/**
 * Valida um horário existente para conflitos
 */
export async function validateTimetable(timetableId: string): Promise<{
  isValid: boolean;
  conflicts: ConflictInfo[];
}> {
  const conflicts: ConflictInfo[] = [];

  try {
    const timetable = await Timetable.findById(timetableId).lean();
    
    if (!timetable) {
      return {
        isValid: false,
        conflicts: [{ type: 'no_available_slots', message: 'Horário não encontrado' }]
      };
    }

    // Verificar conflitos de professor (mesmo professor em dois lugares ao mesmo tempo)
    const teacherSlots = new Map<string, Set<string>>();

    for (const cell of timetable.grid) {
      if (cell.teacherId) {
        const slotKey = `${cell.day}-${cell.period}`;
        const teacherIdStr = cell.teacherId.toString();

        if (!teacherSlots.has(teacherIdStr)) {
          teacherSlots.set(teacherIdStr, new Set());
        }

        if (teacherSlots.get(teacherIdStr)!.has(slotKey)) {
          const teacher = await Teacher.findById(cell.teacherId);
          conflicts.push({
            type: 'teacher_conflict',
            message: `Professor ${teacher?.name || teacherIdStr} alocado em múltiplas turmas no dia ${cell.day + 1}, período ${cell.period + 1}`,
            day: cell.day,
            period: cell.period
          });
        }

        teacherSlots.get(teacherIdStr)!.add(slotKey);
      }
    }

    // Verificar matérias consecutivas
    const daySlots = new Map<number, Map<number, string>>();

    for (const cell of timetable.grid) {
      if (cell.subjectId) {
        if (!daySlots.has(cell.day)) {
          daySlots.set(cell.day, new Map());
        }
        daySlots.get(cell.day)!.set(cell.period, cell.subjectId.toString());
      }
    }

    for (const [day, periodsMap] of daySlots) {
      const sortedPeriods = Array.from(periodsMap.entries()).sort((a, b) => a[0] - b[0]);

      for (let i = 0; i < sortedPeriods.length - 1; i++) {
        const [period1, subject1] = sortedPeriods[i];
        const [period2, subject2] = sortedPeriods[i + 1];

        if (period2 === period1 + 1 && subject1 === subject2) {
          const subject = await Subject.findById(subject1);
          conflicts.push({
            type: 'consecutive_subject',
            message: `Disciplina ${subject?.name || subject1} com aulas consecutivas no dia ${day + 1}, períodos ${period1 + 1}-${period2 + 1}`,
            day,
            period: period1
          });
        }
      }
    }

    return {
      isValid: conflicts.length === 0,
      conflicts
    };

  } catch (error) {
    console.error('Erro na validação do horário:', error);
    return {
      isValid: false,
      conflicts: [{ 
        type: 'no_available_slots', 
        message: error instanceof Error ? error.message : 'Erro na validação' 
      }]
    };
  }
}

/**
 * Atualiza uma célula específica do horário
 */
export async function updateTimetableCell(
  timetableId: string,
  day: number,
  period: number,
  teacherId?: string,
  subjectId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const timetable = await Timetable.findById(timetableId);
    
    if (!timetable) {
      return { success: false, message: 'Horário não encontrado' };
    }

    // Encontrar a célula no grid
    const cellIndex = timetable.grid.findIndex(
      cell => cell.day === day && cell.period === period
    );

    if (cellIndex === -1) {
      // Adicionar nova célula
      timetable.grid.push({
        day,
        period,
        teacherId: teacherId ? new mongoose.Types.ObjectId(teacherId) : undefined,
        subjectId: subjectId ? new mongoose.Types.ObjectId(subjectId) : undefined
      });
    } else {
      // Atualizar célula existente
      if (teacherId) {
        timetable.grid[cellIndex].teacherId = new mongoose.Types.ObjectId(teacherId);
      } else {
        timetable.grid[cellIndex].teacherId = undefined;
      }

      if (subjectId) {
        timetable.grid[cellIndex].subjectId = new mongoose.Types.ObjectId(subjectId);
      } else {
        timetable.grid[cellIndex].subjectId = undefined;
      }
    }

    await timetable.save();

    return { success: true, message: 'Célula atualizada com sucesso' };

  } catch (error) {
    console.error('Erro ao atualizar célula:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao atualizar célula'
    };
  }
}
