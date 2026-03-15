import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { Download, Share2, Printer, RefreshCw, AlertCircle, CheckCircle, Calendar, Clock, Trash2, Edit, FolderOpen } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface TeacherAvailability {
  [day: string]: {
    [period: number]: boolean;
  };
}

interface Teacher {
  id: string;
  name: string;
  observations?: string;
  availability?: TeacherAvailability;
  isActive?: boolean;
  weeklyWorkload?: number;
}

interface TeacherSubject {
  _id: string;
  teacherId: string;
  subjectId: string;
  classId?: string;
  weeklyHours?: number;
}

interface Subject {
  id: string;
  name: string;
  color: string;
  gradeId?: string;
  gradeName?: string;
  isActive?: boolean;
  weeklyHours?: number;
  workloadHours?: number;
  workload?: number;
}



interface Schedule {
  id: string;
  name: string;
  periods: Array<{
    period: number;
    startTime: string;
    endTime: string;
  }>;
}

interface TimetableSlot {
  day: string;
  period: number;
  subjectId: string;
  teacherId: string;
  classId: string;
}

interface LessonDemand {
  id: string;
  classId: string;
  subjectId: string;
  candidateTeacherIds: string[];
  preferredTeacherId?: string;
  requiredTeacherId?: string;
  isFixedTeacher: boolean;
  priority: number;
  allocated: boolean;
}

interface GenerationChecklistClass {
  classId: string;
  classLabel: string;
  totalSlots: number;
  totalTargetHours: number;
  missingSubjects: string[];
  hasNoSubjects: boolean;
  isReady: boolean;
}

interface GenerationChecklistSummary {
  classesAnalyzed: number;
  classesReady: number;
  classesWithIssues: number;
  classesWithMissingLoad: number;
  classesWithExcessLoad: number;
  classesWithoutSubjects: number;
  totalMissingSubjectAllocations: number;
}

interface GenerationChecklist {
  classes: GenerationChecklistClass[];
  summary: GenerationChecklistSummary;
}

interface SubjectLoadCounter {
  subjectId: string;
  subjectName: string;
  weeklyTarget: number;
  weeklyGenerated: number;
  dailyGenerated: number;
  annualTarget: number;
  annualGenerated: number;
  weeklyMissing: number;
  annualMissing: number;
}

interface TeacherLoadCounter {
  teacherId: string;
  teacherName: string;
  weeklyTarget: number;
  weeklyGenerated: number;
  dailyGenerated: number;
  classDailyGenerated: number;
  annualTarget: number;
  annualGenerated: number;
  weeklyMissing: number;
  annualMissing: number;
}

interface DayLoadCounterPanel {
  subjectCounters: SubjectLoadCounter[];
  teacherCounters: TeacherLoadCounter[];
  totalGeneratedInDay: number;
  dayCapacity: number;
  dayMissingCapacity: number;
  subjectWeeklyTargetTotal: number;
  subjectWeeklyGeneratedTotal: number;
  subjectWeeklyMissingTotal: number;
  teacherWeeklyTargetTotal: number;
  teacherWeeklyGeneratedTotal: number;
  teacherWeeklyMissingTotal: number;
}

type SubjectCategory = 'core' | 'study' | 'regular';

