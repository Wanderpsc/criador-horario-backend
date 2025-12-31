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
}

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
      distributeEvenly = true
    } = options;

    // Buscar professores e disciplinas do usuário
    const teachers = await Teacher.find({ userId }).lean();
    const subjects = await Subject.find({ userId }).lean();

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
    const conflicts: ConflictInfo[] = [];

    // Função para verificar se a atribuição é válida
    const isValidAssignment = (
      teacherId: mongoose.Types.ObjectId,
      subjectId: mongoose.Types.ObjectId,
      day: number,
      period: number
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
      if (avoidConsecutive) {
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

      grid[day][period] = {
        day,
        period,
        teacherId,
        subjectId
      };
    };

    // Distribuir disciplinas pela grade
    for (const subject of subjects) {
      // Selecionar professores que podem lecionar esta disciplina
      // TODO: Implementar filtro por especialização do professor
      const hoursToAssign = subject.workload || subject.workloadHours || 0;
      
      // Por enquanto, usar todos os professores disponíveis
      const availableTeachers = teachers;
      
      // Distribuir uniformemente pelos dias
      const targetPerDay = distributeEvenly 
        ? Math.ceil(hoursToAssign / daysOfWeek) 
        : hoursToAssign;

      let assigned = 0;
      let attempts = 0;
      const maxAttempts = totalSlots * 3; // Mais tentativas para encontrar slots válidos

      while (assigned < hoursToAssign && attempts < maxAttempts) {
        attempts++;

        // Escolher professor aleatório dos disponíveis
        const teacher = availableTeachers[Math.floor(Math.random() * availableTeachers.length)];
        const teacherId = new mongoose.Types.ObjectId(teacher._id);

        // Escolher slot aleatório
        const day = Math.floor(Math.random() * daysOfWeek);
        const period = Math.floor(Math.random() * periodsPerDay);

        // Verificar se o slot está vazio e a atribuição é válida
        if (
          !grid[day][period]?.teacherId &&
          isValidAssignment(teacherId, new mongoose.Types.ObjectId(subject._id), day, period)
        ) {
          markAssignment(teacherId, new mongoose.Types.ObjectId(subject._id), day, period);
          assigned++;
        }
      }

      // Registrar se não conseguiu alocar todas as aulas
      if (assigned < hoursToAssign) {
        conflicts.push({
          type: 'no_available_slots',
          message: `Disciplina "${subject.name}": alocadas ${assigned}/${hoursToAssign} aulas. Restam ${hoursToAssign - assigned} sem alocação.`
        });
      }
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