export default function TimetableGenerator() {
  const LAST_SELECTED_SCHEDULE_KEY = 'lastSelectedScheduleId';
  const [selectedSchedule, setSelectedSchedule] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [generatedTimetables, setGeneratedTimetables] = useState<{ [classId: string]: TimetableSlot[] }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'day-by-day' | 'spreadsheet'>('spreadsheet');
  const [editModalData, setEditModalData] = useState<{ classId: string; day: string; period: number; currentSubjectId: string | null; currentTeacherId: string | null } | null>(null);
  const [selectedSubjectForEdit, setSelectedSubjectForEdit] = useState<string>('');
  const [selectedTeacherForEdit, setSelectedTeacherForEdit] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedTimetablesList, setSavedTimetablesList] = useState<any[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [observations, setObservations] = useState<string>('');
  const [printFormat, setPrintFormat] = useState<'normal' | 'transposed'>('normal'); // Formato de impressão

  const allWeekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
  const ACADEMIC_WEEKS_PER_YEAR = 40;
  const weekDays = selectedDayFilter === 'all'
    ? allWeekDays
    : allWeekDays.includes(selectedDayFilter)
      ? [selectedDayFilter]
      : allWeekDays;

  // Traduzir turno
  const translateShift = (shift: string) => {
    const shifts: Record<string, string> = {
      'full': 'Integral',
      'morning': 'Manhã',
      'afternoon': 'Tarde',
      'evening': 'Noite',
      'night': 'Noite'
    };
    return shifts[shift?.toLowerCase()] || shift;
  };

  // Fetch data
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const response = await api.get('/teachers');
      const data = response.data.data || response.data;
      const teachersArray = Array.isArray(data) ? data : [];
      
      console.log('📚 Professores carregados:', teachersArray.length);
      console.log('📊 Disponibilidade configurada:', 
        teachersArray.filter(t => t.availability).map(t => ({
          name: t.name,
          availability: t.availability
        }))
      );
      
      return teachersArray;
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await api.get('/subjects');
      const data = response.data.data || response.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: grades = [] } = useQuery({
    queryKey: ['grades'],
    queryFn: async () => {
      const response = await api.get('/grades');
      const data = response.data.data || response.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await api.get('/classes');
      console.log('🏫 Resposta da API /classes:', response.data);
      const classesData = Array.isArray(response.data.data) ? response.data.data : [];
      console.log('🏫 Classes processadas:', classesData);
      console.log('🏫 Primeira turma:', classesData[0]);
      return classesData;
    },
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const response = await api.get('/schedules');
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  // Get authenticated user
  const { user } = useAuthStore();

  // Fetch teacher-subject associations
  const { data: teacherSubjects = [] } = useQuery({
    queryKey: ['teacher-subjects', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('⚠️ UserId não encontrado');
        return [];
      }
      console.log('🔍 Buscando associações para userId:', user.id);
      const response = await api.get(`/teacher-subjects/${user.id}`);
      console.log('📦 Resposta da API teacher-subjects:', response.data);
      console.log('📊 Total de associações recebidas:', (response.data.data || []).length);
      return response.data.data || [];
    },
    enabled: !!user?.id,
  });

  const currentSchedule = schedules.find((s: Schedule) => s.id === selectedSchedule);

  useEffect(() => {
    if (!selectedSchedule || !Array.isArray(schedules) || schedules.length === 0) {
      return;
    }

    const scheduleExists = schedules.some((schedule: Schedule) => schedule.id === selectedSchedule);
    if (scheduleExists) {
      localStorage.setItem(LAST_SELECTED_SCHEDULE_KEY, selectedSchedule);
    }
  }, [selectedSchedule, schedules]);

  useEffect(() => {
    if (selectedSchedule || !Array.isArray(schedules) || schedules.length === 0) {
      return;
    }

    const savedScheduleId = localStorage.getItem(LAST_SELECTED_SCHEDULE_KEY);
    if (!savedScheduleId) {
      return;
    }

    const savedScheduleExists = schedules.some((schedule: Schedule) => schedule.id === savedScheduleId);
    if (savedScheduleExists) {
      setSelectedSchedule(savedScheduleId);
    }
  }, [selectedSchedule, schedules]);

  const generatedClassIds = useMemo(
    () => new Set(Object.keys(generatedTimetables)),
    [generatedTimetables]
  );

  const classesForDisplay = useMemo(() => {
    if (selectedClassFilter !== 'all') {
      return classes.filter((currentClass: any) => currentClass.id === selectedClassFilter);
    }

    if (generatedClassIds.size === 0) {
      return classes;
    }

    return classes.filter((currentClass: any) => generatedClassIds.has(currentClass.id));
  }, [classes, selectedClassFilter, generatedClassIds]);

  const generationChecklist: GenerationChecklist | null = useMemo(() => {
    if (!selectedSchedule || !currentSchedule || !Array.isArray(classes) || classes.length === 0) {
      return null;
    }

    const toPositiveInteger = (value: unknown): number => {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        return 0;
      }
      return Math.max(0, Math.floor(numericValue));
    };

    const activeTeacherIds = new Set(
      teachers
        .filter((teacher: Teacher) => teacher.isActive !== false)
        .map((teacher: Teacher) => teacher.id)
    );

    const classesToAnalyze = selectedClassFilter === 'all'
      ? classes
      : classes.filter((currentClass: any) => currentClass.id === selectedClassFilter);

    const totalSlots = weekDays.length * (currentSchedule.periods?.length || 0);
    const checklistClasses: GenerationChecklistClass[] = [];

    for (const currentClass of classesToAnalyze) {
      const classSubjects = currentClass.subjects || [];
      const classLabel = `${currentClass.grade?.name || 'Sem série'} ${currentClass.name || ''}`.trim();

      if (classSubjects.length === 0) {
        checklistClasses.push({
          classId: currentClass.id,
          classLabel,
          totalSlots,
          totalTargetHours: 0,
          missingSubjects: [],
          hasNoSubjects: true,
          isReady: false
        });
        continue;
      }

      const classSubjectIds = new Set(classSubjects.map((subject: Subject) => subject.id));
      const classTeacherSubjects = teacherSubjects.filter((ts: TeacherSubject) => {
        if (!classSubjectIds.has(ts.subjectId)) {
          return false;
        }
        if (!activeTeacherIds.has(ts.teacherId)) {
          return false;
        }
        return ts.classId === currentClass.id || !ts.classId;
      });

      const missingSubjects: string[] = [];
      let totalTargetHours = 0;

      for (const subject of classSubjects) {
        const assignments = classTeacherSubjects.filter((ts: TeacherSubject) => ts.subjectId === subject.id);

        if (assignments.length === 0) {
          missingSubjects.push(subject.name);
          continue;
        }

        const explicitRequested = assignments.reduce((sum: number, ts: TeacherSubject) => {
          const weeklyHours = toPositiveInteger(ts.weeklyHours);
          return sum + weeklyHours;
        }, 0);

        const classConfiguredHours = toPositiveInteger(currentClass.subjectWeeklyHours?.[subject.id]);
        const subjectDefaultHours = toPositiveInteger(subject.weeklyHours);
        const fallbackHours = classConfiguredHours || subjectDefaultHours || 2;
        const subjectTargetHours = explicitRequested > 0 ? explicitRequested : fallbackHours;

        totalTargetHours += subjectTargetHours;
      }

      const isReady = !missingSubjects.length && !classSubjects.length
        ? false
        : !missingSubjects.length && totalTargetHours > 0;

      checklistClasses.push({
        classId: currentClass.id,
        classLabel,
        totalSlots,
        totalTargetHours,
        missingSubjects,
        hasNoSubjects: false,
        isReady
      });
    }

    const isFullWeekSelection = selectedDayFilter === 'all';

    const summary: GenerationChecklistSummary = {
      classesAnalyzed: checklistClasses.length,
      classesReady: checklistClasses.filter((currentClass) => currentClass.isReady).length,
      classesWithIssues: checklistClasses.filter((currentClass) => !currentClass.isReady).length,
      classesWithMissingLoad: isFullWeekSelection
        ? checklistClasses.filter((currentClass) => currentClass.totalTargetHours < currentClass.totalSlots).length
        : 0,
      classesWithExcessLoad: isFullWeekSelection
        ? checklistClasses.filter((currentClass) => currentClass.totalTargetHours > currentClass.totalSlots).length
        : 0,
      classesWithoutSubjects: checklistClasses.filter((currentClass) => currentClass.hasNoSubjects).length,
      totalMissingSubjectAllocations: checklistClasses.reduce(
        (sum, currentClass) => sum + currentClass.missingSubjects.length,
        0
      )
    };

    return {
      classes: checklistClasses,
      summary
    };
  }, [selectedSchedule, selectedClassFilter, selectedDayFilter, currentSchedule, classes, teachers, teacherSubjects]);

  // Carregar lista de horários salvos ao montar o componente
  useEffect(() => {
    loadSavedTimetablesList();
  }, []);

  // Função para carregar lista de horários salvos
  const loadSavedTimetablesList = async () => {
    try {
      const response = await api.get('/generated-timetables');
      console.log('📊 Response completa:', response);
      console.log('📊 Response.data:', response.data);
      const list = response.data.data || response.data || [];
      console.log('📊 Lista de horários salvos:', list);
      console.log('📊 Quantidade:', list.length);
      if (list.length > 0) {
        console.log('📊 Primeiro item COMPLETO:', JSON.stringify(list[0], null, 2));
        console.log('📊 Campos do primeiro item:', Object.keys(list[0]));
        console.log('📊 Title do primeiro:', list[0].title);
      }
      setSavedTimetablesList(list);
    } catch (error: any) {
      console.error('Erro ao carregar lista:', error);
    }
  };

  // Debug logs
  useEffect(() => {
    console.log('📊 Dados carregados:', {
      teachers: teachers.length,
      subjects: subjects.length,
      grades: grades.length,
      classes: classes.length,
      schedules: schedules.length
    });
  }, [teachers, subjects, grades, classes, schedules]);

  // Função para verificar se professor está disponível baseado em observações (PRIORIDADE MÁXIMA)
  const isTeacherAvailableAtTime = (teacher: Teacher, day: string, period: number): boolean => {

    const normalizeDayKey = (value: string): string =>
      value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const getDayAliases = (dayValue: string, availabilityKeys: Set<string>): string[] => {
      const normalized = normalizeDayKey(dayValue);
      const aliases: Record<string, string[]> = {
        segunda: ['segunda', 'segunda-feira', 'seg', 'monday', 'mon'],
        terca: ['terca', 'terca-feira', 'ter', 'tuesday', 'tue'],
        quarta: ['quarta', 'quarta-feira', 'qua', 'wednesday', 'wed'],
        quinta: ['quinta', 'quinta-feira', 'qui', 'thursday', 'thu'],
        sexta: ['sexta', 'sexta-feira', 'sex', 'friday', 'fri']
      };

      const dayIndexByAlias: Record<string, number> = {
        segunda: 0,
        terca: 1,
        quarta: 2,
        quinta: 3,
        sexta: 4
      };

      const resolvedAliases = aliases[normalized] ? [...aliases[normalized]] : [normalized];
      const dayIndex = dayIndexByAlias[normalized];

      if (dayIndex === undefined || availabilityKeys.size === 0) {
        return resolvedAliases;
      }

      const numericKeys = Array.from(availabilityKeys)
        .map((key) => Number(key))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 7);

      if (numericKeys.length === 0) {
        return resolvedAliases;
      }

      const hasZero = numericKeys.includes(0);
      const hasSeven = numericKeys.includes(7);

      let numericAlias: string;
      if (hasZero && !hasSeven) {
        numericAlias = String(dayIndex);
      } else if (hasSeven && !hasZero) {
        numericAlias = String(dayIndex + 1);
      } else {
        const oneBasedHints = numericKeys.filter((value) => value >= 1 && value <= 7).length;
        const zeroBasedHints = numericKeys.filter((value) => value >= 0 && value <= 6).length;
        numericAlias = oneBasedHints >= zeroBasedHints
          ? String(dayIndex + 1)
          : String(dayIndex);
      }

      resolvedAliases.push(numericAlias);

      return resolvedAliases;
    };

    // PRIORIDADE ABSOLUTA: Verificar disponibilidade estruturada (checkboxes)
    // Mas só usar se foi REALMENTE configurada (tem pelo menos um dia com dados)
    if (teacher.availability && Object.keys(teacher.availability).length > 0) {
      const normalizedAvailability = new Map<string, { [period: number]: boolean }>();
      for (const [key, value] of Object.entries(teacher.availability)) {
        normalizedAvailability.set(normalizeDayKey(key), value);
      }

      const availabilityKeys = new Set(normalizedAvailability.keys());
      for (const dayAlias of getDayAliases(day, availabilityKeys)) {
        const dayAvailability = normalizedAvailability.get(dayAlias);
        if (!dayAvailability || Object.keys(dayAvailability).length === 0) {
          continue;
        }

        const direct = (dayAvailability as any)[period];
        if (direct !== undefined) {
          return Boolean(direct);
        }

        const shifted = (dayAvailability as any)[period + 1];
        if (shifted !== undefined) {
          return Boolean(shifted);
        }
      }
    }

    // PRIORIDADE 2: Se não tem disponibilidade estruturada, tentar parsear observações
    if (!teacher.observations) return true;
    
    const obs = teacher.observations.toLowerCase();
    const dayLower = day.toLowerCase();
    
    // MAPEAMENTO: Período para turno e horário
    const isMorning = period <= 5;
    const isAfternoon = period >= 6;
    const periodHour = period <= 5 ? (7 + period - 1) : (13 + period - 6);
    
    // ========== DETECÇÃO GENÉRICA DE DIAS DA SEMANA ==========
    const daysMap: Record<string, string[]> = {
      'segunda': ['segunda', 'segunda-feira', 'seg'],
      'terça': ['terça', 'terca', 'terça-feira', 'terca-feira', 'ter'],
      'quarta': ['quarta', 'quarta-feira', 'qua'],
      'quinta': ['quinta', 'quinta-feira', 'qui'],
      'sexta': ['sexta', 'sexta-feira', 'sex'],
      'domingo': ['domingo', 'dom']
    };
    
    // Verificar se o dia atual está mencionado nas observações
    let dayMentioned = false;
    const dayVariations = daysMap[dayLower] || [];
    for (const variation of dayVariations) {
      if (obs.includes(variation)) {
        dayMentioned = true;
        break;
      }
    }
    
    // ========== DETECÇÃO GENÉRICA DE VERBOS NEGATIVOS ==========
    const hasNegativeContext = 
      obs.includes('não pode') || 
      obs.includes('nao pode') ||
      obs.includes('não trabalha') ||
      obs.includes('nao trabalha') ||
      obs.includes('indisponível') ||
      obs.includes('indisponivel') ||
      obs.includes('não disponível') ||
      obs.includes('ausente') ||
      obs.includes('evitar') ||
      obs.includes('bloqueado') ||
      obs.includes('proibido');
    
    // ========== DETECÇÃO DE TURNOS (MANHÃ/TARDE/NOITE) ==========
    const hasMorningMention = obs.includes('manhã') || obs.includes('manha');
    const hasAfternoonMention = obs.includes('tarde') || obs.includes('tardes');
    const hasNightMention = obs.includes('noite');
    
    // ========== DETECÇÃO DE HORÁRIOS ESPECÍFICOS ==========
    const timeMatches = obs.matchAll(/(\d{1,2})[:h](\d{2})?/g);
    let restrictedFromHour: number | null = null;
    
    for (const match of timeMatches) {
      const hour = parseInt(match[1]);
      if (hour >= 6 && hour <= 23) {
        // Verificar contexto antes do horário: "a partir de", "depois de", "após", "a partir das"
        const beforeText = obs.substring(Math.max(0, match.index! - 25), match.index).toLowerCase();
        const afterText = obs.substring(match.index!, Math.min(obs.length, match.index! + 15)).toLowerCase();
        
        // Se tem contexto de restrição temporal OU contexto negativo
        if (beforeText.includes('partir') || 
            beforeText.includes('depois') || 
            beforeText.includes('após') ||
            beforeText.includes('apos') ||
            afterText.includes('em diante') ||
            hasNegativeContext) {
          restrictedFromHour = hour;
          console.log(`⏰ Detectado horário restrito: ${hour}:00h para ${teacher.name} (contexto: "${beforeText.trim()}...")`);
          break; // Usa o primeiro horário encontrado
        }
      }
    }
    
    // Se não encontrou horário específico mas menciona "tarde" + negativo, bloquear após 12h
    if (restrictedFromHour === null && hasAfternoonMention && hasNegativeContext) {
      restrictedFromHour = 12;
      console.log(`⏰ Detectado restrição de tarde para ${teacher.name}, bloqueando após 12:00h`);
    }
    
    // ========== DETECÇÃO DE PERÍODOS ESPECÍFICOS ==========
    const periodPatterns: Record<string, number> = {
      'primeiro': 1, '1º': 1, '1°': 1, '1o': 1,
      'segundo': 2, '2º': 2, '2°': 2, '2o': 2,
      'terceiro': 3, '3º': 3, '3°': 3, '3o': 3,
      'quarto': 4, '4º': 4, '4°': 4, '4o': 4,
      'quinto': 5, '5º': 5, '5°': 5, '5o': 5,
      'sexto': 6, '6º': 6, '6°': 6, '6o': 6,
      'sétimo': 7, 'setimo': 7, '7º': 7, '7°': 7, '7o': 7,
      'oitavo': 8, '8º': 8, '8°': 8, '8o': 8,
      'nono': 9, '9º': 9, '9°': 9, '9o': 9,
      'décimo': 10, 'decimo': 10, '10º': 10, '10°': 10, '10o': 10,
      'último': 99, 'ultima': 99, 'ultimo': 99
    };
    
    // ========== ANÁLISE CONTEXTUAL ==========
    
    // REGRA 1: "A partir do Xº período" (período mínimo)
    for (const [periodName, periodNum] of Object.entries(periodPatterns)) {
      const apartirPattern = new RegExp(`(a\\s*partir|apartir|começa|comeca|inicia).*${periodName}`, 'i');
      if (obs.match(apartirPattern)) {
        if (period < periodNum) {
          return false; // Professor só pode a partir deste período
        }
      }
    }
    
    // REGRA 2: "Não pode no Xº período" ou "Evitar Xº período"
    for (const [periodName, periodNumConst] of Object.entries(periodPatterns)) {
      let periodNum = periodNumConst;
      if (periodNum === 99) periodNum = currentSchedule?.periods?.length || 8; // último período
      
      const avoidPattern = new RegExp(`(não|nao|evitar|sem)[^\n]{0,35}${periodName}`, 'i');
      const avoidPeriodPattern = new RegExp(`${periodName}[^\n]{0,20}(periodo|período|horário|horario|aula)`, 'i');
      if ((avoidPattern.test(obs) || avoidPeriodPattern.test(obs)) && period === periodNum) {
        return false;
      }
    }
    
    // REGRA 3: Dia + Turno (ex: "não pode nas tardes de segunda")
    if (dayMentioned && hasNegativeContext) {
      // Se menciona manhã e é manhã
      if (hasMorningMention && isMorning) {
        return false;
      }
      
      // Se menciona tarde e é tarde
      if (hasAfternoonMention && isAfternoon) {
        // Verificar se tem horário específico "a partir de"
        if (restrictedFromHour && periodHour >= restrictedFromHour) {
          return false;
        } else if (!restrictedFromHour) {
          return false; // Toda tarde bloqueada
        }
      }
      
      // Se menciona noite
      if (hasNightMention && period >= 8) {
        return false;
      }
      
      // Se não menciona turno específico mas menciona o dia com negativa
      if (!hasMorningMention && !hasAfternoonMention && !hasNightMention) {
        return false; // Dia inteiro bloqueado
      }
    }
    
    // REGRA 4: Apenas turno sem dia específico (aplica a todos os dias)
    if (!dayMentioned && hasNegativeContext) {
      if (hasMorningMention && isMorning) {
        console.log(`🚫 ${teacher.name} bloqueado: manhã em ${dayLower} período ${period}`);
        return false;
      }
      if (hasAfternoonMention && isAfternoon) {
        console.log(`🚫 ${teacher.name} bloqueado: tarde em ${dayLower} período ${period} (observação: "${teacher.observations}")`);
        return false;
      }
      if (hasNightMention && period >= 8) {
        console.log(`🚫 ${teacher.name} bloqueado: noite em ${dayLower} período ${period}`);
        return false;
      }
    }
    
    // REGRA 5: Horário específico (ex: "após 12:00h", "a partir das 14h", "não pode às 14:15")
    // PRIORIDADE MÁXIMA: Se há horário específico restrito, bloquear SEMPRE
    if (restrictedFromHour !== null && periodHour >= restrictedFromHour) {
      console.log(`🚫 ${teacher.name} bloqueado: horário ${periodHour}:00 >= ${restrictedFromHour}:00 em ${dayLower} período ${period} (observação: "${teacher.observations}")`);
      return false;
    }
    
    return true;
  };

  // Função para evitar disciplina sequencial na mesma turma
  const hasConsecutiveSubjectInSameClass = (
    timetable: TimetableSlot[],
    subjectId: string,
    classId: string,
    day: string,
    period: number
  ): boolean => {
    // Verificar período anterior e seguinte para impedir sequência da mesma disciplina
    const previousSlot = timetable.find(
      slot => slot.day === day && slot.period === period - 1 && 
              slot.subjectId === subjectId && slot.classId === classId
    );

    const nextSlot = timetable.find(
      slot => slot.day === day && slot.period === period + 1 &&
              slot.subjectId === subjectId && slot.classId === classId
    );
    
    return !!previousSlot || !!nextSlot;
  };

  const hasConsecutiveTeacherInSameClass = (
    timetable: TimetableSlot[],
    teacherId: string,
    classId: string,
    day: string,
    period: number
  ): boolean => {
    const previousSlot = timetable.find(
      slot => slot.day === day && slot.period === period - 1 &&
              slot.teacherId === teacherId && slot.classId === classId
    );

    const nextSlot = timetable.find(
      slot => slot.day === day && slot.period === period + 1 &&
              slot.teacherId === teacherId && slot.classId === classId
    );

    return !!previousSlot || !!nextSlot;
  };

  // Função para calcular score de preferência do professor (quanto maior, melhor)
  const calculateTeacherPreferenceScore = (
    globalSchedule: { [day: string]: { [period: number]: Set<string> } },
    teacherId: string,
    day: string,
    period: number,
    requiredWeeklyLoad: number
  ): number => {
    const totalPeriods = currentSchedule?.periods?.length || 8;
    const teacherSlotsToday = Array.from({ length: totalPeriods }, (_, i) => i + 1)
      .filter(p => globalSchedule[day][p]?.has(teacherId));

    const slotsByDay = new Map<string, number[]>();
    for (const weekDay of weekDays) {
      const periods = Array.from({ length: totalPeriods }, (_, i) => i + 1)
        .filter(p => globalSchedule[weekDay][p]?.has(teacherId));
      slotsByDay.set(weekDay, periods);
    }

    const todayBefore = slotsByDay.get(day) || [];
    const todayAfter = Array.from(new Set([...todayBefore, period])).sort((a, b) => a - b);
    slotsByDay.set(day, todayAfter);

    let score = 0;

    const targetActiveDays =
      requiredWeeklyLoad >= 5
        ? 5
        : Math.min(5, Math.max(1, requiredWeeklyLoad > 0 ? requiredWeeklyLoad : 3));

    // Distribuir ao longo da semana (até 5 dias)
    const activeDays = Array.from(slotsByDay.values()).filter((periods) => periods.length > 0).length;
    if (activeDays < targetActiveDays) {
      score += todayBefore.length === 0 ? 120 : 20;
    } else if (todayBefore.length === 0) {
      score -= 45;
    }

    // Regra 4: professores de alta carga toleram janelas de descanso;
    // professores de baixa carga preferem blocos consecutivos (entre turmas)
    const periodsInWeek = totalPeriods * weekDays.length;
    const isHighLoad = requiredWeeklyLoad >= Math.ceil(periodsInWeek * 0.45);
    const consecutiveBonus = isHighLoad ? 90 : 250;
    const nearbyBonus = isHighLoad ? 40 : 110;

    if (teacherSlotsToday.length > 0) {
      score += 120;

      if (teacherSlotsToday.includes(period - 1) || teacherSlotsToday.includes(period + 1)) {
        score += consecutiveBonus;
      } else {
        const nearestDistance = teacherSlotsToday.reduce((minDistance, teacherPeriod) => {
          return Math.min(minDistance, Math.abs(teacherPeriod - period));
        }, Number.POSITIVE_INFINITY);
        score += Math.max(0, nearbyBonus - nearestDistance * 16);
      }
    } else {
      score += 25;
    }

    // Penalizar janelas internas e blocos quebrados
    for (const dayPeriods of slotsByDay.values()) {
      if (dayPeriods.length === 0) continue;

      const sorted = [...dayPeriods].sort((a, b) => a - b);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const span = last - first + 1;
      const gaps = span - sorted.length;

      let blocks = 1;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] !== sorted[i - 1] + 1) {
          blocks++;
        }
      }

      score -= gaps * 190;
      score -= (blocks - 1) * 80;
      score -= first * 8;
      score -= last * 3;

      // Regra 9: penalidade extra para cada janela com mais de 1 período consecutivo vazio
      for (let k = 1; k < sorted.length; k++) {
        const gapSize = sorted[k] - sorted[k - 1] - 1;
        if (gapSize > 1) {
          score -= (gapSize - 1) * 200;
        }
      }

      const projectedDayLoad = sorted.length;
      const softDailyLimit = Math.max(1, Math.ceil((requiredWeeklyLoad || projectedDayLoad) / Math.max(1, targetActiveDays)));
      if (projectedDayLoad > softDailyLimit + 1) {
        score -= (projectedDayLoad - softDailyLimit) * 95;
      }
    }

    return score;
  };

  const normalizeSubjectText = (value: string): string =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

  const getSubjectCategory = (subjectName: string): SubjectCategory => {
    const normalized = normalizeSubjectText(subjectName);
    const coreKeywords = ['MATEMATICA', 'FISICA', 'QUIMICA', 'PORTUGUES', 'BIOLOGIA', 'GEOGRAFIA', 'HISTORIA'];
    const studyKeywords = ['HORARIO DE ESTUDO', 'ESTUDOS DIRIGIDOS', 'ESTUDO DIRIGIDO', 'MONITORIA / HORARIO DE ESTUDO'];

    if (coreKeywords.some((keyword) => normalized.includes(keyword))) {
      return 'core';
    }

    if (studyKeywords.some((keyword) => normalized.includes(keyword))) {
      return 'study';
    }

    return 'regular';
  };

  const isEarlyPeriodForStudy = (period: number, totalPeriods: number): boolean => {
    const earlyLimit = Math.max(2, Math.ceil(totalPeriods * 0.25));
    return period <= earlyLimit;
  };

  const calculatePeriodPreferenceScore = (
    subjectCategory: SubjectCategory,
    period: number,
    totalPeriods: number
  ): number => {
    const normalizedPosition = totalPeriods > 1 ? (period - 1) / (totalPeriods - 1) : 0;
    const earlyWeight = 1 - normalizedPosition;
    const lateWeight = normalizedPosition;
    const middleWeight = 1 - Math.abs(normalizedPosition - 0.6) / 0.6;

    if (subjectCategory === 'core') {
      return earlyWeight * 260 + middleWeight * 20;
    }

    if (subjectCategory === 'study') {
      const firstPeriodPenalty = isEarlyPeriodForStudy(period, totalPeriods) ? -400 : 0;
      return lateWeight * 230 + middleWeight * 90 + firstPeriodPenalty;
    }

    return middleWeight * 110 + lateWeight * 90;
  };

  const hasAdjacentStudyInSameClass = (
    timetable: TimetableSlot[],
    classId: string,
    day: string,
    period: number,
    subjectCategoryById: Map<string, SubjectCategory>
  ): boolean => {
    const previousSlot = timetable.find(
      (slot) => slot.day === day && slot.period === period - 1 && slot.classId === classId
    );
    const nextSlot = timetable.find(
      (slot) => slot.day === day && slot.period === period + 1 && slot.classId === classId
    );

    const previousIsStudy = previousSlot
      ? subjectCategoryById.get(previousSlot.subjectId) === 'study'
      : false;
    const nextIsStudy = nextSlot
      ? subjectCategoryById.get(nextSlot.subjectId) === 'study'
      : false;

    return previousIsStudy || nextIsStudy;
  };

  const countSubjectSlotsInDay = (
    timetable: TimetableSlot[],
    classId: string,
    day: string,
    subjectId: string
  ): number => {
    return timetable.filter((slot) => {
      if (slot.classId !== classId) return false;
      if (slot.day !== day) return false;
      return slot.subjectId === subjectId;
    }).length;
  };

  const countStudySlotsInDay = (
    timetable: TimetableSlot[],
    classId: string,
    day: string,
    subjectCategoryById: Map<string, SubjectCategory>
  ): number => {
    return timetable.filter((slot) => {
      if (slot.classId !== classId) return false;
      if (slot.day !== day) return false;
      return subjectCategoryById.get(slot.subjectId) === 'study';
    }).length;
  };

  const countTeacherSlotsInDay = (
    globalSchedule: { [day: string]: { [period: number]: Set<string> } },
    teacherId: string,
    day: string,
    totalPeriods: number
  ): number => {
    return Array.from({ length: totalPeriods }, (_, index) => index + 1).filter((period) =>
      globalSchedule[day]?.[period]?.has(teacherId)
    ).length;
  };

  const countTeacherClassSlotsInDay = (
    timetable: TimetableSlot[],
    classId: string,
    teacherId: string,
    day: string
  ): number => {
    return timetable.filter((slot) => {
      if (slot.classId !== classId) return false;
      if (slot.teacherId !== teacherId) return false;
      return slot.day === day;
    }).length;
  };

  const countTeacherSubjectSlotsInClassDay = (
    timetable: TimetableSlot[],
    classId: string,
    teacherId: string,
    subjectId: string,
    day: string
  ): number => {
    return timetable.filter((slot) => {
      if (slot.classId !== classId) return false;
      if (slot.teacherId !== teacherId) return false;
      if (slot.subjectId !== subjectId) return false;
      return slot.day === day;
    }).length;
  };

  const getTeacherClassDailyLimit = (weeklyTarget: number): number => {
    if (weeklyTarget <= 4) return 1;
    if (weeklyTarget <= 12) return 2;
    return 3;
  };

  const getTeacherSubjectDailyLimit = (weeklyTarget: number): number => {
    return weeklyTarget >= 8 ? 2 : 1;
  };

  // Função para gerar horários para TODAS as turmas SEM CONFLITOS
  const generateTimetable = () => {
    if (!selectedSchedule) {
      toast.error('Selecione um tipo de horário');
      return;
    }

    if (!currentSchedule || !currentSchedule.periods || currentSchedule.periods.length === 0) {
      toast.error('O horário selecionado não possui períodos configurados');
      return;
    }

    if (subjects.length === 0) {
      toast.error('Cadastre disciplinas antes de gerar o horário');
      return;
    }

    if (teachers.length === 0) {
      toast.error('Cadastre professores antes de gerar o horário');
      return;
    }

    if (classes.length === 0) {
      toast.error('Cadastre turmas antes de gerar o horário');
      return;
    }

    // Pré-validação: alertar quando carga horária excede slots disponíveis do professor
    if (currentSchedule && selectedDayFilter === 'all') {
      const preClassesToGenerate = selectedClassFilter === 'all'
        ? classes
        : classes.filter((c: any) => c.id === selectedClassFilter);
      const preClassIds = new Set(preClassesToGenerate.map((c: any) => c.id));
      const preActiveTeachers = teachers.filter((t: Teacher) => t.isActive !== false);
      const preActiveTeacherIds = new Set(preActiveTeachers.map((t: Teacher) => t.id));

      const preRequired = new Map<string, number>();
      for (const ts of teacherSubjects as TeacherSubject[]) {
        if (!preActiveTeacherIds.has(ts.teacherId)) continue;
        if (ts.classId && !preClassIds.has(ts.classId)) continue;
        const hrs = typeof ts.weeklyHours === 'number' && ts.weeklyHours > 0 ? ts.weeklyHours : 0;
        if (hrs <= 0) continue;
        preRequired.set(ts.teacherId, (preRequired.get(ts.teacherId) || 0) + hrs);
      }

      const preWarnings: string[] = [];
      for (const teacher of preActiveTeachers) {
        const required = preRequired.get(teacher.id) || 0;
        if (required <= 0) continue;
        if (!teacher.availability || Object.keys(teacher.availability).length === 0) continue;
        const availableSlots = weekDays.reduce((acc: number, day: string) => {
          return acc + currentSchedule.periods.filter(
            (p: { period: number }) => isTeacherAvailableAtTime(teacher, day, p.period)
          ).length;
        }, 0);
        if (availableSlots === 0) {
          preWarnings.push(`• ${teacher.name}: nenhum slot disponível (necessita ${required} aula(s))`);
        } else if (required > availableSlots) {
          preWarnings.push(`• ${teacher.name}: ${required} aula(s) necessária(s), mas apenas ${availableSlots} slot(s) disponível(is) na disponibilidade configurada`);
        }
      }

      if (preWarnings.length > 0) {
        const proceed = window.confirm(
          `⚠️ Atenção — os seguintes professores têm mais aulas necessárias do que slots disponíveis na disponibilidade configurada:\n\n` +
          preWarnings.join('\n') +
          `\n\nO sistema tentará alocar fora da disponibilidade para completar a carga horária.\n\nDeseja continuar mesmo assim?`
        );
        if (!proceed) return;
      }
    }

    setIsGenerating(true);
    setConflicts([]);

    try {
      // Filtrar turmas se necessário
      const classesToGenerate = selectedClassFilter === 'all' 
        ? classes 
        : classes.filter((c: any) => c.id === selectedClassFilter);
      const isPartialDayGeneration = selectedDayFilter !== 'all';

      if (classesToGenerate.length === 0) {
        toast.error('Nenhuma turma selecionada para gerar horário');
        setIsGenerating(false);
        return;
      }

      const allTimetables: { [classId: string]: TimetableSlot[] } = {};
      const newConflicts: string[] = [];
      const expectedAllocation = new Map<string, number>();
      const actualAllocation = new Map<string, number>();
      const lessonDemands: LessonDemand[] = [];
      let availabilityOverridesUsed = 0;

      const globalTeacherSchedule: { [day: string]: { [period: number]: Set<string> } } = {};
      const classSchedule: { [classId: string]: { [day: string]: Set<number> } } = {};
      const activeTeachers = teachers.filter((teacher: Teacher) => teacher.isActive !== false);
      const activeTeacherById = new Map(activeTeachers.map((t: Teacher) => [t.id, t]));
      const teacherNameById = new Map(activeTeachers.map((t: Teacher) => [t.id, t.name]));
      const teacherMaxLoadById = new Map(activeTeachers.map((t: Teacher) => [t.id, Number.POSITIVE_INFINITY]));
      const teacherRequiredLoad = new Map(activeTeachers.map((t: Teacher) => [t.id, 0]));
      const teacherAssignedLoad = new Map(activeTeachers.map((t: Teacher) => [t.id, 0]));
      const subjectNameById = new Map(subjects.map((s: Subject) => [s.id, s.name]));
      const subjectCategoryById = new Map(
        subjects.map((subject: Subject) => [subject.id, getSubjectCategory(subject.name)])
      );
      const classLabelById = new Map(
        classesToGenerate.map((c: any) => [
          c.id,
          `${c.grade?.name || 'Sem série'} ${c.name || ''}`.trim()
        ])
      );

      weekDays.forEach(day => {
        globalTeacherSchedule[day] = {};
        currentSchedule.periods.forEach((p: { period: number; startTime: string; endTime: string }) => {
          globalTeacherSchedule[day][p.period] = new Set();
        });
      });

      classesToGenerate.forEach((c: any) => {
        allTimetables[c.id] = [];
        classSchedule[c.id] = {};
        weekDays.forEach(day => {
          classSchedule[c.id][day] = new Set();
        });
      });

      console.log('🎯 GERAÇÃO DE HORÁRIOS SEM CONFLITOS');
      console.log('📊 Turmas:', classesToGenerate.length);
      console.log('🎯 Filtro:', selectedClassFilter === 'all' ? 'Todas' : 'Turma específica');
      console.log('📅 Dia:', selectedDayFilter === 'all' ? 'Todos os dias' : selectedDayFilter);
      console.log('📚 Disciplinas:', subjects.length);
      console.log('👨‍🏫 Professores ativos:', activeTeachers.length);
      console.log('⏰ Períodos por dia:', currentSchedule.periods.length);
      console.log('📅 Total de slots disponíveis por turma:', weekDays.length * currentSchedule.periods.length);

      if (teacherSubjects.length === 0) {
        toast.error('⚠️ Nenhuma associação professor-disciplina encontrada!\nConfigure em "Lotação de Professores"');
        setIsGenerating(false);
        return;
      }

      const sortedPeriods = [...currentSchedule.periods].sort((a, b) => a.period - b.period);
      let lessonIdCounter = 0;

      const toPositiveInteger = (value: unknown): number => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          return 0;
        }
        return Math.max(0, Math.floor(numericValue));
      };

      const getClassConfiguredHours = (currentClass: any, subjectId: string): number => {
        const weeklyHoursRaw = currentClass?.subjectWeeklyHours;
        if (!weeklyHoursRaw) {
          return 0;
        }

        if (weeklyHoursRaw instanceof Map) {
          return toPositiveInteger(weeklyHoursRaw.get(subjectId));
        }

        if (typeof weeklyHoursRaw.get === 'function') {
          return toPositiveInteger(weeklyHoursRaw.get(subjectId));
        }

        return toPositiveInteger(weeklyHoursRaw[subjectId]);
      };

      for (const currentClass of classesToGenerate) {
        console.log(`\n🏫 Processando turma: ${currentClass.grade?.name} ${currentClass.name}`);
        const classSubjects = currentClass.subjects || [];

        if (classSubjects.length === 0) {
          newConflicts.push(`❌ ${currentClass.grade?.name} ${currentClass.name}: Sem disciplinas associadas`);
          continue;
        }

        const classSubjectIds = new Set(classSubjects.map((subject: Subject) => subject.id));
        const classTeacherSubjects = teacherSubjects.filter((ts: TeacherSubject) => {
          if (!classSubjectIds.has(ts.subjectId)) {
            return false;
          }

          if (!activeTeacherById.has(ts.teacherId)) {
            return false;
          }

          return ts.classId === currentClass.id || !ts.classId;
        });

        let classLessonsNeeded = 0;
        for (const subject of classSubjects) {
          const classConfiguredHours = getClassConfiguredHours(currentClass, subject.id);
          const subjectDefaultHours = toPositiveInteger(subject.weeklyHours);

          const assignments = classTeacherSubjects.filter((ts: TeacherSubject) => {
            if (ts.subjectId !== subject.id) return false;
            return activeTeacherById.has(ts.teacherId);
          });

          if (assignments.length === 0) {
            newConflicts.push(`⚠️ ${currentClass.grade?.name} ${currentClass.name}: sem lotação para ${subject.name}`);
            continue;
          }

          const explicitAssignments = assignments.filter((ts: TeacherSubject) =>
            typeof ts.weeklyHours === 'number' && Number(ts.weeklyHours) > 0
          );

          const explicitRequested = explicitAssignments.reduce(
            (sum: number, ts: TeacherSubject) => sum + toPositiveInteger(ts.weeklyHours),
            0
          );

          const fallbackHours = classConfiguredHours || subjectDefaultHours || 2;
          const subjectTargetHours = explicitRequested > 0 ? explicitRequested : fallbackHours;

          if (subjectTargetHours <= 0) {
            newConflicts.push(`⚠️ ${currentClass.grade?.name} ${currentClass.name}: carga inválida para ${subject.name}`);
            continue;
          }

          const nonExplicitAssignments = assignments.filter((ts: TeacherSubject) =>
            !(typeof ts.weeklyHours === 'number' && Number(ts.weeklyHours) > 0)
          );

          const nonExplicitHoursByTeacher = new Map<string, number>();
          const remainingForNonExplicit = Math.max(0, subjectTargetHours - explicitRequested);

          if (nonExplicitAssignments.length > 0 && remainingForNonExplicit > 0) {
            const baseHours = Math.floor(remainingForNonExplicit / nonExplicitAssignments.length);
            const extraHours = remainingForNonExplicit % nonExplicitAssignments.length;

            nonExplicitAssignments.forEach((assignment: TeacherSubject, index: number) => {
              const distributedHours = baseHours + (index < extraHours ? 1 : 0);
              nonExplicitHoursByTeacher.set(assignment.teacherId, distributedHours);
            });
          }

          let subjectAllocatedHours = 0;
          for (const assignment of assignments) {
            const isExplicit = typeof assignment.weeklyHours === 'number' && Number(assignment.weeklyHours) > 0;
            const assignedHours = isExplicit
              ? toPositiveInteger(assignment.weeklyHours)
              : toPositiveInteger(nonExplicitHoursByTeacher.get(assignment.teacherId));

            if (assignedHours <= 0) {
              continue;
            }

            const subjectCategory = subjectCategoryById.get(subject.id) || 'regular';
            const categoryPriorityBoost =
              subjectCategory === 'core' ? 220 : subjectCategory === 'study' ? -260 : 80;

            for (let i = 0; i < assignedHours; i++) {
              lessonDemands.push({
                id: `L${lessonIdCounter++}`,
                classId: currentClass.id,
                subjectId: subject.id,
                candidateTeacherIds: [assignment.teacherId],
                preferredTeacherId: assignment.teacherId,
                requiredTeacherId: assignment.teacherId,
                isFixedTeacher: true,
                priority: 1000 + categoryPriorityBoost,
                allocated: false
              });
            }

            const allocationKey = `${currentClass.id}|${subject.id}|${assignment.teacherId}`;
            expectedAllocation.set(allocationKey, (expectedAllocation.get(allocationKey) || 0) + assignedHours);
            teacherRequiredLoad.set(
              assignment.teacherId,
              (teacherRequiredLoad.get(assignment.teacherId) || 0) + assignedHours
            );
            subjectAllocatedHours += assignedHours;
          }

          if (subjectAllocatedHours < subjectTargetHours) {
            const missingForSubject = subjectTargetHours - subjectAllocatedHours;
            const teacherNames = assignments
              .map((assignment: TeacherSubject) => teacherNameById.get(assignment.teacherId) || assignment.teacherId)
              .join(', ');
            newConflicts.push(
              `⚠️ ${currentClass.grade?.name} ${currentClass.name}: ${subject.name} com ${missingForSubject} aula(s) sem professor lotado com carga definida (${teacherNames})`
            );
          }

          classLessonsNeeded += subjectTargetHours;
        }

        const totalSlotsAvailable = weekDays.length * currentSchedule.periods.length;
        console.log(`  📊 Aulas necessárias: ${classLessonsNeeded} | Slots disponíveis: ${totalSlotsAvailable}`);

        if (!isPartialDayGeneration && classLessonsNeeded < totalSlotsAvailable) {
          newConflicts.push(
            `ℹ️ ${currentClass.grade?.name} ${currentClass.name}: carga total da lotação (${classLessonsNeeded}) é menor que os slots (${totalSlotsAvailable}). Slots restantes ficarão vazios por falta de carga cadastrada.`
          );
        }

        if (!isPartialDayGeneration && classLessonsNeeded > totalSlotsAvailable) {
          newConflicts.push(`⚠️ ${currentClass.grade?.name} ${currentClass.name}: ${classLessonsNeeded} aulas necessárias, mas apenas ${totalSlotsAvailable} slots disponíveis`);
        }
      }

      const expectedClassTeacherLoad = new Map<string, number>();
      for (const [allocationKey, expected] of expectedAllocation.entries()) {
        const [classId, _subjectId, teacherId] = allocationKey.split('|');
        const classTeacherKey = `${classId}|${teacherId}`;
        expectedClassTeacherLoad.set(
          classTeacherKey,
          (expectedClassTeacherLoad.get(classTeacherKey) || 0) + expected
        );
      }

      // Aulas com poucos slots possíveis precisam ser priorizadas para evitar déficits no fim.
      const totalPeriods = currentSchedule?.periods?.length || 8;
      const estimateFeasibleSlotsForLesson = (lesson: LessonDemand): number => {
        let feasibleSlots = 0;
        const lessonCategory = subjectCategoryById.get(lesson.subjectId) || 'regular';

        for (const day of weekDays) {
          for (const periodInfo of sortedPeriods) {
            const period = periodInfo.period;

            if (lessonCategory === 'study' && isEarlyPeriodForStudy(period, totalPeriods)) {
              continue;
            }

            const canFitAnyTeacher = lesson.candidateTeacherIds.some((teacherId) => {
              const candidate = activeTeacherById.get(teacherId);
              if (!candidate) return false;
              return isTeacherAvailableAtTime(candidate, day, period);
            });

            if (canFitAnyTeacher) {
              feasibleSlots++;
            }
          }
        }

        return feasibleSlots;
      };

      for (const lesson of lessonDemands) {
        const feasibleSlots = estimateFeasibleSlotsForLesson(lesson);
        if (feasibleSlots <= 0) {
          lesson.priority += 1200;
          continue;
        }

        if (feasibleSlots <= 4) {
          lesson.priority += 520;
        } else if (feasibleSlots <= 8) {
          lesson.priority += 280;
        } else if (feasibleSlots <= 12) {
          lesson.priority += 120;
        }
      }

      for (const teacher of activeTeachers) {
        const configuredLoad = toPositiveInteger(teacher.weeklyWorkload);
        const requiredLoad = teacherRequiredLoad.get(teacher.id) || 0;
        const effectiveMaxLoad = Math.max(configuredLoad, requiredLoad);

        teacherMaxLoadById.set(
          teacher.id,
          effectiveMaxLoad > 0 ? effectiveMaxLoad : Number.POSITIVE_INFINITY
        );
      }

      const teacherAvailableSlotsByDay = new Map<string, Map<string, number>>();
      const teacherAvailableDaysById = new Map<string, number>();
      const teacherTotalAvailableSlotsById = new Map<string, number>();
      const teacherDailyQuotaById = new Map<string, Map<string, number>>();
      const normalizeDayToken = (value: string): string =>
        value
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
      const activeDayTokens = new Set(weekDays.map((day) => normalizeDayToken(day)));
      const activePeriods = new Set(sortedPeriods.map((periodInfo) => periodInfo.period));

      for (const teacher of activeTeachers) {
        const availabilityByDay = new Map<string, number>();
        let totalAvailableSlots = 0;
        let outOfRangeAvailableSlots = 0;

        if (teacher.availability && typeof teacher.availability === 'object') {
          for (const [dayKey, dayAvailability] of Object.entries(teacher.availability)) {
            if (!activeDayTokens.has(normalizeDayToken(dayKey))) {
              continue;
            }

            if (!dayAvailability || typeof dayAvailability !== 'object') {
              continue;
            }

            for (const [periodKey, value] of Object.entries(dayAvailability)) {
              if (value !== true) {
                continue;
              }

              const period = Number(periodKey);
              if (!Number.isInteger(period)) {
                continue;
              }

              if (!activePeriods.has(period)) {
                outOfRangeAvailableSlots++;
              }
            }
          }
        }

        for (const day of weekDays) {
          let availableSlotsInDay = 0;

          for (const periodInfo of sortedPeriods) {
            if (isTeacherAvailableAtTime(teacher, day, periodInfo.period)) {
              availableSlotsInDay++;
            }
          }

          availabilityByDay.set(day, availableSlotsInDay);
          totalAvailableSlots += availableSlotsInDay;
        }

        const availableDays = weekDays.filter((day) => (availabilityByDay.get(day) || 0) > 0).length;

        teacherAvailableSlotsByDay.set(teacher.id, availabilityByDay);
        teacherAvailableDaysById.set(teacher.id, availableDays);
        teacherTotalAvailableSlotsById.set(teacher.id, totalAvailableSlots);

        const requiredLoad = teacherRequiredLoad.get(teacher.id) || 0;
        const quotaByDay = new Map<string, number>(weekDays.map((day) => [day, 0]));

        if (requiredLoad > 0) {
          if (totalAvailableSlots === 0) {
            newConflicts.push(
              `⚠️ ${teacher.name}: carga lotada (${requiredLoad}) sem nenhum slot disponível na agenda do professor.`
            );
          } else if (requiredLoad > totalAvailableSlots) {
            const outOfRangeHint =
              outOfRangeAvailableSlots > 0
                ? ` (${outOfRangeAvailableSlots} marcações fora da grade ativa)`
                : '';
            newConflicts.push(
              `⚠️ ${teacher.name}: carga lotada (${requiredLoad}) excede slots disponíveis (${totalAvailableSlots})${outOfRangeHint}.`
            );
          }
        }

        if (requiredLoad > 0 && totalAvailableSlots > 0) {
          const targets = weekDays.map((day) => {
            const slots = availabilityByDay.get(day) || 0;
            if (slots <= 0) {
              return { day, slots, base: 0, fractional: 0 };
            }

            const exact = (requiredLoad * slots) / totalAvailableSlots;
            const base = Math.min(slots, Math.floor(exact));

            return {
              day,
              slots,
              base,
              fractional: exact - Math.floor(exact)
            };
          });

          let allocated = 0;
          for (const target of targets) {
            quotaByDay.set(target.day, target.base);
            allocated += target.base;
          }

          let remaining = Math.max(0, requiredLoad - allocated);

          const byFraction = [...targets].sort(
            (a, b) => b.fractional - a.fractional || b.slots - a.slots
          );

          for (const target of byFraction) {
            if (remaining <= 0) break;
            if (target.slots <= 0) continue;

            const current = quotaByDay.get(target.day) || 0;
            if (current >= target.slots) continue;

            quotaByDay.set(target.day, current + 1);
            remaining--;
          }

          if (remaining > 0) {
            const byCapacity = [...targets].sort((a, b) => b.slots - a.slots);
            for (const target of byCapacity) {
              while (remaining > 0) {
                const current = quotaByDay.get(target.day) || 0;
                if (current >= target.slots) break;
                quotaByDay.set(target.day, current + 1);
                remaining--;
              }

              if (remaining <= 0) {
                break;
              }
            }
          }
        }

        teacherDailyQuotaById.set(teacher.id, quotaByDay);
      }

      const selectBestPlacement = (
        currentClassId: string,
        day: string,
        period: number,
        mode: number
      ) => {
        const classTimetable = allTimetables[currentClassId] || [];

        const countOpenSlotsForTeacherInClass = (
          teacher: Teacher,
          subjectId: string
        ): number => {
          let count = 0;

          for (const weekDay of weekDays) {
            for (const periodInfo of sortedPeriods) {
              const candidatePeriod = periodInfo.period;

              if (classSchedule[currentClassId][weekDay].has(candidatePeriod)) {
                continue;
              }

              if (globalTeacherSchedule[weekDay][candidatePeriod].has(teacher.id)) {
                continue;
              }

              if (mode < 4 && !isTeacherAvailableAtTime(teacher, weekDay, candidatePeriod)) {
                continue;
              }

              if (mode < 4) {
                if (
                  hasConsecutiveSubjectInSameClass(
                    classTimetable,
                    subjectId,
                    currentClassId,
                    weekDay,
                    candidatePeriod
                  )
                ) {
                  continue;
                }

                if (
                  hasConsecutiveTeacherInSameClass(
                    classTimetable,
                    teacher.id,
                    currentClassId,
                    weekDay,
                    candidatePeriod
                  )
                ) {
                  continue;
                }
              }

              count++;
            }
          }

          return count;
        };

        let bestPlacement:
          | {
              lesson: LessonDemand;
              teacher: Teacher;
              score: number;
              violatesAvailability: boolean;
            }
          | null = null;

        const pendingForClass = lessonDemands
          .filter((lesson) => !lesson.allocated && lesson.classId === currentClassId)
          .sort((a, b) => b.priority - a.priority);

        for (const lesson of pendingForClass) {
          const lessonCategory = subjectCategoryById.get(lesson.subjectId) || 'regular';
          const totalPeriods = currentSchedule?.periods?.length || 8;
          const latePeriodStart = Math.max(1, totalPeriods - 2);
          const allocationTeacherId =
            lesson.requiredTeacherId || lesson.preferredTeacherId || lesson.candidateTeacherIds[0] || '';
          const allocationKey = `${currentClassId}|${lesson.subjectId}|${allocationTeacherId}`;
          const remainingForAllocation = Math.max(
            0,
            (expectedAllocation.get(allocationKey) || 0) - (actualAllocation.get(allocationKey) || 0)
          );

          let softPenalty = 0;
          if (lessonCategory === 'study' && isEarlyPeriodForStudy(period, totalPeriods)) {
            softPenalty -= mode === 0 ? 220 : mode === 1 ? 120 : 40;
          }

          if (lessonCategory === 'study') {
            const sameStudyCountInDay = countSubjectSlotsInDay(
              classTimetable,
              currentClassId,
              day,
              lesson.subjectId
            );

            if (sameStudyCountInDay > 0) {
              continue;
            }

            const studyCountInDay = countStudySlotsInDay(
              classTimetable,
              currentClassId,
              day,
              subjectCategoryById
            );

            if (studyCountInDay > 0) {
              continue;
            }

            if (period < latePeriodStart && mode < 2) {
              continue;
            }

            if (period < latePeriodStart) {
              softPenalty -= 180;
            } else {
              softPenalty += 140;
            }

            if (studyCountInDay > 0) {
              softPenalty -= studyCountInDay * 220;
            } else {
              softPenalty += 90;
            }
          }

          if (
            lessonCategory === 'study' &&
            hasAdjacentStudyInSameClass(classTimetable, currentClassId, day, period, subjectCategoryById)
          ) {
            continue;
          }

          const subjectFlexBonus = Math.max(0, 60 - lesson.candidateTeacherIds.length * 10);
          let bestTeacherForLesson:
            | { teacher: Teacher; score: number; availableAtTime: boolean }
            | null = null;

          for (const teacherId of lesson.candidateTeacherIds) {
            const candidate = activeTeacherById.get(teacherId);
            if (!candidate) continue;

            const isAvailableAtTime = isTeacherAvailableAtTime(candidate, day, period);
            if (!isAvailableAtTime && mode < 4) {
              continue;
            }

            const currentTeacherLoad = teacherAssignedLoad.get(candidate.id) || 0;
            const teacherMaxLoad = teacherMaxLoadById.get(candidate.id) || Number.POSITIVE_INFINITY;
            if (currentTeacherLoad >= teacherMaxLoad) {
              continue;
            }

            if (globalTeacherSchedule[day][period].has(candidate.id)) {
              continue;
            }

            const teacherRequired = teacherRequiredLoad.get(candidate.id) || 0;
            const teacherDailyLoad = countTeacherSlotsInDay(
              globalTeacherSchedule,
              candidate.id,
              day,
              totalPeriods
            );
            const teacherActiveDays = weekDays.filter((weekDay) =>
              countTeacherSlotsInDay(globalTeacherSchedule, candidate.id, weekDay, totalPeriods) > 0
            ).length;
            const teacherAvailableDays = teacherAvailableDaysById.get(candidate.id) || 0;
            const teacherTotalAvailableSlots = teacherTotalAvailableSlotsById.get(candidate.id) || 0;
            const teacherAvailableSlotsInDay =
              teacherAvailableSlotsByDay.get(candidate.id)?.get(day) || 0;
            const teacherDayQuota = teacherDailyQuotaById.get(candidate.id)?.get(day) || 0;
            const effectiveAvailableDays = Math.max(
              1,
              teacherAvailableDays > 0 ? teacherAvailableDays : weekDays.length
            );
            const teacherTargetActiveDays = Math.max(
              1,
              Math.min(
                effectiveAvailableDays,
                teacherRequired > 0 ? teacherRequired : effectiveAvailableDays
              )
            );
            const teacherTargetDailyLoad = Math.max(
              1,
              Math.ceil(Math.max(teacherRequired, 1) / teacherTargetActiveDays)
            );
            const teacherHardDailyLoad =
              teacherTargetDailyLoad +
              (mode >= 3 ? 1 : 0) +
              (mode >= 4 ? 1 : 0);

            if (mode < 4 && teacherAvailableSlotsInDay > 0 && teacherDailyLoad >= teacherAvailableSlotsInDay) {
              continue;
            }

            // Before relaxed modes, force opening new working days when a teacher still
            // has room to spread load through the week.
            if (
              mode < 1 &&
              teacherActiveDays < teacherTargetActiveDays &&
              teacherDailyLoad > 0
            ) {
              continue;
            }

            if (teacherDailyLoad >= teacherHardDailyLoad) {
              continue;
            }

            const classTeacherWeeklyTarget =
              expectedClassTeacherLoad.get(`${currentClassId}|${candidate.id}`) || teacherRequired;
            const classTeacherDayCount = countTeacherClassSlotsInDay(
              classTimetable,
              currentClassId,
              candidate.id,
              day
            );
            const classTeacherDayLimit =
              getTeacherClassDailyLimit(classTeacherWeeklyTarget) +
              (mode >= 4 && classTeacherWeeklyTarget <= 4 ? 1 : 0);

            if (mode < 4 && classTeacherDayCount >= classTeacherDayLimit) {
              continue;
            }

            const classSubjectTeacherKey = `${currentClassId}|${lesson.subjectId}|${candidate.id}`;
            const classSubjectTeacherWeeklyTarget = expectedAllocation.get(classSubjectTeacherKey) || 0;
            const teacherSubjectDayCount = countTeacherSubjectSlotsInClassDay(
              classTimetable,
              currentClassId,
              candidate.id,
              lesson.subjectId,
              day
            );
            const teacherSubjectDayLimit =
              getTeacherSubjectDailyLimit(classSubjectTeacherWeeklyTarget) +
              (mode >= 4 && classSubjectTeacherWeeklyTarget <= 4 ? 1 : 0);

            if (mode < 4 && teacherSubjectDayCount >= teacherSubjectDayLimit) {
              continue;
            }

            const openSlotsForTeacherInClass = countOpenSlotsForTeacherInClass(
              candidate,
              lesson.subjectId
            );

            if (openSlotsForTeacherInClass <= 0) {
              continue;
            }

            const openSlotsTodayForTeacherInClass = sortedPeriods.filter((periodInfo) => {
              const candidatePeriod = periodInfo.period;

              if (classSchedule[currentClassId][day].has(candidatePeriod)) {
                return false;
              }

              if (globalTeacherSchedule[day][candidatePeriod].has(candidate.id)) {
                return false;
              }

              if (mode < 4) {
                return isTeacherAvailableAtTime(candidate, day, candidatePeriod);
              }

              return true;
            }).length;

            const consecutiveSubjectConflict = hasConsecutiveSubjectInSameClass(
              classTimetable,
              lesson.subjectId,
              currentClassId,
              day,
              period
            );

            const consecutiveTeacherConflict = hasConsecutiveTeacherInSameClass(
              classTimetable,
              candidate.id,
              currentClassId,
              day,
              period
            );

            if (mode < 4) {
              if (consecutiveSubjectConflict || consecutiveTeacherConflict) {
                continue;
              }
            }

            let teacherScore = calculateTeacherPreferenceScore(
              globalTeacherSchedule,
              candidate.id,
              day,
              period,
              teacherRequired
            );

            if (teacherActiveDays < teacherTargetActiveDays) {
              if (teacherDailyLoad === 0) {
                teacherScore += 320;
              } else {
                teacherScore -= 280;
              }
            }

            if (teacherDailyLoad >= teacherTargetDailyLoad) {
              teacherScore -= (teacherDailyLoad - teacherTargetDailyLoad + 1) * 140;
            } else {
              teacherScore += 30;
            }

            if (teacherDayQuota > 0) {
              if (teacherDailyLoad < teacherDayQuota) {
                teacherScore += 210 + (teacherDayQuota - teacherDailyLoad) * 90;
              } else {
                teacherScore -= (teacherDailyLoad - teacherDayQuota + 1) * 120;
              }
            } else if (teacherDailyLoad > 0 && teacherRequired > 0) {
              teacherScore -= 130;
            }

            if (teacherRequired > 0 && teacherTotalAvailableSlots > 0) {
              const scarcityRatio = teacherRequired / teacherTotalAvailableSlots;
              teacherScore += scarcityRatio * 160;
              if (scarcityRatio >= 0.8 && teacherDayQuota > 0 && teacherDailyLoad < teacherDayQuota) {
                teacherScore += 120;
              }
            }

            if (remainingForAllocation > 0) {
              if (openSlotsForTeacherInClass <= remainingForAllocation) {
                teacherScore += 1800;
              } else if (openSlotsForTeacherInClass <= remainingForAllocation + 2) {
                teacherScore += 900;
              } else if (openSlotsForTeacherInClass <= remainingForAllocation + 4) {
                teacherScore += 420;
              }
            }

            if (openSlotsTodayForTeacherInClass <= 1) {
              teacherScore += 180;
            } else if (openSlotsTodayForTeacherInClass <= 2) {
              teacherScore += 70;
            }

            if (lesson.preferredTeacherId === candidate.id) {
              teacherScore += 25;
            }
            if (lesson.isFixedTeacher) {
              teacherScore += 90;
            }

            if (Number.isFinite(teacherMaxLoad)) {
              const occupancyRatio = teacherMaxLoad > 0 ? currentTeacherLoad / teacherMaxLoad : 1;
              teacherScore -= occupancyRatio * 120;
            }

            // Regra 3: evitar professor com apenas 1 aula no dia
            {
              const freeSlotsTodayForTeacher = sortedPeriods.filter(p => {
                const pp = p.period;
                if (pp === period) return false;
                if (globalTeacherSchedule[day][pp]?.has(candidate.id)) return false;
                if (mode < 4 && !isTeacherAvailableAtTime(candidate, day, pp)) return false;
                return true;
              }).length;

              if (teacherDailyLoad === 0) {
                if (freeSlotsTodayForTeacher === 0) {
                  // Seria aula solitária no dia — penalizar fortemente
                  teacherScore -= 380;
                } else {
                  // Há espaço para mais aulas hoje: incentivo leve de agrupamento
                  teacherScore += 30;
                }
              } else if (teacherDailyLoad === 1) {
                // Segunda aula do dia: bônus por completar o par
                teacherScore += 230;
              }
            }

            // Regra 4: professores de baixa carga preferem blocos consecutivos entre turmas
            {
              const totalRequired = teacherRequiredLoad.get(candidate.id) || 0;
              const periodsTotalInWeek = (currentSchedule?.periods?.length || 8) * weekDays.length;
              const isHighLoadTeacher = totalRequired >= Math.ceil(periodsTotalInWeek * 0.45);

              if (!isHighLoadTeacher && teacherDailyLoad > 0) {
                const existingPeriodsToday = sortedPeriods
                  .filter(p => globalTeacherSchedule[day][p.period]?.has(candidate.id))
                  .map(p => p.period);
                const isAdjacentAcrossClasses = existingPeriodsToday.some(p => Math.abs(p - period) === 1);

                if (isAdjacentAcrossClasses) {
                  // Bônus por bloco consecutivo entre turmas distintas
                  teacherScore += 200;
                } else {
                  // Penalizar lacunas grandes para professores de baixa carga
                  const allProjectedPeriods = [...existingPeriodsToday, period].sort((a, b) => a - b);
                  let maxGapAcross = 0;
                  for (let gi = 1; gi < allProjectedPeriods.length; gi++) {
                    maxGapAcross = Math.max(maxGapAcross, allProjectedPeriods[gi] - allProjectedPeriods[gi - 1] - 1);
                  }
                  if (maxGapAcross > 1) {
                    teacherScore -= maxGapAcross * 90;
                  }
                }
              }
            }

            if (mode >= 4) {
              if (!isAvailableAtTime) {
                teacherScore -= 650;
              }

              if (consecutiveSubjectConflict) {
                teacherScore -= 160;
              }
              if (consecutiveTeacherConflict) {
                teacherScore -= 190;
              }
            }

            if (!bestTeacherForLesson || teacherScore > bestTeacherForLesson.score) {
              bestTeacherForLesson = {
                teacher: candidate,
                score: teacherScore,
                availableAtTime: isAvailableAtTime
              };
            }
          }

          if (!bestTeacherForLesson) {
            continue;
          }

          const periodPreferenceScore = calculatePeriodPreferenceScore(lessonCategory, period, totalPeriods);
          const totalScore =
            bestTeacherForLesson.score +
            lesson.priority +
            remainingForAllocation * 160 +
            subjectFlexBonus +
            periodPreferenceScore +
            softPenalty;

          if (!bestPlacement || totalScore > bestPlacement.score) {
            bestPlacement = {
              lesson,
              teacher: bestTeacherForLesson.teacher,
              score: totalScore,
              violatesAvailability: !bestTeacherForLesson.availableAtTime
            };
          }
        }

        return bestPlacement;
      };

      let attemptMode = 0;
      while (attemptMode < 5 && lessonDemands.some((lesson) => !lesson.allocated)) {
        let allocatedThisMode = 0;
        let progress = true;

        while (progress && lessonDemands.some((lesson) => !lesson.allocated)) {
          progress = false;

          const classesByPending = [...classesToGenerate].sort((classA, classB) => {
            const pendingA = lessonDemands.filter((lesson) => !lesson.allocated && lesson.classId === classA.id).length;
            const pendingB = lessonDemands.filter((lesson) => !lesson.allocated && lesson.classId === classB.id).length;
            return pendingB - pendingA;
          });

          const classIterationOrder = attemptMode >= 3 ? classesByPending : classesToGenerate;
          const periodIterationOrder =
            attemptMode >= 4 ? [...sortedPeriods].sort((a, b) => b.period - a.period) : sortedPeriods;

          for (const day of weekDays) {
            for (const periodInfo of periodIterationOrder) {
              for (const currentClass of classIterationOrder) {
                if (classSchedule[currentClass.id][day].has(periodInfo.period)) {
                  continue;
                }

                const placement = selectBestPlacement(currentClass.id, day, periodInfo.period, attemptMode);
                if (!placement) {
                  continue;
                }

                const subject = subjects.find((s: Subject) => s.id === placement.lesson.subjectId);

                allTimetables[currentClass.id].push({
                  day,
                  period: periodInfo.period,
                  subjectId: placement.lesson.subjectId,
                  teacherId: placement.teacher.id,
                  classId: currentClass.id
                });

                placement.lesson.allocated = true;
                classSchedule[currentClass.id][day].add(periodInfo.period);
                globalTeacherSchedule[day][periodInfo.period].add(placement.teacher.id);
                teacherAssignedLoad.set(
                  placement.teacher.id,
                  (teacherAssignedLoad.get(placement.teacher.id) || 0) + 1
                );

                if (placement.violatesAvailability) {
                  availabilityOverridesUsed++;
                }

                const actualKey = `${currentClass.id}|${placement.lesson.subjectId}|${placement.teacher.id}`;
                actualAllocation.set(actualKey, (actualAllocation.get(actualKey) || 0) + 1);

                const totalPeriods = currentSchedule?.periods?.length || 8;
                const teacherDaySlots = Array.from({ length: totalPeriods }, (_, i) => i + 1)
                  .filter(p => globalTeacherSchedule[day][p]?.has(placement.teacher.id));
                const isSequential = teacherDaySlots.length > 1;

                console.log(
                  `  ✅ ${day} ${periodInfo.period}º: ${subject?.name || placement.lesson.subjectId} - Prof. ${placement.teacher.name}` +
                  `${isSequential ? ' (sequencial ✨)' : ''}`
                );

                allocatedThisMode++;
                progress = true;
              }
            }
          }
        }

        if (lessonDemands.some((lesson) => !lesson.allocated)) {
          attemptMode++;
          if (attemptMode === 1) {
            console.log('  🔄 Modo 1: reduzindo penalidades de preferências para fechar lacunas...');
          } else if (attemptMode === 2) {
            console.log('  🔄 Modo 2: priorizando alocação total da lotação acima de preferências de distribuição...');
          } else if (attemptMode === 3) {
            console.log('  🔄 Modo 3: priorizando turmas com maior déficit restante...');
          } else if (attemptMode === 4) {
            console.log('  🔄 Modo 4: invertendo prioridade de períodos para capturar lacunas remanescentes...');
          }
        }

        if (allocatedThisMode === 0 && attemptMode >= 4) {
          break;
        }
      }

      const tryRelocateTeacherBlockingSlot = (
        teacherId: string,
        blockedDay: string,
        blockedPeriod: number,
        targetClassId: string,
        allowAvailabilityOverride = false
      ): boolean => {
        if (!globalTeacherSchedule[blockedDay]?.[blockedPeriod]?.has(teacherId)) {
          return true;
        }

        const teacher = activeTeacherById.get(teacherId);
        if (!teacher) {
          return false;
        }

        const allSlots = Object.values(allTimetables).flat();
        const blockingSlot = allSlots.find((slot) => {
          if (slot.teacherId !== teacherId) return false;
          if (slot.day !== blockedDay) return false;
          if (slot.period !== blockedPeriod) return false;
          return slot.classId !== targetClassId;
        });

        if (!blockingSlot) {
          return false;
        }

        const blockingClassId = blockingSlot.classId;
        const dayOrder = [blockedDay, ...weekDays.filter((day) => day !== blockedDay)];

        for (const day of dayOrder) {
          for (const periodInfo of sortedPeriods) {
            const period = periodInfo.period;

            if (day === blockedDay && period === blockedPeriod) {
              continue;
            }

            if (classSchedule[blockingClassId][day].has(period)) {
              continue;
            }

            if (globalTeacherSchedule[day][period].has(teacherId)) {
              continue;
            }

            const teacherAvailableAtTime = isTeacherAvailableAtTime(teacher, day, period);
            if (!allowAvailabilityOverride && !teacherAvailableAtTime) {
              continue;
            }

            classSchedule[blockingClassId][blockingSlot.day].delete(blockingSlot.period);
            globalTeacherSchedule[blockingSlot.day][blockingSlot.period].delete(teacherId);

            blockingSlot.day = day;
            blockingSlot.period = period;

            classSchedule[blockingClassId][day].add(period);
            globalTeacherSchedule[day][period].add(teacherId);

            if (allowAvailabilityOverride && !teacherAvailableAtTime) {
              availabilityOverridesUsed++;
            }

            return true;
          }
        }

        // Sem slot vazio no horário bloqueador: tentar swap com outro slot ocupado
        // da mesma turma para liberar o horário necessário.
        const blockingClassTimetable = allTimetables[blockingClassId] || [];
        for (const swapSlot of blockingClassTimetable) {
          if (swapSlot.day === blockedDay && swapSlot.period === blockedPeriod) {
            continue;
          }

          const displacedTeacherId = swapSlot.teacherId;
          if (!displacedTeacherId || displacedTeacherId === teacherId) {
            continue;
          }

          const displacedTeacher = activeTeacherById.get(displacedTeacherId);
          if (!displacedTeacher) {
            continue;
          }

          if (globalTeacherSchedule[swapSlot.day][swapSlot.period].has(teacherId)) {
            continue;
          }

          if (globalTeacherSchedule[blockedDay][blockedPeriod].has(displacedTeacherId)) {
            continue;
          }

          const teacherAvailableAtSwap = isTeacherAvailableAtTime(
            teacher,
            swapSlot.day,
            swapSlot.period
          );

          if (!allowAvailabilityOverride && !teacherAvailableAtSwap) {
            continue;
          }

          const displacedAvailableAtBlocked = isTeacherAvailableAtTime(
            displacedTeacher,
            blockedDay,
            blockedPeriod
          );

          if (!allowAvailabilityOverride && !displacedAvailableAtBlocked) {
            continue;
          }

          globalTeacherSchedule[blockedDay][blockedPeriod].delete(teacherId);
          globalTeacherSchedule[blockedDay][blockedPeriod].add(displacedTeacherId);

          globalTeacherSchedule[swapSlot.day][swapSlot.period].delete(displacedTeacherId);
          globalTeacherSchedule[swapSlot.day][swapSlot.period].add(teacherId);

          blockingSlot.day = swapSlot.day;
          blockingSlot.period = swapSlot.period;

          swapSlot.day = blockedDay;
          swapSlot.period = blockedPeriod;

          if (allowAvailabilityOverride) {
            if (!teacherAvailableAtSwap) {
              availabilityOverridesUsed++;
            }

            if (!displacedAvailableAtBlocked) {
              availabilityOverridesUsed++;
            }
          }

          return true;
        }

        return false;
      };

      const fillPendingDeficitsInEmptySlots = () => {
        let filledLessons = 0;
        const periodPriority = [...sortedPeriods].sort((a, b) => b.period - a.period);

        const pendingDeficits = Array.from(expectedAllocation.entries())
          .map(([allocationKey, expected]) => {
            const allocated = actualAllocation.get(allocationKey) || 0;
            return {
              allocationKey,
              expected,
              allocated,
              missing: expected - allocated
            };
          })
          .filter((entry) => entry.missing > 0)
          .sort((a, b) => b.missing - a.missing);

        for (const deficitEntry of pendingDeficits) {
          let remaining = deficitEntry.missing;
          const [classId, subjectId, teacherId] = deficitEntry.allocationKey.split('|');
          const teacher = activeTeacherById.get(teacherId);
          const targetCategory = subjectCategoryById.get(subjectId) || 'regular';

          if (!teacher) {
            continue;
          }

          while (remaining > 0) {
            const classTimetable = allTimetables[classId] || [];
            let chosenSlot:
              | {
                  day: string;
                  period: number;
                  violatesAvailability: boolean;
                }
              | null = null;

            for (const enforceAvailability of [true, false]) {
              let allowConsecutiveInSameClass = false;
              for (let pass = 0; pass < 2 && !chosenSlot; pass++) {
              for (const day of weekDays) {
                if (targetCategory === 'study') {
                  const studyCountInDay = countStudySlotsInDay(
                    classTimetable,
                    classId,
                    day,
                    subjectCategoryById
                  );

                  if (studyCountInDay > 0) {
                    continue;
                  }
                }

                for (const periodInfo of periodPriority) {
                  const period = periodInfo.period;

                  if (classSchedule[classId][day].has(period)) {
                    continue;
                  }

                  if (!allowConsecutiveInSameClass) {
                    if (
                      hasConsecutiveTeacherInSameClass(
                        classTimetable,
                        teacherId,
                        classId,
                        day,
                        period
                      )
                    ) {
                      continue;
                    }
                  }

                  const availableAtTime = isTeacherAvailableAtTime(teacher, day, period);
                  if (enforceAvailability && !availableAtTime) {
                    continue;
                  }

                  if (
                    targetCategory === 'study' &&
                    hasAdjacentStudyInSameClass(
                      classTimetable,
                      classId,
                      day,
                      period,
                      subjectCategoryById
                    )
                  ) {
                    continue;
                  }

                  if (!allowConsecutiveInSameClass) {
                    if (
                      hasConsecutiveSubjectInSameClass(
                        classTimetable,
                        subjectId,
                        classId,
                        day,
                        period
                      )
                    ) {
                      continue;
                    }
                  }

                  if (globalTeacherSchedule[day][period].has(teacherId)) {
                    const relocated = tryRelocateTeacherBlockingSlot(
                      teacherId,
                      day,
                      period,
                      classId,
                      !enforceAvailability
                    );

                    if (!relocated) {
                      continue;
                    }
                  }

                  chosenSlot = {
                    day,
                    period,
                    violatesAvailability: !availableAtTime
                  };
                  break;
                }

                if (chosenSlot) {
                  break;
                }
              }

              if (!chosenSlot) {
                allowConsecutiveInSameClass = true;
              }
            }

              if (chosenSlot) {
                break;
              }
            }

            if (!chosenSlot) {
              break;
            }

            allTimetables[classId].push({
              day: chosenSlot.day,
              period: chosenSlot.period,
              subjectId,
              teacherId,
              classId
            });

            classSchedule[classId][chosenSlot.day].add(chosenSlot.period);
            globalTeacherSchedule[chosenSlot.day][chosenSlot.period].add(teacherId);
            teacherAssignedLoad.set(
              teacherId,
              (teacherAssignedLoad.get(teacherId) || 0) + 1
            );

            actualAllocation.set(
              deficitEntry.allocationKey,
              (actualAllocation.get(deficitEntry.allocationKey) || 0) + 1
            );

            if (chosenSlot.violatesAvailability) {
              availabilityOverridesUsed++;
            }

            const pendingLesson = lessonDemands.find((lesson) => {
              if (lesson.allocated) return false;
              if (lesson.classId !== classId) return false;
              if (lesson.subjectId !== subjectId) return false;
              if (lesson.requiredTeacherId) {
                return lesson.requiredTeacherId === teacherId;
              }
              return lesson.candidateTeacherIds.includes(teacherId);
            });

            if (pendingLesson) {
              pendingLesson.allocated = true;
            }

            filledLessons++;
            remaining--;
          }
        }

        return filledLessons;
      };

      const rebalanceDeficits = () => {
        let repairedLessons = 0;
        let keepSearching = true;

        while (keepSearching) {
          keepSearching = false;

          const deficitEntries = Array.from(expectedAllocation.entries())
            .map(([allocationKey, expected]) => {
              const allocated = actualAllocation.get(allocationKey) || 0;
              return {
                allocationKey,
                expected,
                allocated,
                missing: expected - allocated
              };
            })
            .filter((entry) => entry.missing > 0)
            .sort((a, b) => b.missing - a.missing);

          if (deficitEntries.length === 0) {
            break;
          }

          for (const deficitEntry of deficitEntries) {
            const [classId, subjectId, teacherId] = deficitEntry.allocationKey.split('|');
            const classTimetable = allTimetables[classId] || [];
            const targetTeacher = activeTeacherById.get(teacherId);
            const targetCategory = subjectCategoryById.get(subjectId) || 'regular';

            if (!targetTeacher) {
              continue;
            }

            let repairedThisDeficit = false;

            const rebalanceStrategies = [
              { allowConsecutiveInSameClass: false, allowAvailabilityOverride: false },
              { allowConsecutiveInSameClass: true, allowAvailabilityOverride: false },
              { allowConsecutiveInSameClass: false, allowAvailabilityOverride: true },
              { allowConsecutiveInSameClass: true, allowAvailabilityOverride: true }
            ];

            for (const strategy of rebalanceStrategies) {
              for (const slot of classTimetable) {
              const sourceKey = `${classId}|${slot.subjectId}|${slot.teacherId}`;
              const sourceExpected = expectedAllocation.get(sourceKey) || 0;
              const sourceAllocated = actualAllocation.get(sourceKey) || 0;

              if (sourceAllocated <= sourceExpected) {
                continue;
              }

              if (slot.subjectId === subjectId && slot.teacherId === teacherId) {
                continue;
              }

              if (targetCategory === 'study') {
                const sameDayStudyCount = countStudySlotsInDay(
                  classTimetable,
                  classId,
                  slot.day,
                  subjectCategoryById
                );

                if (sameDayStudyCount > 0) {
                  continue;
                }

                if (
                  hasAdjacentStudyInSameClass(
                    classTimetable,
                    classId,
                    slot.day,
                    slot.period,
                    subjectCategoryById
                  )
                ) {
                  continue;
                }
              }

              if (!strategy.allowConsecutiveInSameClass) {
                if (
                  hasConsecutiveSubjectInSameClass(
                    classTimetable,
                    subjectId,
                    classId,
                    slot.day,
                    slot.period
                  )
                ) {
                  continue;
                }

                if (
                  hasConsecutiveTeacherInSameClass(
                    classTimetable,
                    teacherId,
                    classId,
                    slot.day,
                    slot.period
                  )
                ) {
                  continue;
                }
              }

              const targetAvailableAtSlot = isTeacherAvailableAtTime(targetTeacher, slot.day, slot.period);
              if (!strategy.allowAvailabilityOverride && !targetAvailableAtSlot) {
                continue;
              }

              if (globalTeacherSchedule[slot.day][slot.period].has(teacherId)) {
                const relocated = tryRelocateTeacherBlockingSlot(
                  teacherId,
                  slot.day,
                  slot.period,
                  classId,
                  strategy.allowAvailabilityOverride
                );

                if (!relocated) {
                  continue;
                }
              }

              globalTeacherSchedule[slot.day][slot.period].delete(slot.teacherId);
              globalTeacherSchedule[slot.day][slot.period].add(teacherId);

              teacherAssignedLoad.set(slot.teacherId, Math.max(0, (teacherAssignedLoad.get(slot.teacherId) || 0) - 1));
              teacherAssignedLoad.set(teacherId, (teacherAssignedLoad.get(teacherId) || 0) + 1);

              actualAllocation.set(sourceKey, sourceAllocated - 1);
              actualAllocation.set(deficitEntry.allocationKey, (actualAllocation.get(deficitEntry.allocationKey) || 0) + 1);

              if (!targetAvailableAtSlot) {
                availabilityOverridesUsed++;
              }

              slot.subjectId = subjectId;
              slot.teacherId = teacherId;

              const pendingLesson = lessonDemands.find((lesson) => {
                if (lesson.allocated) return false;
                if (lesson.classId !== classId) return false;
                if (lesson.subjectId !== subjectId) return false;
                if (lesson.requiredTeacherId) {
                  return lesson.requiredTeacherId === teacherId;
                }
                return lesson.candidateTeacherIds.includes(teacherId);
              });

              if (pendingLesson) {
                pendingLesson.allocated = true;
              }

              repairedLessons++;
              repairedThisDeficit = true;
              keepSearching = true;
              break;
            }

              if (repairedThisDeficit) {
                break;
              }
            }

            if (repairedThisDeficit) {
              break;
            }
          }
        }

        return repairedLessons;
      };

      const resolveDeficitsByClassSlotSwap = () => {
        let fixedBySwap = 0;

        const pendingDeficits = Array.from(expectedAllocation.entries())
          .map(([allocationKey, expected]) => {
            const allocated = actualAllocation.get(allocationKey) || 0;
            return {
              allocationKey,
              expected,
              allocated,
              missing: expected - allocated
            };
          })
          .filter((entry) => entry.missing > 0)
          .sort((a, b) => b.missing - a.missing);

        for (const deficitEntry of pendingDeficits) {
          let remaining = deficitEntry.missing;
          const [classId, subjectId, teacherId] = deficitEntry.allocationKey.split('|');
          const targetTeacher = activeTeacherById.get(teacherId);
          const targetCategory = subjectCategoryById.get(subjectId) || 'regular';

          if (!targetTeacher) {
            continue;
          }

          while (remaining > 0) {
            const classTimetable = allTimetables[classId] || [];
            const emptySlots = weekDays.flatMap((day) =>
              sortedPeriods
                .map((periodInfo) => periodInfo.period)
                .filter((period) => !classSchedule[classId][day].has(period))
                .map((period) => ({ day, period }))
            );

            if (emptySlots.length === 0) {
              break;
            }

            let swapApplied = false;

            for (const enforceAvailability of [true, false]) {
              let allowConsecutiveInSameClass = false;
              for (let pass = 0; pass < 2 && !swapApplied; pass++) {
              for (const occupiedSlot of classTimetable) {
                const occupiedCategory = subjectCategoryById.get(occupiedSlot.subjectId) || 'regular';
                if (occupiedSlot.subjectId === subjectId && occupiedSlot.teacherId === teacherId) {
                  continue;
                }

                if (targetCategory === 'study') {
                  const existingStudyInDay = countStudySlotsInDay(
                    classTimetable,
                    classId,
                    occupiedSlot.day,
                    subjectCategoryById
                  );

                  if (existingStudyInDay > 0) {
                    continue;
                  }
                }

                if (
                  targetCategory === 'study' &&
                  hasAdjacentStudyInSameClass(
                    classTimetable,
                    classId,
                    occupiedSlot.day,
                    occupiedSlot.period,
                    subjectCategoryById
                  )
                ) {
                  continue;
                }

                if (globalTeacherSchedule[occupiedSlot.day][occupiedSlot.period].has(teacherId)) {
                  const relocated = tryRelocateTeacherBlockingSlot(
                    teacherId,
                    occupiedSlot.day,
                    occupiedSlot.period,
                    classId,
                    !enforceAvailability
                  );

                  if (!relocated) {
                    continue;
                  }
                }

                if (!allowConsecutiveInSameClass) {
                  if (
                    hasConsecutiveSubjectInSameClass(
                      classTimetable,
                      subjectId,
                      classId,
                      occupiedSlot.day,
                      occupiedSlot.period
                    ) ||
                    hasConsecutiveTeacherInSameClass(
                      classTimetable,
                      teacherId,
                      classId,
                      occupiedSlot.day,
                      occupiedSlot.period
                    )
                  ) {
                    continue;
                  }
                }

                const targetTeacherAvailable = isTeacherAvailableAtTime(
                  targetTeacher,
                  occupiedSlot.day,
                  occupiedSlot.period
                );

                if (enforceAvailability && !targetTeacherAvailable) {
                  continue;
                }

                const displacedTeacher = activeTeacherById.get(occupiedSlot.teacherId);
                if (!displacedTeacher) {
                  continue;
                }

                let relocation:
                  | {
                      day: string;
                      period: number;
                      violatesAvailability: boolean;
                    }
                  | null = null;

                for (const emptySlot of emptySlots) {
                  if (globalTeacherSchedule[emptySlot.day][emptySlot.period].has(displacedTeacher.id)) {
                    continue;
                  }

                  if (!allowConsecutiveInSameClass) {
                    if (
                      hasConsecutiveSubjectInSameClass(
                        classTimetable,
                        occupiedSlot.subjectId,
                        classId,
                        emptySlot.day,
                        emptySlot.period
                      ) ||
                      hasConsecutiveTeacherInSameClass(
                        classTimetable,
                        displacedTeacher.id,
                        classId,
                        emptySlot.day,
                        emptySlot.period
                      )
                    ) {
                      continue;
                    }
                  }

                  if (
                    occupiedCategory === 'study' &&
                    hasAdjacentStudyInSameClass(
                      classTimetable,
                      classId,
                      emptySlot.day,
                      emptySlot.period,
                      subjectCategoryById
                    )
                  ) {
                    continue;
                  }

                  const displacedAvailable = isTeacherAvailableAtTime(
                    displacedTeacher,
                    emptySlot.day,
                    emptySlot.period
                  );

                  if (enforceAvailability && !displacedAvailable) {
                    continue;
                  }

                  relocation = {
                    day: emptySlot.day,
                    period: emptySlot.period,
                    violatesAvailability: !displacedAvailable
                  };
                  break;
                }

                if (!relocation) {
                  continue;
                }

                globalTeacherSchedule[occupiedSlot.day][occupiedSlot.period].delete(occupiedSlot.teacherId);
                globalTeacherSchedule[occupiedSlot.day][occupiedSlot.period].add(teacherId);

                allTimetables[classId].push({
                  classId,
                  day: relocation.day,
                  period: relocation.period,
                  subjectId: occupiedSlot.subjectId,
                  teacherId: occupiedSlot.teacherId
                });

                classSchedule[classId][relocation.day].add(relocation.period);
                globalTeacherSchedule[relocation.day][relocation.period].add(occupiedSlot.teacherId);

                occupiedSlot.subjectId = subjectId;
                occupiedSlot.teacherId = teacherId;

                teacherAssignedLoad.set(
                  teacherId,
                  (teacherAssignedLoad.get(teacherId) || 0) + 1
                );

                actualAllocation.set(
                  deficitEntry.allocationKey,
                  (actualAllocation.get(deficitEntry.allocationKey) || 0) + 1
                );

                if (!targetTeacherAvailable || relocation.violatesAvailability) {
                  availabilityOverridesUsed++;
                }

                const pendingLesson = lessonDemands.find((lesson) => {
                  if (lesson.allocated) return false;
                  if (lesson.classId !== classId) return false;
                  if (lesson.subjectId !== subjectId) return false;
                  if (lesson.requiredTeacherId) {
                    return lesson.requiredTeacherId === teacherId;
                  }
                  return lesson.candidateTeacherIds.includes(teacherId);
                });

                if (pendingLesson) {
                  pendingLesson.allocated = true;
                }

                fixedBySwap++;
                remaining--;
                swapApplied = true;
                break;
              }

              if (!swapApplied) {
                allowConsecutiveInSameClass = true;
              }
            }

              if (swapApplied) {
                break;
              }
            }

            if (!swapApplied) {
              break;
            }
          }
        }

        return fixedBySwap;
      };

      const getTotalMissingLessons = (): number => {
        return Array.from(expectedAllocation.entries()).reduce((sum, [allocationKey, expected]) => {
          const allocated = actualAllocation.get(allocationKey) || 0;
          return sum + Math.max(0, expected - allocated);
        }, 0);
      };

      const maxRepairCycles = 6;
      let previousMissingLessons = getTotalMissingLessons();

      for (let cycle = 1; cycle <= maxRepairCycles; cycle++) {
        const filledLessonsByDeficit = fillPendingDeficitsInEmptySlots();
        const repairedLessons = rebalanceDeficits();
        const fixedBySwap = resolveDeficitsByClassSlotSwap();

        if (filledLessonsByDeficit > 0) {
          console.log(
            `  🧩 Ciclo ${cycle}: preenchimento de déficits adicionou ${filledLessonsByDeficit} aula(s) em slots vazios.`
          );
        }

        if (repairedLessons > 0) {
          console.log(
            `  🔧 Ciclo ${cycle}: rebalanceamento realocou ${repairedLessons} aula(s) para reduzir déficits.`
          );
        }

        if (fixedBySwap > 0) {
          console.log(
            `  🔁 Ciclo ${cycle}: troca local corrigiu ${fixedBySwap} déficit(s) com swap de slot.`
          );
        }

        const cycleChanges = filledLessonsByDeficit + repairedLessons + fixedBySwap;
        const currentMissingLessons = getTotalMissingLessons();

        if (cycleChanges === 0 || currentMissingLessons >= previousMissingLessons) {
          break;
        }

        previousMissingLessons = currentMissingLessons;
      }

      // Regra 8: compactar aulas para o início do dia, deixando slots vazios no fim
      // (libera alunos mais cedo quando há lacunas por ausência de professor)
      {
        for (const classId of Object.keys(allTimetables)) {
          for (const day of weekDays) {
            const classTimetable = allTimetables[classId] || [];
            const daySlots = classTimetable
              .filter(s => s.day === day)
              .sort((a, b) => a.period - b.period);

            const allPeriodsInDay = sortedPeriods.map(p => p.period).sort((a, b) => a - b);

            if (daySlots.length === 0 || daySlots.length >= allPeriodsInDay.length) continue;

            for (let i = 0; i < daySlots.length; i++) {
              const targetPeriod = allPeriodsInDay[i];
              const slot = daySlots[i];

              if (slot.period === targetPeriod) continue;
              if (slot.period < targetPeriod) continue;

              // Período alvo já ocupado pela mesma turma (outro slot já movido)
              if (classSchedule[classId][day].has(targetPeriod)) continue;

              // Professor ocupado em outra turma no período alvo
              if (globalTeacherSchedule[day]?.[targetPeriod]?.has(slot.teacherId)) continue;

              // Respeitar disponibilidade do professor no período alvo
              const teacherForCompact = activeTeacherById.get(slot.teacherId);
              if (!teacherForCompact) continue;
              if (!isTeacherAvailableAtTime(teacherForCompact, day, targetPeriod)) continue;

              // Mover slot para o período mais cedo disponível
              const oldPeriod = slot.period;
              globalTeacherSchedule[day][oldPeriod].delete(slot.teacherId);
              classSchedule[classId][day].delete(oldPeriod);

              slot.period = targetPeriod;

              globalTeacherSchedule[day][targetPeriod].add(slot.teacherId);
              classSchedule[classId][day].add(targetPeriod);
            }
          }
        }
      }

      if (availabilityOverridesUsed > 0) {
        newConflicts.push(
          `ℹ️ ${availabilityOverridesUsed} aula(s) foram alocadas fora da disponibilidade para cumprir a carga horária total.`
        );
      }

      if (isPartialDayGeneration) {
        console.log('ℹ️ Geração por dia ativo: validações de déficit semanal foram ignoradas neste processamento.');
      } else {
        for (const currentClass of classesToGenerate) {
          const classPending = lessonDemands.filter(
            (lesson) => !lesson.allocated && lesson.classId === currentClass.id
          ).length;

          if (classPending > 0) {
            newConflicts.push(
              `⚠️ ${currentClass.grade?.name} ${currentClass.name}: ${classPending} aula(s) não puderam ser alocadas por falta de professores disponíveis`
            );
          }

          const classTotal = lessonDemands.filter((lesson) => lesson.classId === currentClass.id).length;
          console.log(`  ✅ Total alocado: ${(allTimetables[currentClass.id] || []).length}/${classTotal} aulas`);
        }

        for (const [allocationKey, expected] of expectedAllocation.entries()) {
          const allocated = actualAllocation.get(allocationKey) || 0;
          if (allocated >= expected) continue;

          const [classId, subjectId, teacherId] = allocationKey.split('|');
          const classLabel = classLabelById.get(classId) || classId;
          const subjectName = subjectNameById.get(subjectId) || subjectId;
          const teacherName = teacherNameById.get(teacherId) || teacherId;
          const missing = expected - allocated;

          const classTimetable = allTimetables[classId] || [];
          const occupiedSlotKeys = new Set(
            classTimetable.map((slot) => `${slot.day}|${slot.period}`)
          );

          const classEmptySlots = weekDays.flatMap((day) =>
            sortedPeriods
              .map((periodInfo) => periodInfo.period)
              .filter((period) => !occupiedSlotKeys.has(`${day}|${period}`))
              .map((period) => ({ day, period }))
          );

          const deficitTeacher = activeTeacherById.get(teacherId);
          let probableCause = 'restrições combinadas de disponibilidade e conflitos com outras turmas';

          if (!deficitTeacher) {
            probableCause = 'professor não está ativo ou não foi encontrado na lista de docentes ativos';
          } else if (classEmptySlots.length === 0) {
            probableCause = 'turma sem slots vazios; depende de trocas entre aulas já ocupadas';
          } else {
            const compatibleEmptySlots = classEmptySlots.filter((slot) =>
              isTeacherAvailableAtTime(deficitTeacher, slot.day, slot.period)
            );

            const compatibleButBusy = compatibleEmptySlots.filter(
              (slot) => globalTeacherSchedule[slot.day][slot.period].has(teacherId)
            ).length;

            const compatibleAndFree = Math.max(0, compatibleEmptySlots.length - compatibleButBusy);

            if (compatibleEmptySlots.length === 0) {
              probableCause = 'há slots vazios, mas nenhum compatível com a disponibilidade do professor';
            } else if (compatibleAndFree === 0) {
              probableCause = 'professor só tem janelas compatíveis em horários já ocupados por ele em outras turmas';
            } else {
              probableCause =
                `restaram bloqueios de troca (vazios=${classEmptySlots.length}, compatíveis=${compatibleEmptySlots.length}, livres=${compatibleAndFree})`;
            }
          }

          newConflicts.push(
            `⚠️ ${classLabel}: ${teacherName} (${subjectName}) com déficit de ${missing} aula(s) (${allocated}/${expected}) • causa provável: ${probableCause}`
          );
        }
      }

      setGeneratedTimetables(allTimetables);
      setConflicts(newConflicts);

      if (newConflicts.length === 0) {
        const dayScopeLabel = selectedDayFilter === 'all' ? 'todos os dias' : selectedDayFilter;
        toast.success(
          `✅ Horários gerados para ${classesToGenerate.length} turma(s) (${dayScopeLabel}) sem conflitos!`,
          { duration: 4000 }
        );
      } else {
        toast(`⚠️ ${newConflicts.length} aviso(s) encontrado(s)`, { icon: '⚠️', duration: 5000 });
      }
      
      console.log('🎉 GERAÇÃO CONCLUÍDA');
      
    } catch (error: any) {
      toast.error('Erro ao gerar horários: ' + error.message);
      console.error('❌ Erro detalhado:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper para obter dados de um slot específico de uma turma
  const getSlotData = (classId: string, day: string, period: number) => {
    const classTimetable = generatedTimetables[classId] || [];
    return classTimetable.find(
      (slot) => slot.day === day && slot.period === period
    );
  };

  // Verifica se o professor de um slot está fora da disponibilidade naquele horário
  const isAvailabilityViolated = (slot: TimetableSlot | undefined, day: string, period: number): boolean => {
    if (!slot?.teacherId) return false;
    const teacher = teachers.find((t: Teacher) => t.id === slot.teacherId);
    if (!teacher) return false;
    return !isTeacherAvailableAtTime(teacher, day, period);
  };

  // Função para imprimir
  const handlePrint = () => {
    window.print();
  };

  // Função para download em PDF
  const handleDownload = async () => {
    try {
      toast.loading('Gerando PDF...');
      
      // Aguardar um momento para garantir que o toast aparece
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const printContainers = document.querySelectorAll('.print-container');
      if (printContainers.length === 0) {
        toast.dismiss();
        toast.error('Nenhum horário para gerar PDF');
        return;
      }

      // Importar jsPDF dinamicamente
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let isFirstPage = true;

      for (const container of Array.from(printContainers)) {
        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;

        const canvas = await html2canvas(container as HTMLElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 190; // largura em mm (A4 = 210mm, com margem de 10mm)
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      }

      pdf.save(`horarios-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.dismiss();
      toast.success('PDF gerado com sucesso!');
    } catch (error: any) {
      toast.dismiss();
      toast.error('Erro ao gerar PDF: ' + error.message);
      console.error('Erro ao gerar PDF:', error);
    }
  };

  // Salvar horários no banco de dados
  const handleSave = async () => {
    console.log('💾 Tentando salvar horários...');
    console.log('  - selectedSchedule:', selectedSchedule);
    console.log('  - generatedTimetables:', Object.keys(generatedTimetables).length, 'turmas');
    console.log('  - saveTitle:', saveTitle);

    if (!selectedSchedule || Object.keys(generatedTimetables).length === 0) {
      toast.error('Nenhum horário para salvar');
      console.log('❌ Validação falhou: sem horário ou sem turmas');
      return;
    }

    if (!saveTitle.trim()) {
      toast.error('Digite um título para o horário');
      console.log('❌ Validação falhou: sem título');
      return;
    }

    const hasCriticalConflicts = conflicts.some((conflict) => {
      const normalized = conflict.toLowerCase();
      return (
        normalized.includes('déficit') ||
        normalized.includes('deficit') ||
        normalized.includes('não puderam ser alocadas') ||
        normalized.includes('nao puderam ser alocadas') ||
        normalized.includes('fora da disponibilidade')
      );
    });

    setIsSaving(true);
    try {
      const payload = {
        scheduleId: selectedSchedule,
        timetables: generatedTimetables,
        title: saveTitle.trim()
      };

      const saveStrictly = async () => {
        console.log('📤 Enviando para API (strictCompliance=true)...');
        return api.post('/generated-timetables', payload);
      };

      const saveWithOverride = async () => {
        console.log('📤 Enviando para API (strictCompliance=false)...');
        return api.post('/generated-timetables?strictCompliance=false', payload);
      };

      let response;

      if (hasCriticalConflicts) {
        const confirmed = window.confirm(
          'A grade possui conflitos críticos (déficit/indisponibilidade). Deseja salvar mesmo assim com aviso?'
        );

        if (!confirmed) {
          toast('Salvamento cancelado.');
          return;
        }

        response = await saveWithOverride();
      } else {
        try {
          response = await saveStrictly();
        } catch (strictError: any) {
          const message = String(strictError?.response?.data?.message || '').toLowerCase();
          const blockedByCompliance =
            strictError?.response?.status === 400 &&
            (message.includes('conflitos críticos') || message.includes('conflitos criticos'));

          if (!blockedByCompliance) {
            throw strictError;
          }

          const confirmed = window.confirm(
            'O backend bloqueou o salvamento por conflitos críticos. Deseja salvar mesmo assim com aviso?'
          );

          if (!confirmed) {
            toast('Salvamento cancelado.');
            return;
          }

          response = await saveWithOverride();
        }
      }
      
      console.log('✅ Resposta da API:', response.data);
      const savedWithCriticalWarnings = response?.data?.complianceReport?.status === 'critical';
      toast.success(
        savedWithCriticalWarnings
          ? '✅ Horários salvos com alertas críticos (modo não estrito).'
          : '✅ Horários salvos com sucesso!',
        {
          duration: 4000,
          position: 'top-center',
        }
      );
      setShowSaveDialog(false);
      setSaveTitle('');
      loadSavedTimetablesList();
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
      console.error('  - Erro completo:', error.response?.data || error.message);
      toast.error('Erro ao salvar horários: ' + (error.response?.data?.message || error.message), {
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Carregar horários salvos por título
  const handleLoadByTitle = async (title: string) => {
    try {
      console.log('📂 Carregando horário:', title);
      
      // Usar a rota /metadata para buscar rapidamente o scheduleId
      const metadataResponse = await api.get('/generated-timetables/metadata');
      console.log('📋 Metadados recebidos:', metadataResponse.data);
      
      const allTimetables = metadataResponse.data?.data || metadataResponse.data;
      console.log('📋 Total de horários nos metadados:', allTimetables.length);
      
      // Encontrar um horário com este título
      const timetableWithTitle = allTimetables.find((tt: any) => tt.title === title);
      console.log('🔍 Horário encontrado:', timetableWithTitle);
      
      if (!timetableWithTitle) {
        toast.error('Horário não encontrado');
        return;
      }

      const scheduleId = timetableWithTitle.scheduleId;
      console.log('✅ scheduleId encontrado:', scheduleId);
      
      // Definir automaticamente o scheduleId
      setSelectedSchedule(scheduleId);
      console.log('✅ setSelectedSchedule chamado com:', scheduleId);
      
      // Agora buscar os horários completos
      console.log('📥 Buscando horários completos de:', `/generated-timetables/${scheduleId}/by-title/${encodeURIComponent(title)}`);
      const response = await api.get(`/generated-timetables/${scheduleId}/by-title/${encodeURIComponent(title)}`);
      
      console.log('📥 Response status:', response.status);
      console.log('📥 response.data:', response.data);
      
      const loadedTimetables = response.data.data || response.data;
      
      console.log('📦 loadedTimetables recebidos:', loadedTimetables);
      console.log('📦 Número de chaves:', Object.keys(loadedTimetables).length);
      
      if (Object.keys(loadedTimetables).length === 0) {
        toast('Nenhum horário encontrado', { icon: 'ℹ️' });
        return;
      }

      setGeneratedTimetables(loadedTimetables);
      console.log('✅ setGeneratedTimetables chamado com', Object.keys(loadedTimetables).length, 'turmas');
      toast.success('✅ Horários carregados!');
    } catch (error: any) {
      toast.error('Erro ao carregar horários');
      console.error('❌ Erro completo:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
    }
  };

  // Deletar conjunto de horários
  const handleDelete = async (title: string) => {
    if (!confirm(`Deseja realmente excluir "${title}"?`)) {
      return;
    }

    try {
      console.log('🗑️ Excluindo:', title);
      const response = await api.delete(`/generated-timetables/by-title/${encodeURIComponent(title)}`);
      console.log('✅ Resposta:', response.data);
      toast.success(`✅ ${response.data.deletedCount} horário(s) excluído(s)!`);
      loadSavedTimetablesList();
    } catch (error: any) {
      console.error('❌ Erro ao excluir:', error);
      toast.error('Erro ao excluir horários');
    }
  };

  // Carregar horários salvos (mantido para compatibilidade)
  const handleLoad = async () => {
    if (!selectedSchedule) {
      toast.error('Selecione um horário primeiro');
      return;
    }

    try {
      const response = await api.get(`/generated-timetables/${selectedSchedule}`);
      const loadedTimetables = response.data.data || response.data;
      
      if (Object.keys(loadedTimetables).length === 0) {
        toast('Nenhum horário salvo encontrado', { icon: 'ℹ️' });
        return;
      }

      setGeneratedTimetables(loadedTimetables);
      toast.success('✅ Horários carregados com sucesso!');
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast('Nenhum horário salvo para este tipo', { icon: 'ℹ️' });
      } else {
        toast.error('Erro ao carregar horários');
        console.error('Erro ao carregar:', error);
      }
    }
  };

  // Abrir modal de edição
  const openEditModal = (classId: string, day: string, period: number) => {
    const slot = getSlotData(classId, day, period);
    setEditModalData({
      classId,
      day,
      period,
      currentSubjectId: slot?.subjectId || null,
      currentTeacherId: slot?.teacherId || null
    });
    setSelectedSubjectForEdit(slot?.subjectId || '');
    setSelectedTeacherForEdit(slot?.teacherId || '');
  };

  // Função para compartilhar
  const handleShare = () => {
    toast.success('Função de compartilhamento em desenvolvimento');
  };

  // Fechar modal de edição
  const closeEditModal = () => {
    setEditModalData(null);
    setSelectedSubjectForEdit('');
    setSelectedTeacherForEdit('');
  };

  // Aplicar edição da célula
  const applyEdit = () => {
    if (!editModalData) return;

    const { classId, day, period } = editModalData;

    if (!selectedSubjectForEdit || !selectedTeacherForEdit) {
      toast.error('Selecione a disciplina e o professor');
      return;
    }

    setGeneratedTimetables(prev => {
      const newClassTimetable = [...(prev[classId] || [])];
      const existingIndex = newClassTimetable.findIndex(
        slot => slot.day === day && slot.period === period
      );

      if (existingIndex >= 0) {
        newClassTimetable[existingIndex] = {
          ...newClassTimetable[existingIndex],
          subjectId: selectedSubjectForEdit,
          teacherId: selectedTeacherForEdit
        };
      } else {
        newClassTimetable.push({
          classId,
          day,
          period,
          subjectId: selectedSubjectForEdit,
          teacherId: selectedTeacherForEdit
        });
      }

      return {
        ...prev,
        [classId]: newClassTimetable
      };
    });

    closeEditModal();
    toast.success('Horário atualizado!');
  };

  // Remover aula da célula
  const removeSlot = () => {
    if (!editModalData) return;

    const { classId, day, period } = editModalData;

    setGeneratedTimetables(prev => {
      const newClassTimetable = (prev[classId] || []).filter(
        slot => !(slot.day === day && slot.period === period)
      );

      return {
        ...prev,
        [classId]: newClassTimetable
      };
    });

    closeEditModal();
    toast.success('Aula removida!');
  };

  // Função para detectar conflitos de horário
  const detectConflicts = (classId: string, day: string, period: number, slot: TimetableSlot | undefined): boolean => {
    if (!slot) return false;

    // Verificar se o mesmo professor está em outra turma no mesmo horário
    const allSlots = Object.values(generatedTimetables).flat();
    const conflictingSlots = allSlots.filter(
      s => s.day === day && 
           s.period === period && 
           s.teacherId === slot.teacherId && 
           s.classId !== classId
    );

    if (conflictingSlots.length > 0) {
      return true;
    }

    // Verificar se a mesma turma tem duas aulas no mesmo horário (não deveria acontecer)
    const classSlotsAtSameTime = generatedTimetables[classId]?.filter(
      s => s.day === day && s.period === period
    ) || [];

    if (classSlotsAtSameTime.length > 1) {
      return true;
    }

    return false;
  };

  const selectedClassesCount = selectedClassFilter === 'all' ? classes.length : 1;
  const selectedDayLabel = selectedDayFilter === 'all' ? 'Todos os dias' : selectedDayFilter;
  const visibleClassIdSet = useMemo(
    () => new Set(classesForDisplay.map((currentClass: any) => currentClass.id)),
    [classesForDisplay]
  );
  const filteredScheduledSlotsCount = useMemo(() => {
    const allowedDays = new Set(weekDays);

    return Object.entries(generatedTimetables).reduce((total, [classId, slots]) => {
      if (!visibleClassIdSet.has(classId)) {
        return total;
      }

      const visibleSlots = (slots || []).filter((slot) => allowedDays.has(slot.day));
      return total + visibleSlots.length;
    }, 0);
  }, [generatedTimetables, visibleClassIdSet, weekDays]);

  const dayLoadCounterPanels = useMemo(() => {
    const toPositiveInteger = (value: unknown): number => {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        return 0;
      }
      return Math.max(0, Math.floor(numericValue));
    };

    const normalizeId = (value: unknown): string => {
      if (value === null || value === undefined) {
        return '';
      }
      return String(value);
    };

    const incrementCounter = (target: Map<string, number>, key: string, amount = 1) => {
      if (!key) {
        return;
      }
      target.set(key, (target.get(key) || 0) + amount);
    };

    const incrementNestedCounter = (
      target: Map<string, Map<string, number>>,
      primaryKey: string,
      secondaryKey: string,
      amount = 1
    ) => {
      if (!primaryKey || !secondaryKey) {
        return;
      }

      const nestedCounter = target.get(primaryKey) || new Map<string, number>();
      nestedCounter.set(secondaryKey, (nestedCounter.get(secondaryKey) || 0) + amount);
      target.set(primaryKey, nestedCounter);
    };

    const getClassConfiguredHours = (currentClass: any, subjectId: string): number => {
      const weeklyHoursRaw = currentClass?.subjectWeeklyHours;
      if (!weeklyHoursRaw || !subjectId) {
        return 0;
      }

      if (weeklyHoursRaw instanceof Map) {
        return toPositiveInteger(weeklyHoursRaw.get(subjectId));
      }

      if (typeof weeklyHoursRaw.get === 'function') {
        return toPositiveInteger(weeklyHoursRaw.get(subjectId));
      }

      return toPositiveInteger(weeklyHoursRaw[subjectId]);
    };

    const referenceDays = new Set(allWeekDays);
    const teacherById = new Map(
      (teachers as Teacher[])
        .map((teacher) => [normalizeId((teacher as any).id || (teacher as any)._id), teacher] as const)
        .filter(([id]) => Boolean(id))
    );
    const subjectById = new Map(
      (subjects as Subject[])
        .map((subject) => [normalizeId((subject as any).id || (subject as any)._id), subject] as const)
        .filter(([id]) => Boolean(id))
    );

    const globalTeacherWeeklyGenerated = new Map<string, number>();
    const globalTeacherDailyGenerated = new Map<string, Map<string, number>>();

    Object.values(generatedTimetables).forEach((classSlots) => {
      (classSlots || []).forEach((slot) => {
        if (!referenceDays.has(slot.day)) {
          return;
        }

        const teacherId = normalizeId(slot.teacherId);
        if (!teacherId) {
          return;
        }

        incrementCounter(globalTeacherWeeklyGenerated, teacherId);
        incrementNestedCounter(globalTeacherDailyGenerated, teacherId, slot.day);
      });
    });

    type ClassLoadProfile = {
      subjectNames: Map<string, string>;
      teacherNames: Map<string, string>;
      subjectWeeklyTarget: Map<string, number>;
      teacherExpectedWeeklyInClass: Map<string, number>;
      subjectWeeklyGenerated: Map<string, number>;
      subjectDailyGenerated: Map<string, Map<string, number>>;
      teacherWeeklyGeneratedInClass: Map<string, number>;
      teacherDailyGeneratedInClass: Map<string, Map<string, number>>;
      generatedInDay: Map<string, number>;
    };

    const classProfiles = new Map<string, ClassLoadProfile>();
    const globalTeacherExpectedWeekly = new Map<string, number>();

    classesForDisplay.forEach((currentClass: any) => {
      const classId = normalizeId(currentClass?.id || currentClass?._id);
      if (!classId) {
        return;
      }

      const classSlots = generatedTimetables[classId] || [];
      const subjectNames = new Map<string, string>();
      const teacherNames = new Map<string, string>();
      const subjectIds = new Set<string>();

      const classSubjects = Array.isArray(currentClass?.subjects) ? currentClass.subjects : [];
      classSubjects.forEach((classSubject: any) => {
        const subjectId = normalizeId(classSubject?.id || classSubject?._id || classSubject?.subjectId);
        if (!subjectId) {
          return;
        }

        subjectIds.add(subjectId);
        const fallbackSubject = subjectById.get(subjectId);
        const subjectName = classSubject?.name || fallbackSubject?.name || `Disciplina ${subjectId}`;
        subjectNames.set(subjectId, subjectName);
      });

      const classSubjectIds = Array.isArray(currentClass?.subjectIds) ? currentClass.subjectIds : [];
      classSubjectIds.forEach((rawSubjectId: unknown) => {
        const subjectId = normalizeId(rawSubjectId);
        if (!subjectId) {
          return;
        }

        subjectIds.add(subjectId);
        if (!subjectNames.has(subjectId)) {
          const fallbackSubject = subjectById.get(subjectId);
          subjectNames.set(subjectId, fallbackSubject?.name || `Disciplina ${subjectId}`);
        }
      });

      classSlots.forEach((slot) => {
        if (!referenceDays.has(slot.day)) {
          return;
        }

        const subjectId = normalizeId(slot.subjectId);
        if (subjectId) {
          subjectIds.add(subjectId);
          if (!subjectNames.has(subjectId)) {
            const fallbackSubject = subjectById.get(subjectId);
            subjectNames.set(subjectId, fallbackSubject?.name || `Disciplina ${subjectId}`);
          }
        }

        const teacherId = normalizeId(slot.teacherId);
        if (teacherId && !teacherNames.has(teacherId)) {
          const fallbackTeacher = teacherById.get(teacherId);
          teacherNames.set(teacherId, fallbackTeacher?.name || `Professor ${teacherId}`);
        }
      });

      const classAssignments = (teacherSubjects as TeacherSubject[]).filter((association) => {
        const associationSubjectId = normalizeId(association.subjectId);
        if (!associationSubjectId) {
          return false;
        }

        const classMatch = association.classId === classId || !association.classId;
        if (!classMatch) {
          return false;
        }

        if (subjectIds.size === 0) {
          return true;
        }

        return subjectIds.has(associationSubjectId);
      });

      const subjectWeeklyTarget = new Map<string, number>();
      const teacherExpectedWeeklyInClass = new Map<string, number>();

      subjectIds.forEach((subjectId) => {
        const assignments = classAssignments.filter(
          (association) => normalizeId(association.subjectId) === subjectId
        );

        const explicitAssignments = assignments.filter(
          (association) =>
            typeof association.weeklyHours === 'number' && Number(association.weeklyHours) > 0
        );

        const explicitRequested = explicitAssignments.reduce(
          (sum, association) => sum + toPositiveInteger(association.weeklyHours),
          0
        );

        const classConfiguredHours = getClassConfiguredHours(currentClass, subjectId);
        const subjectDefaultHours = toPositiveInteger(subjectById.get(subjectId)?.weeklyHours);
        const fallbackTarget = classConfiguredHours || subjectDefaultHours || 2;
        const effectiveTarget = explicitRequested > 0 ? explicitRequested : fallbackTarget;

        if (effectiveTarget > 0) {
          subjectWeeklyTarget.set(subjectId, effectiveTarget);
        }

        if (assignments.length === 0) {
          return;
        }

        const nonExplicitAssignments = assignments.filter(
          (association) =>
            !(typeof association.weeklyHours === 'number' && Number(association.weeklyHours) > 0)
        );

        const remainingForNonExplicit = Math.max(0, effectiveTarget - explicitRequested);
        const baseHours =
          nonExplicitAssignments.length > 0
            ? Math.floor(remainingForNonExplicit / nonExplicitAssignments.length)
            : 0;
        const extraHours =
          nonExplicitAssignments.length > 0
            ? remainingForNonExplicit % nonExplicitAssignments.length
            : 0;

        const distributedHours = new Map<string, number>();
        nonExplicitAssignments.forEach((association, index) => {
          const associationTeacherId = normalizeId(association.teacherId);
          if (!associationTeacherId) {
            return;
          }

          distributedHours.set(associationTeacherId, baseHours + (index < extraHours ? 1 : 0));
        });

        assignments.forEach((association) => {
          const associationTeacherId = normalizeId(association.teacherId);
          if (!associationTeacherId) {
            return;
          }

          if (!teacherNames.has(associationTeacherId)) {
            const fallbackTeacher = teacherById.get(associationTeacherId);
            teacherNames.set(
              associationTeacherId,
              fallbackTeacher?.name || `Professor ${associationTeacherId}`
            );
          }

          const isExplicit =
            typeof association.weeklyHours === 'number' && Number(association.weeklyHours) > 0;
          const allocatedWeeklyHours = isExplicit
            ? toPositiveInteger(association.weeklyHours)
            : toPositiveInteger(distributedHours.get(associationTeacherId));

          if (allocatedWeeklyHours <= 0) {
            return;
          }

          incrementCounter(teacherExpectedWeeklyInClass, associationTeacherId, allocatedWeeklyHours);
          incrementCounter(globalTeacherExpectedWeekly, associationTeacherId, allocatedWeeklyHours);
        });
      });

      const subjectWeeklyGenerated = new Map<string, number>();
      const subjectDailyGenerated = new Map<string, Map<string, number>>();
      const teacherWeeklyGeneratedInClass = new Map<string, number>();
      const teacherDailyGeneratedInClass = new Map<string, Map<string, number>>();
      const generatedInDay = new Map<string, number>();

      classSlots.forEach((slot) => {
        if (!referenceDays.has(slot.day)) {
          return;
        }

        incrementCounter(generatedInDay, slot.day);

        const subjectId = normalizeId(slot.subjectId);
        if (subjectId) {
          incrementCounter(subjectWeeklyGenerated, subjectId);
          incrementNestedCounter(subjectDailyGenerated, slot.day, subjectId);
        }

        const teacherId = normalizeId(slot.teacherId);
        if (teacherId) {
          incrementCounter(teacherWeeklyGeneratedInClass, teacherId);
          incrementNestedCounter(teacherDailyGeneratedInClass, slot.day, teacherId);
        }
      });

      classProfiles.set(classId, {
        subjectNames,
        teacherNames,
        subjectWeeklyTarget,
        teacherExpectedWeeklyInClass,
        subjectWeeklyGenerated,
        subjectDailyGenerated,
        teacherWeeklyGeneratedInClass,
        teacherDailyGeneratedInClass,
        generatedInDay
      });
    });

    const emptyPanel: DayLoadCounterPanel = {
      subjectCounters: [],
      teacherCounters: [],
      totalGeneratedInDay: 0,
      dayCapacity: currentSchedule?.periods?.length || 0,
      dayMissingCapacity: currentSchedule?.periods?.length || 0,
      subjectWeeklyTargetTotal: 0,
      subjectWeeklyGeneratedTotal: 0,
      subjectWeeklyMissingTotal: 0,
      teacherWeeklyTargetTotal: 0,
      teacherWeeklyGeneratedTotal: 0,
      teacherWeeklyMissingTotal: 0
    };

    const dayPanels: Record<string, DayLoadCounterPanel> = {};
    const dayCapacity = currentSchedule?.periods?.length || 0;

    classesForDisplay.forEach((currentClass: any) => {
      const classId = normalizeId(currentClass?.id || currentClass?._id);
      if (!classId) {
        return;
      }

      const profile = classProfiles.get(classId);
      if (!profile) {
        weekDays.forEach((day) => {
          dayPanels[`${classId}|${day}`] = emptyPanel;
        });
        return;
      }

      weekDays.forEach((day) => {
        const subjectsInDay = new Set<string>([
          ...profile.subjectWeeklyTarget.keys(),
          ...profile.subjectWeeklyGenerated.keys(),
          ...(profile.subjectDailyGenerated.get(day)?.keys() || [])
        ]);

        const subjectCounters = Array.from(subjectsInDay).map((subjectId) => {
          const weeklyTargetRaw = profile.subjectWeeklyTarget.get(subjectId) || 0;
          const weeklyGenerated = profile.subjectWeeklyGenerated.get(subjectId) || 0;
          const dailyGenerated = profile.subjectDailyGenerated.get(day)?.get(subjectId) || 0;
          const weeklyTarget = weeklyTargetRaw > 0 ? weeklyTargetRaw : weeklyGenerated;
          const weeklyMissing = Math.max(0, weeklyTarget - weeklyGenerated);

          return {
            subjectId,
            subjectName: profile.subjectNames.get(subjectId) || `Disciplina ${subjectId}`,
            weeklyTarget,
            weeklyGenerated,
            dailyGenerated,
            annualTarget: weeklyTarget * ACADEMIC_WEEKS_PER_YEAR,
            annualGenerated: weeklyGenerated * ACADEMIC_WEEKS_PER_YEAR,
            weeklyMissing,
            annualMissing: weeklyMissing * ACADEMIC_WEEKS_PER_YEAR
          };
        });

        subjectCounters.sort((left, right) => {
          if (right.weeklyMissing !== left.weeklyMissing) {
            return right.weeklyMissing - left.weeklyMissing;
          }
          if (right.weeklyTarget !== left.weeklyTarget) {
            return right.weeklyTarget - left.weeklyTarget;
          }
          return left.subjectName.localeCompare(right.subjectName);
        });

        const teachersInDay = new Set<string>([
          ...profile.teacherExpectedWeeklyInClass.keys(),
          ...profile.teacherWeeklyGeneratedInClass.keys(),
          ...(profile.teacherDailyGeneratedInClass.get(day)?.keys() || [])
        ]);

        const teacherCounters = Array.from(teachersInDay).map((teacherId) => {
          const configuredWeeklyLoad = toPositiveInteger(teacherById.get(teacherId)?.weeklyWorkload);
          const expectedWeeklyInClass = profile.teacherExpectedWeeklyInClass.get(teacherId) || 0;
          const expectedWeeklyGlobal = globalTeacherExpectedWeekly.get(teacherId) || 0;
          const weeklyGenerated = globalTeacherWeeklyGenerated.get(teacherId) || 0;
          const dailyGenerated = globalTeacherDailyGenerated.get(teacherId)?.get(day) || 0;
          const classDailyGenerated = profile.teacherDailyGeneratedInClass.get(day)?.get(teacherId) || 0;
          const weeklyTargetRaw = Math.max(
            configuredWeeklyLoad,
            expectedWeeklyGlobal,
            expectedWeeklyInClass
          );
          const weeklyTarget = weeklyTargetRaw > 0 ? weeklyTargetRaw : weeklyGenerated;
          const weeklyMissing = Math.max(0, weeklyTarget - weeklyGenerated);

          return {
            teacherId,
            teacherName:
              profile.teacherNames.get(teacherId) ||
              teacherById.get(teacherId)?.name ||
              `Professor ${teacherId}`,
            weeklyTarget,
            weeklyGenerated,
            dailyGenerated,
            classDailyGenerated,
            annualTarget: weeklyTarget * ACADEMIC_WEEKS_PER_YEAR,
            annualGenerated: weeklyGenerated * ACADEMIC_WEEKS_PER_YEAR,
            weeklyMissing,
            annualMissing: weeklyMissing * ACADEMIC_WEEKS_PER_YEAR
          };
        });

        teacherCounters.sort((left, right) => {
          if (right.weeklyMissing !== left.weeklyMissing) {
            return right.weeklyMissing - left.weeklyMissing;
          }
          if (right.weeklyTarget !== left.weeklyTarget) {
            return right.weeklyTarget - left.weeklyTarget;
          }
          return left.teacherName.localeCompare(right.teacherName);
        });

        const subjectWeeklyTargetTotal = subjectCounters.reduce(
          (sum, counter) => sum + counter.weeklyTarget,
          0
        );
        const subjectWeeklyGeneratedTotal = subjectCounters.reduce(
          (sum, counter) => sum + counter.weeklyGenerated,
          0
        );
        const subjectWeeklyMissingTotal = subjectCounters.reduce(
          (sum, counter) => sum + counter.weeklyMissing,
          0
        );

        const teacherWeeklyTargetTotal = teacherCounters.reduce(
          (sum, counter) => sum + counter.weeklyTarget,
          0
        );
        const teacherWeeklyGeneratedTotal = teacherCounters.reduce(
          (sum, counter) => sum + counter.weeklyGenerated,
          0
        );
        const teacherWeeklyMissingTotal = teacherCounters.reduce(
          (sum, counter) => sum + counter.weeklyMissing,
          0
        );

        const totalGeneratedInDay = profile.generatedInDay.get(day) || 0;

        dayPanels[`${classId}|${day}`] = {
          subjectCounters,
          teacherCounters,
          totalGeneratedInDay,
          dayCapacity,
          dayMissingCapacity: Math.max(0, dayCapacity - totalGeneratedInDay),
          subjectWeeklyTargetTotal,
          subjectWeeklyGeneratedTotal,
          subjectWeeklyMissingTotal,
          teacherWeeklyTargetTotal,
          teacherWeeklyGeneratedTotal,
          teacherWeeklyMissingTotal
        };
      });
    });

    return dayPanels;
  }, [
    ACADEMIC_WEEKS_PER_YEAR,
    allWeekDays,
    classesForDisplay,
    currentSchedule,
    generatedTimetables,
    subjects,
    teacherSubjects,
    teachers,
    weekDays
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl shadow-lg p-8 no-print">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <Calendar size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Gerador de Horário de Aulas</h1>
            <p className="text-primary-100 mt-2">
              Crie horários otimizados automaticamente, sem conflitos
            </p>
          </div>
        </div>
      </div>

      {/* Configuração */}
      <div className="card no-print">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="text-primary-600" />
          Configuração do Horário
        </h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Horário *
          </label>
          <select
            value={selectedSchedule}
            onChange={(e) => setSelectedSchedule(e.target.value)}
            className="input max-w-md"
            required
          >
            <option value="">Selecione o tipo de horário</option>
            {schedules.length === 0 ? (
              <option disabled>Nenhum horário configurado</option>
            ) : (
              schedules.map((schedule: Schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.name} ({schedule.periods?.length || 0} períodos)
                </option>
              ))
            )}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Turmas *
          </label>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="input max-w-md"
          >
            <option value="all">✨ Todas as Turmas ({classes.length})</option>
            <optgroup label="Turmas Específicas">
              {classes.map((classItem: any) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.grade?.name || 'Sem série'} - {classItem.name}
                </option>
              ))}
            </optgroup>
          </select>
          <p className="text-sm text-gray-500 mt-2">
            {selectedClassFilter === 'all' 
              ? `ℹ️ Serão gerados horários para todas as ${classes.length} turmas cadastradas`
              : `ℹ️ Será gerado horário apenas para a turma selecionada`
            }
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Horário por Dia *
          </label>
          <select
            value={selectedDayFilter}
            onChange={(e) => setSelectedDayFilter(e.target.value)}
            className="input max-w-md"
          >
            <option value="all">📅 Todos os dias (Segunda a Sexta)</option>
            <optgroup label="Dia Específico">
              {allWeekDays.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </optgroup>
          </select>
          <p className="text-sm text-gray-500 mt-2">
            {selectedDayFilter === 'all'
              ? 'ℹ️ O sistema tentará distribuir aulas em toda a semana'
              : `ℹ️ A geração ficará focada apenas em ${selectedDayFilter}`
            }
          </p>
        </div>

        {generationChecklist && (
          <div className="mb-6 border border-amber-300 bg-amber-50 rounded-lg p-4">
            <h3 className="text-base font-bold text-amber-900 mb-2">Checklist Automático Pré-Geração</h3>
            <p className="text-sm text-amber-800 mb-3">
              Diagnóstico baseado na lotação atual (professor + disciplina + turma) e cargas horárias configuradas.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-sm">
              <div className="bg-white rounded border border-amber-200 p-3">
                <p className="text-amber-700">Turmas analisadas</p>
                <p className="text-xl font-bold text-amber-900">{generationChecklist.summary.classesAnalyzed}</p>
              </div>
              <div className="bg-white rounded border border-green-200 p-3">
                <p className="text-green-700">Turmas prontas</p>
                <p className="text-xl font-bold text-green-800">{generationChecklist.summary.classesReady}</p>
              </div>
              <div className="bg-white rounded border border-red-200 p-3">
                <p className="text-red-700">Turmas com ajustes</p>
                <p className="text-xl font-bold text-red-800">{generationChecklist.summary.classesWithIssues}</p>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {generationChecklist.classes.map((currentClass) => {
                const loadDifference = currentClass.totalSlots - currentClass.totalTargetHours;
                const hasMissingTeachers = currentClass.missingSubjects.length > 0;
                const showLoadBalance = selectedDayFilter === 'all';

                return (
                  <div
                    key={currentClass.classId}
                    className={`rounded border p-3 ${
                      currentClass.isReady ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <p className="font-semibold text-gray-900">{currentClass.classLabel}</p>
                      <p className={`text-xs font-bold ${currentClass.isReady ? 'text-green-700' : 'text-red-700'}`}>
                        {currentClass.isReady ? 'PRONTA PARA GERAR' : 'AJUSTE NECESSÁRIO'}
                      </p>
                    </div>

                    <div className="text-xs text-gray-700 mt-1">
                      Carga total da turma: {currentClass.totalTargetHours} aulas • Slots: {currentClass.totalSlots}
                    </div>

                    {showLoadBalance && loadDifference > 0 && (
                      <div className="text-xs text-amber-700 mt-1">
                        Sobra prevista de {loadDifference} slot(s) por carga insuficiente cadastrada.
                      </div>
                    )}

                    {showLoadBalance && loadDifference < 0 && (
                      <div className="text-xs text-red-700 mt-1">
                        Déficit de {Math.abs(loadDifference)} slot(s): carga da turma maior que a grade disponível.
                      </div>
                    )}

                    {currentClass.hasNoSubjects && (
                      <div className="text-xs text-red-700 mt-1">
                        Turma sem disciplinas associadas.
                      </div>
                    )}

                    {hasMissingTeachers && (
                      <div className="text-xs text-red-700 mt-1">
                        Sem lotação de professor em: {currentClass.missingSubjects.join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 text-xs text-amber-900">
              {selectedDayFilter === 'all'
                ? (
                  <>
                    Resumo: {generationChecklist.summary.totalMissingSubjectAllocations} disciplina(s) sem lotação •{' '}
                    {generationChecklist.summary.classesWithMissingLoad} turma(s) com carga menor que slots •{' '}
                    {generationChecklist.summary.classesWithExcessLoad} turma(s) com carga maior que slots.
                  </>
                )
                : (
                  <>
                    Resumo por dia: {generationChecklist.summary.totalMissingSubjectAllocations} disciplina(s) sem lotação.
                    Comparativos de carga semanal foram ocultados porque o filtro está em {selectedDayFilter}.
                  </>
                )
              }
            </div>
          </div>
        )}

        {/* Campo de Observações */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações e Restrições
          </label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="input min-h-[100px] resize-y"
            placeholder="Digite aqui observações importantes para a geração do horário (ex: Professor X não pode dar aula às quartas-feiras, evitar aulas de Educação Física no último período, etc.)..."
            rows={4}
          />
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-semibold mb-2">
              💡 O sistema aplica automaticamente as seguintes regras:
            </p>
            <ul className="text-xs text-blue-800 space-y-1 ml-4">
              <li>• <strong>🎯 PRIORIDADE MÁXIMA:</strong> Respeita observações e disponibilidades dos professores</li>
              <li>• <strong>📵 Célula laranja:</strong> Professor alocado fora da disponibilidade (carga excede slots disponíveis)</li>
              <li>• <strong>📌 Compactação:</strong> Aulas concentradas nos primeiros períodos (janelas no final)</li>
              <li>• <strong>🚫 Evita aulas seguidas:</strong> Professor não dá duas aulas consecutivas na mesma turma</li>
              <li>• <strong>⚡ Maximiza sequências:</strong> Professor com máximo de aulas seguidas em turmas diferentes</li>
              <li>• <strong>🏖️ Permite folgas:</strong> Professor pode ficar livre um dia inteiro se possível</li>
              <li>• <strong>⛔ Sem conflitos:</strong> Professor nunca em duas turmas ao mesmo tempo</li>
            </ul>
          </div>
        </div>

        {/* Lista de Horários Salvos */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FolderOpen size={20} className="text-primary-600" />
            Horários Salvos
          </h3>
          {savedTimetablesList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedTimetablesList.map((saved: any, index: number) => (
                <div key={index} className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{saved.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(saved.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleLoadByTitle(saved.title)}
                      className="flex-1 btn btn-primary text-sm py-1 px-3 flex items-center justify-center gap-1"
                    >
                      <FolderOpen size={16} />
                      Abrir
                    </button>
                    <button
                      onClick={() => handleDelete(saved.title)}
                      className="btn bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 flex items-center justify-center gap-1"
                    >
                      <Trash2 size={16} />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <FolderOpen size={48} className="mx-auto mb-3 text-gray-400" />
              <p className="text-sm">Nenhum horário salvo ainda</p>
              <p className="text-xs mt-1">Gere e salve horários para visualizá-los aqui</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={generateTimetable}
            disabled={!selectedSchedule || isGenerating}
            className="btn btn-primary flex items-center gap-2"
          >
            <RefreshCw size={20} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating 
              ? 'Gerando...' 
              : `Gerar Horário (${selectedClassesCount} turma(s) • ${selectedDayLabel})`
            }
          </button>

          <button
            onClick={handleLoad}
            disabled={!selectedSchedule}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download size={20} />
            Carregar Salvos
          </button>

          {Object.keys(generatedTimetables).length > 0 && (
            <>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setViewMode('spreadsheet')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'spreadsheet'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📊 Planilha
                </button>
                <button
                  onClick={() => setViewMode('day-by-day')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'day-by-day'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📅 Dia a Dia
                </button>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setPrintFormat('normal')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    printFormat === 'normal'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  title="Períodos na coluna esquerda, dias no topo"
                >
                  🖨️ Padrão
                </button>
                <button
                  onClick={() => setPrintFormat('transposed')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    printFormat === 'transposed'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  title="Períodos no topo, turmas na coluna esquerda"
                >
                  🔄 Transposto
                </button>
              </div>

              <button
                onClick={() => setShowSaveDialog(true)}
                disabled={isSaving}
                className="btn btn-primary flex items-center gap-2"
              >
                <Download size={20} className={isSaving ? 'animate-pulse' : ''} />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>

              <button onClick={handlePrint} className="btn btn-outline flex items-center gap-2">
                <Printer size={20} />
                Imprimir
              </button>
              <button onClick={handleDownload} className="btn btn-outline flex items-center gap-2">
                <Download size={20} />
                Download PDF
              </button>
              <button onClick={handleShare} className="btn btn-outline flex items-center gap-2">
                <Share2 size={20} />
                Compartilhar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Alertas de conflitos */}
      {conflicts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded no-print">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={24} />
            <div>
              <h3 className="font-bold text-red-800">Conflitos Detectados</h3>
              <ul className="mt-2 space-y-1 text-sm text-red-700">
                {conflicts.map((conflict, index) => (
                  <li key={index}>• {conflict}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {conflicts.length === 0 && Object.keys(generatedTimetables).length > 0 && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded no-print">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-500" size={24} />
            <div>
              <h3 className="font-bold text-green-800">Horário Válido!</h3>
              <p className="text-sm text-green-700">Nenhum conflito detectado</p>
            </div>
          </div>
        </div>
      )}

      {/* Horários de Todas as Turmas */}
      {Object.keys(generatedTimetables).length > 0 && currentSchedule && (
        <>
          {classesForDisplay.length === 0 && (
            <div className="card bg-amber-50 border-l-4 border-amber-500 no-print">
              <p className="text-sm text-amber-800">
                Nenhuma turma com horário encontrado para o filtro selecionado.
              </p>
            </div>
          )}

          {/* Visualização em Planilha Normal */}
          {classesForDisplay.length > 0 && viewMode === 'spreadsheet' && printFormat === 'normal' && (
            <div className="space-y-8">
              {classesForDisplay.map((currentClass: any) => {
                return (
                  <div key={currentClass.id} className="card print-container">
                    <div className="mb-6 print-header border-b-4 border-primary-600 pb-4">
                      <h2 className="text-2xl font-bold text-center text-primary-700">
                        {currentClass.grade?.name || 'Série'} - {currentClass.name}
                      </h2>
                      <p className="text-center text-gray-600">
                        {translateShift(currentClass.shift)} • {currentSchedule.name}
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="bg-primary-600 text-white">
                            <th className="border border-gray-300 p-3 text-left font-bold">Horário</th>
                            {weekDays.map((day) => (
                              <th key={day} className="border border-gray-300 p-3 text-center font-bold">
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {currentSchedule.periods.map((periodInfo: { period: number; startTime: string; endTime: string }) => (
                            <tr key={periodInfo.period} className="hover:bg-gray-50">
                              <td className="border border-gray-300 p-3 bg-gray-100 font-semibold">
                                <div className="text-sm">{periodInfo.period}º Horário</div>
                                <div className="text-xs text-gray-600">
                                  {periodInfo.startTime} - {periodInfo.endTime}
                                </div>
                              </td>
                              {weekDays.map((day) => {
                                const slot = getSlotData(currentClass.id, day, periodInfo.period);
                                const subject = slot ? subjects.find((s: Subject) => s.id === slot.subjectId) : null;
                                const teacher = slot ? teachers.find((t: Teacher) => t.id === slot.teacherId) : null;
                                
                                // Debug: mostrar se não encontrar
                                if (slot && !subject) {
                                  console.log(`⚠️ Disciplina não encontrada: slot.subjectId="${slot.subjectId}" | Disciplinas disponíveis:`, subjects.map(s => s.id));
                                }
                                if (slot && !teacher) {
                                  console.log(`⚠️ Professor não encontrado: slot.teacherId="${slot.teacherId}" | Professores disponíveis:`, teachers.map(t => t.id));
                                }
                                
                                const hasConflict = detectConflicts(currentClass.id, day, periodInfo.period, slot);
                                const violatesAvailability = !hasConflict && isAvailabilityViolated(slot, day, periodInfo.period);

                                return (
                                  <td
                                    key={day}
                                    className={`border border-gray-300 p-3 text-center relative group ${hasConflict ? 'ring-4 ring-red-500' : violatesAvailability ? 'ring-2 ring-orange-400' : ''}`}
                                    style={{
                                      backgroundColor: hasConflict
                                        ? '#fee2e2'
                                        : violatesAvailability
                                          ? '#fff7ed'
                                          : subject?.color ? `${subject.color}20` : 'white',
                                    }}
                                    title={hasConflict ? '⚠️ CONFLITO DE HORÁRIO DETECTADO!' : violatesAvailability ? `⚠️ ${teacher?.name} está fora da disponibilidade neste horário` : ''}
                                  >
                                    {/* Botão de editar (aparece ao passar o mouse) */}
                                    <button
                                      onClick={() => openEditModal(currentClass.id, day, periodInfo.period)}
                                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-lg no-print"
                                      title="Editar"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    
                                    {hasConflict && (
                                      <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-bl">
                                        ⚠️
                                      </div>
                                    )}
                                    {violatesAvailability && (
                                      <div className="absolute top-0 left-0 bg-orange-500 text-white text-xs font-bold px-1 py-0.5 rounded-br no-print" title={`${teacher?.name} está fora da disponibilidade`}>
                                        📵
                                      </div>
                                    )}
                                    {subject && teacher ? (
                                      <div className={hasConflict ? 'relative' : ''}>
                                        <div className={`font-semibold text-sm ${hasConflict ? 'text-red-900' : violatesAvailability ? 'text-orange-900' : 'text-gray-900'}`}>
                                          {subject.name}
                                        </div>
                                        <div className={`text-xs mt-1 ${hasConflict ? 'text-red-700 font-bold' : violatesAvailability ? 'text-orange-700 font-semibold' : 'text-gray-600'}`}>
                                          {teacher.name}
                                          {violatesAvailability && <span className="ml-1">⚠️</span>}
                                        </div>
                                        {hasConflict && (
                                          <div className="text-xs font-bold text-red-600 mt-1">
                                            ⚠️ CONFLITO
                                          </div>
                                        )}
                                        {violatesAvailability && (
                                          <div className="text-xs font-bold text-orange-600 mt-1 no-print">
                                            Fora da disp.
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Visualização em Planilha Transposta (Períodos no topo, Turmas na lateral) */}
          {classesForDisplay.length > 0 && viewMode === 'spreadsheet' && printFormat === 'transposed' && (
            <div className="space-y-8">
              {weekDays.map((day) => (
                <div key={day} className="card print-container">
                  <div className="mb-6 print-header border-b-4 border-primary-600 pb-4">
                    <h2 className="text-2xl font-bold text-center text-primary-700">
                      {day}
                    </h2>
                    <p className="text-center text-gray-600">
                      {currentSchedule.name}
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-primary-600 text-white">
                          <th className="border border-gray-300 p-3 text-left font-bold">Turma</th>
                          {currentSchedule.periods.map((periodInfo: { period: number; startTime: string; endTime: string }) => (
                            <th key={periodInfo.period} className="border border-gray-300 p-3 text-center font-bold">
                              <div className="text-sm">{periodInfo.period}º</div>
                              <div className="text-xs font-normal">
                                {periodInfo.startTime}-{periodInfo.endTime}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {classesForDisplay.map((currentClass: any) => (
                          <tr key={currentClass.id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 p-3 bg-gray-100 font-semibold">
                              <div className="text-sm">{currentClass.grade?.name || 'Série'}</div>
                              <div className="text-xs text-gray-600">{currentClass.name}</div>
                              <div className="text-xs text-gray-500">{translateShift(currentClass.shift)}</div>
                            </td>
                            {currentSchedule.periods.map((periodInfo: { period: number; startTime: string; endTime: string }) => {
                              const slot = getSlotData(currentClass.id, day, periodInfo.period);
                              const subject = slot ? subjects.find((s: Subject) => s.id === slot.subjectId) : null;
                              const teacher = slot ? teachers.find((t: Teacher) => t.id === slot.teacherId) : null;
                              const hasConflict = detectConflicts(currentClass.id, day, periodInfo.period, slot);
                              const violatesAvailability = !hasConflict && isAvailabilityViolated(slot, day, periodInfo.period);

                              return (
                                <td
                                  key={periodInfo.period}
                                  className={`border border-gray-300 p-3 text-center relative group ${hasConflict ? 'ring-4 ring-red-500' : violatesAvailability ? 'ring-2 ring-orange-400' : ''}`}
                                  style={{
                                    backgroundColor: hasConflict
                                      ? '#fee2e2'
                                      : violatesAvailability
                                        ? '#fff7ed'
                                        : subject?.color ? `${subject.color}20` : 'white',
                                  }}
                                  title={hasConflict ? '⚠️ CONFLITO DE HORÁRIO DETECTADO!' : violatesAvailability ? `⚠️ ${teacher?.name} está fora da disponibilidade neste horário` : ''}
                                >
                                  {/* Botão de editar */}
                                  <button
                                    onClick={() => openEditModal(currentClass.id, day, periodInfo.period)}
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-lg no-print"
                                    title="Editar"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  
                                  {hasConflict && (
                                    <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-bl">
                                      ⚠️
                                    </div>
                                  )}
                                  {violatesAvailability && (
                                    <div className="absolute top-0 left-0 bg-orange-500 text-white text-xs font-bold px-1 py-0.5 rounded-br no-print" title={`${teacher?.name} está fora da disponibilidade`}>
                                      📵
                                    </div>
                                  )}
                                  {subject && teacher ? (
                                    <div className={hasConflict ? 'relative' : ''}>
                                      <div className={`font-semibold text-sm ${hasConflict ? 'text-red-900' : violatesAvailability ? 'text-orange-900' : 'text-gray-900'}`}>
                                        {subject.name}
                                      </div>
                                      <div className={`text-xs mt-1 ${hasConflict ? 'text-red-700 font-bold' : violatesAvailability ? 'text-orange-700 font-semibold' : 'text-gray-600'}`}>
                                        {teacher.name}
                                        {violatesAvailability && <span className="ml-1">⚠️</span>}
                                      </div>
                                      {hasConflict && (
                                        <div className="text-xs font-bold text-red-600 mt-1">
                                          ⚠️ CONFLITO
                                        </div>
                                      )}
                                      {violatesAvailability && (
                                        <div className="text-xs font-bold text-orange-600 mt-1 no-print">
                                          Fora da disp.
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Visualização Dia a Dia */}
          {classesForDisplay.length > 0 && viewMode === 'day-by-day' && (
        <div className="space-y-8">
          {classesForDisplay.map((currentClass: any) => (
            <div key={currentClass.id} className="card print-container">
              <div className="mb-6 print-header border-b-4 border-primary-600 pb-4">
                <h2 className="text-2xl font-bold text-center text-primary-700">
                  {currentClass.grade?.name || 'Série'} - {currentClass.name}
                </h2>
                <p className="text-center text-gray-600">
                  {translateShift(currentClass.shift)} • {currentSchedule.name}
                </p>
              </div>

              <div className="space-y-6">
                {weekDays.map((day) => {
                  const dayPanel = dayLoadCounterPanels[`${currentClass.id}|${day}`] || {
                    subjectCounters: [],
                    teacherCounters: [],
                    totalGeneratedInDay: 0,
                    dayCapacity: currentSchedule.periods.length,
                    dayMissingCapacity: currentSchedule.periods.length,
                    subjectWeeklyTargetTotal: 0,
                    subjectWeeklyGeneratedTotal: 0,
                    subjectWeeklyMissingTotal: 0,
                    teacherWeeklyTargetTotal: 0,
                    teacherWeeklyGeneratedTotal: 0,
                    teacherWeeklyMissingTotal: 0
                  };
                  const teachersWithLessonsToday = dayPanel.teacherCounters.filter(
                    (counter) => counter.dailyGenerated > 0
                  ).length;

                  return (
                    <div key={day} className="border border-gray-300 rounded-lg overflow-hidden">
                      <div className="bg-primary-600 text-white p-3 font-bold text-center text-lg">
                        {day}
                      </div>

                      <div className="flex flex-col lg:flex-row">
                        <aside className="w-full lg:w-[25rem] border-b lg:border-b-0 lg:border-r border-gray-300 bg-slate-50 p-4 space-y-4">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">Controle de Cargas</h4>
                            <p className="text-xs text-slate-600 mt-1">
                              Comparativo do horário gerado entre disciplina e professor.
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded border border-slate-200 bg-white p-2">
                              <p className="text-slate-500">Disciplinas na semana</p>
                              <p className="text-sm font-bold text-slate-800">
                                {dayPanel.subjectWeeklyGeneratedTotal}/{dayPanel.subjectWeeklyTargetTotal}
                              </p>
                              <p className="text-amber-700">
                                Faltam {dayPanel.subjectWeeklyMissingTotal}
                              </p>
                            </div>

                            <div className="rounded border border-slate-200 bg-white p-2">
                              <p className="text-slate-500">Professores na semana</p>
                              <p className="text-sm font-bold text-slate-800">
                                {dayPanel.teacherWeeklyGeneratedTotal}/{dayPanel.teacherWeeklyTargetTotal}
                              </p>
                              <p className="text-amber-700">
                                Faltam {dayPanel.teacherWeeklyMissingTotal}
                              </p>
                            </div>

                            <div className="rounded border border-slate-200 bg-white p-2">
                              <p className="text-slate-500">Turma no dia</p>
                              <p className="text-sm font-bold text-slate-800">
                                {dayPanel.totalGeneratedInDay}/{dayPanel.dayCapacity}
                              </p>
                              <p className="text-amber-700">
                                Faltam {dayPanel.dayMissingCapacity} slot(s)
                              </p>
                            </div>

                            <div className="rounded border border-slate-200 bg-white p-2">
                              <p className="text-slate-500">Professores no dia</p>
                              <p className="text-sm font-bold text-slate-800">
                                {teachersWithLessonsToday}
                              </p>
                              <p className="text-slate-600">Com aula neste dia</p>
                            </div>
                          </div>

                          <div>
                            <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-700 mb-2">
                              Disciplinas
                            </h5>
                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                              {dayPanel.subjectCounters.length === 0 && (
                                <div className="text-xs text-slate-500 bg-white border border-slate-200 rounded p-2">
                                  Sem dados de disciplina para comparar.
                                </div>
                              )}

                              {dayPanel.subjectCounters.map((counter) => (
                                <div key={counter.subjectId} className="rounded border border-slate-200 bg-white p-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs font-semibold text-slate-800 leading-tight">
                                      {counter.subjectName}
                                    </p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${counter.weeklyMissing > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                      {counter.weeklyMissing > 0 ? `Falta ${counter.weeklyMissing}` : 'Completo'}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-[11px] text-slate-600 space-y-0.5">
                                    <p>Semana: {counter.weeklyGenerated}/{counter.weeklyTarget}</p>
                                    <p>Dia: {counter.dailyGenerated} aula(s)</p>
                                    <p>Anual: {counter.annualGenerated}/{counter.annualTarget}</p>
                                    <p>Falta para incrementar: {counter.weeklyMissing} semana • {counter.annualMissing} ano</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-700 mb-2">
                              Professores
                            </h5>
                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                              {dayPanel.teacherCounters.length === 0 && (
                                <div className="text-xs text-slate-500 bg-white border border-slate-200 rounded p-2">
                                  Sem dados de professor para comparar.
                                </div>
                              )}

                              {dayPanel.teacherCounters.map((counter) => (
                                <div key={counter.teacherId} className="rounded border border-slate-200 bg-white p-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs font-semibold text-slate-800 leading-tight">
                                      {counter.teacherName}
                                    </p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${counter.weeklyMissing > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                      {counter.weeklyMissing > 0 ? `Falta ${counter.weeklyMissing}` : 'Completo'}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-[11px] text-slate-600 space-y-0.5">
                                    <p>Semana: {counter.weeklyGenerated}/{counter.weeklyTarget}</p>
                                    <p>Dia: {counter.dailyGenerated} geral • {counter.classDailyGenerated} na turma</p>
                                    <p>Anual: {counter.annualGenerated}/{counter.annualTarget}</p>
                                    <p>Falta para incrementar: {counter.weeklyMissing} semana • {counter.annualMissing} ano</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </aside>

                        <div className="flex-1 overflow-x-auto">
                          <table className="min-w-full">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border-b border-gray-300 p-3 text-left w-32">Horário</th>
                                <th className="border-b border-gray-300 p-3 text-left">Disciplina</th>
                                <th className="border-b border-gray-300 p-3 text-left">Professor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentSchedule.periods.map((periodInfo: { period: number; startTime: string; endTime: string }) => {
                                const slot = getSlotData(currentClass.id, day, periodInfo.period);
                                const subject = slot ? subjects.find((s: Subject) => s.id === slot.subjectId) : null;
                                const teacher = slot ? teachers.find((t: Teacher) => t.id === slot.teacherId) : null;
                                const hasConflict = detectConflicts(currentClass.id, day, periodInfo.period, slot);
                                const violatesAvailability = !hasConflict && isAvailabilityViolated(slot, day, periodInfo.period);

                                return (
                                  <tr
                                    key={periodInfo.period}
                                    className={`hover:bg-gray-50 ${hasConflict ? 'bg-red-50 ring-2 ring-red-500' : violatesAvailability ? 'bg-orange-50 ring-1 ring-orange-400' : ''}`}
                                    title={hasConflict ? '⚠️ CONFLITO DE HORÁRIO DETECTADO!' : violatesAvailability ? `⚠️ ${teacher?.name} está fora da disponibilidade neste horário` : ''}
                                  >
                                    <td className="border-b border-gray-200 p-3 bg-gray-50">
                                      <div className="text-sm font-bold">{periodInfo.period}º</div>
                                      <div className="text-xs text-gray-600">
                                        {periodInfo.startTime} - {periodInfo.endTime}
                                      </div>
                                    </td>
                                    <td
                                      className={`border-b border-gray-200 p-3 ${hasConflict ? 'ring-2 ring-red-500' : violatesAvailability ? 'ring-1 ring-orange-400' : ''}`}
                                      style={{
                                        backgroundColor: hasConflict
                                          ? '#fee2e2'
                                          : violatesAvailability
                                            ? '#fff7ed'
                                            : subject?.color ? `${subject.color}20` : 'white',
                                      }}
                                    >
                                      <div className={`font-semibold ${hasConflict ? 'text-red-900' : violatesAvailability ? 'text-orange-900' : 'text-gray-900'}`}>
                                        {subject?.name || '-'}
                                        {hasConflict && (
                                          <span className="ml-2 text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                                            ⚠️ CONFLITO
                                          </span>
                                        )}
                                        {violatesAvailability && (
                                          <span className="ml-2 text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded no-print">
                                            📵 Fora da disp.
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className={`border-b border-gray-200 p-3 ${hasConflict ? 'text-red-700 font-bold' : violatesAvailability ? 'text-orange-700 font-semibold' : ''}`}>
                                      <div className="text-sm">
                                        {teacher?.name || '-'}
                                        {violatesAvailability && <span className="ml-1 no-print">⚠️</span>}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
          )}
        </>
      )}

      {/* Instruções */}
      {Object.keys(generatedTimetables).length === 0 && (
        <div className="card bg-blue-50 border-l-4 border-blue-500 no-print">
          <h3 className="font-bold text-blue-900 mb-3">Como usar:</h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li>1. Escolha o <strong>Tipo de Horário</strong> (Parcial, Integral, etc.)</li>
            <li>2. Selecione a <strong>Turma</strong> (ou todas as turmas)</li>
            <li>3. Selecione o <strong>Dia</strong> (Segunda a Sexta, ou Todos)</li>
            <li>4. Adicione <strong>Observações</strong> se necessário (opcional)</li>
            <li>5. Clique em <strong>Gerar Horário</strong></li>
            <li>6. Escolha o <strong>Formato de Impressão</strong>: Padrão ou Transposto</li>
          </ol>
          <div className="mt-4 space-y-2">
            <div className="p-3 bg-blue-100 rounded">
              <p className="text-xs text-blue-900 font-semibold mb-2">
                💡 <strong>Regras Aplicadas Automaticamente:</strong>
              </p>
              <ul className="text-xs text-blue-800 space-y-1 ml-4">
                <li>✅ <strong>🎯 PRIORIDADE MÁXIMA:</strong> Observações dos professores</li>
                <li>✅ <strong>📌 Compactação:</strong> Aulas nos primeiros períodos, janelas no final</li>
                <li>✅ <strong>🚫 Sem repetição:</strong> Professor não dá aulas seguidas na mesma turma</li>
                <li>✅ <strong>⚡ Sequências otimizadas:</strong> Professor com aulas seguidas em turmas diferentes</li>
                <li>✅ <strong>🏖️ Folgas permitidas:</strong> Professor pode ter dia livre</li>
                <li>✅ <strong>⛔ Zero conflitos:</strong> Professor nunca em duas turmas simultaneamente</li>
              </ul>
            </div>
            <div className="p-3 bg-green-100 rounded">
              <p className="text-xs text-green-900 font-semibold mb-2">
                🖨️ <strong>Formatos de Impressão:</strong>
              </p>
              <ul className="text-xs text-green-800 space-y-1 ml-4">
                <li>📊 <strong>Padrão:</strong> Períodos na coluna esquerda, dias da semana no topo</li>
                <li>🔄 <strong>Transposto:</strong> Períodos no topo, turmas na coluna esquerda (ideal para visualizar múltiplas turmas por dia)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      {Object.keys(generatedTimetables).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="text-3xl font-bold">{subjects.length}</div>
            <div className="text-sm opacity-90">Componentes</div>
          </div>
          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="text-3xl font-bold">{teachers.length}</div>
            <div className="text-sm opacity-90">Professores</div>
          </div>
          <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="text-3xl font-bold">
              {filteredScheduledSlotsCount}
            </div>
            <div className="text-sm opacity-90">Aulas Agendadas</div>
          </div>
          <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="text-3xl font-bold">{conflicts.length}</div>
            <div className="text-sm opacity-90">Conflitos</div>
          </div>
        </div>
      )}

      {/* Diálogo de Salvar */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Salvar Horários</h3>
            <p className="text-sm text-gray-600 mb-4">
              Digite um título para identificar este conjunto de horários:
            </p>
            <input
              type="text"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              placeholder="Ex: Horário 2025 - 1º Semestre"
              className="input w-full mb-4"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveTitle('');
                }}
                className="btn btn-secondary"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !saveTitle.trim()}
                className="btn btn-primary"
              >
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Célula */}
      {editModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Editar Horário</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Turma:</strong> {classes.find((c: any) => c.id === editModalData.classId)?.name}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Horário:</strong> {editModalData.day} - {editModalData.period}º período
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disciplina *
                </label>
                <select
                  value={selectedSubjectForEdit}
                  onChange={(e) => setSelectedSubjectForEdit(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Selecione a disciplina</option>
                  {subjects
                    .filter((s: Subject) => s.isActive !== false)
                    .map((subject: Subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professor *
                </label>
                <select
                  value={selectedTeacherForEdit}
                  onChange={(e) => setSelectedTeacherForEdit(e.target.value)}
                  className="input w-full"
                  disabled={!selectedSubjectForEdit}
                >
                  <option value="">Selecione o professor</option>
                  {teachers
                    .filter((t: Teacher) => {
                      if (!selectedSubjectForEdit) return false;
                      // Filtrar professores que podem lecionar a disciplina selecionada
                      const canTeach = teacherSubjects.some(
                        (ts: TeacherSubject) => 
                          ts.teacherId === t.id && ts.subjectId === selectedSubjectForEdit
                      );
                      return canTeach && t.isActive !== false;
                    })
                    .map((teacher: Teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                </select>
                {selectedSubjectForEdit && teachers.filter((t: Teacher) => {
                  const canTeach = teacherSubjects.some(
                    (ts: TeacherSubject) => 
                      ts.teacherId === t.id && ts.subjectId === selectedSubjectForEdit
                  );
                  return canTeach && t.isActive !== false;
                }).length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ Nenhum professor habilitado para esta disciplina
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              {editModalData.currentSubjectId && (
                <button
                  onClick={removeSlot}
                  className="btn btn-outline text-red-600 border-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Remover
                </button>
              )}
              <div className="flex-1"></div>
              <button
                onClick={closeEditModal}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={applyEdit}
                disabled={!selectedSubjectForEdit || !selectedTeacherForEdit}
                className="btn btn-primary"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
