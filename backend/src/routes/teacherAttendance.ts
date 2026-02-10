import express from 'express';
import mongoose from 'mongoose';
import TeacherAttendance from '../models/TeacherAttendance';
import GeneratedTimetable from '../models/GeneratedTimetable';
import SchoolDay from '../models/SchoolDay';
import Subject from '../models/Subject';
import Class from '../models/Class';
import Teacher from '../models/Teacher';
import Schedule from '../models/Schedule';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Buscar registros de frequência
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID não encontrado' });
    }

    let query: any = { schoolId };

    if (date) {
      query.date = date;
    } else if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const records = await TeacherAttendance.find(query)
      .sort({ date: -1, teacherName: 1 });

    res.json(records);
  } catch (error) {
    console.error('Erro ao buscar registros de frequência:', error);
    res.status(500).json({ message: 'Erro ao buscar registros de frequência' });
  }
});

// Salvar múltiplos registros de frequência (bulk)
router.post('/bulk', auth, async (req: AuthRequest, res) => {
  try {
    const { records, date } = req.body;
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID não encontrado' });
    }

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'Nenhum registro fornecido' });
    }

    // Preparar registros com schoolId
    const recordsToSave = records.map(record => ({
      ...record,
      schoolId,
      timestamp: new Date()
    }));

    // Usar bulkWrite para upsert (atualizar ou inserir)
    const bulkOps = recordsToSave.map(record => ({
      updateOne: {
        filter: { 
          schoolId: record.schoolId,
          teacherId: record.teacherId,
          date: record.date
        },
        update: { $set: record },
        upsert: true
      }
    }));

    const result = await TeacherAttendance.bulkWrite(bulkOps);

    res.json({
      message: 'Registros salvos com sucesso',
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      total: records.length
    });
  } catch (error: any) {
    console.error('Erro ao salvar registros de frequência:', error);
    res.status(500).json({ 
      message: 'Erro ao salvar registros de frequência',
      error: error.message 
    });
  }
});

// Salvar um único registro de frequência
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID não encontrado' });
    }

    const attendanceData = {
      ...req.body,
      schoolId,
      timestamp: new Date()
    };

    // Verificar se já existe registro para este professor nesta data
    const existing = await TeacherAttendance.findOne({
      schoolId,
      teacherId: attendanceData.teacherId,
      date: attendanceData.date
    });

    let attendance;
    
    if (existing) {
      // Atualizar registro existente
      attendance = await TeacherAttendance.findByIdAndUpdate(
        existing._id,
        attendanceData,
        { new: true }
      );
    } else {
      // Criar novo registro
      attendance = new TeacherAttendance(attendanceData);
      await attendance.save();
    }

    res.status(201).json(attendance);
  } catch (error: any) {
    console.error('Erro ao salvar frequência:', error);
    res.status(500).json({ 
      message: 'Erro ao salvar frequência',
      error: error.message 
    });
  }
});

// Atualizar registro de frequência
router.put('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    const attendance = await TeacherAttendance.findOneAndUpdate(
      { _id: id, schoolId },
      { ...req.body, timestamp: new Date() },
      { new: true }
    );

    if (!attendance) {
      return res.status(404).json({ message: 'Registro não encontrado' });
    }

    res.json(attendance);
  } catch (error) {
    console.error('Erro ao atualizar frequência:', error);
    res.status(500).json({ message: 'Erro ao atualizar frequência' });
  }
});

// Deletar registro de frequência
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    const attendance = await TeacherAttendance.findOneAndDelete({ 
      _id: id, 
      schoolId 
    });

    if (!attendance) {
      return res.status(404).json({ message: 'Registro não encontrado' });
    }

    res.json({ message: 'Registro deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar frequência:', error);
    res.status(500).json({ message: 'Erro ao deletar frequência' });
  }
});

// Obter professores ausentes de uma data específica
router.get('/absent-teachers', auth, async (req: AuthRequest, res) => {
  try {
    const { date } = req.query;
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID não encontrado' });
    }

    if (!date) {
      return res.status(400).json({ message: 'Data não fornecida' });
    }

    // Buscar todos os registros do dia
    const records = await TeacherAttendance.find({
      schoolId,
      date
    });

    // Filtrar professores com aulas ausentes
    const absentTeachers = records
      .filter(record => {
        const hasAbsentClasses = record.classes && record.classes.some((c: any) => c.status === 'absent');
        return hasAbsentClasses;
      })
      .map(record => {
        const absentClasses = record.classes.filter((c: any) => c.status === 'absent');
        return {
          teacherId: record.teacherId,
          teacherName: record.teacherName,
          date: record.date,
          totalAbsentClasses: absentClasses.length,
          absentClasses: absentClasses
        };
      });

    res.json(absentTeachers);
  } catch (error) {
    console.error('Erro ao buscar professores ausentes:', error);
    res.status(500).json({ message: 'Erro ao buscar professores ausentes' });
  }
});

// Deletar registro de frequência por teacherId e data
router.delete('/teacher/:teacherId/date/:date', auth, async (req: AuthRequest, res) => {
  try {
    const { teacherId, date } = req.params;
    const schoolId = req.user?.schoolId;

    console.log('🗑️ DELETE attendance:', { teacherId, date, schoolId });

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID não encontrado' });
    }

    if (!teacherId || !date) {
      return res.status(400).json({ message: 'teacherId e date são obrigatórios' });
    }

    const attendance = await TeacherAttendance.findOneAndDelete({
      schoolId,
      teacherId,
      date
    });

    if (!attendance) {
      console.log('⚠️ Registro não encontrado:', { teacherId, date, schoolId });
      return res.status(404).json({ message: 'Registro não encontrado' });
    }

    console.log('✅ Registro deletado:', attendance._id);
    res.json({ message: 'Registro deletado com sucesso', attendance });
  } catch (error: any) {
    console.error('❌ Erro ao deletar frequência:', error);
    res.status(500).json({ message: 'Erro ao deletar frequência', error: error.message });
  }
});

// Obter estatísticas de frequência
router.get('/statistics', auth, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, teacherId, bySubject } = req.query;
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID não encontrado' });
    }

    let query: any = { schoolId };

    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    if (teacherId) {
      query.teacherId = teacherId;
    }

    const records = await TeacherAttendance.find(query);

    // Se bySubject=true, agrupar por disciplina/turma
    if (bySubject === 'true') {
      const subjectStats: { [key: string]: any } = {};

      records.forEach(record => {
        if (!record.classes || record.classes.length === 0) return;

        record.classes.forEach((cls: any) => {
          const key = `${cls.subjectId}_${cls.classId}`;

          if (!subjectStats[key]) {
            subjectStats[key] = {
              subjectId: cls.subjectId,
              subjectName: cls.subjectName,
              classId: cls.classId,
              className: cls.className,
              grade: cls.grade,
              teacherId: record.teacherId,
              teacherName: record.teacherName,
              scheduledClasses: 0,
              givenClasses: 0,
              absentClasses: 0,
              pendingClasses: 0,
              deficit: 0,
              dates: []
            };
          }

          subjectStats[key].scheduledClasses += 1;

          if (cls.status === 'present') {
            subjectStats[key].givenClasses += 1;
          } else if (cls.status === 'absent') {
            subjectStats[key].absentClasses += 1;
            if (!subjectStats[key].dates.includes(record.date)) {
              subjectStats[key].dates.push(record.date);
            }
          } else if (cls.status === 'pending') {
            subjectStats[key].pendingClasses += 1;
          }
        });
      });

      // Calcular déficit
      Object.values(subjectStats).forEach((stat: any) => {
        stat.deficit = stat.scheduledClasses - stat.givenClasses;
      });

      return res.json(Object.values(subjectStats));
    }

    // Estatísticas por professor (padrão)
    const statistics = records.reduce((acc: any, record) => {
      if (!acc[record.teacherId]) {
        acc[record.teacherId] = {
          teacherId: record.teacherId,
          teacherName: record.teacherName,
          totalScheduledClasses: 0,
          totalPresentClasses: 0,
          totalAbsentClasses: 0,
          totalPendingClasses: 0,
          attendanceRate: 0,
          workload: 0
        };
      }

      acc[record.teacherId].totalScheduledClasses += record.totalScheduledClasses || 0;
      acc[record.teacherId].totalPresentClasses += record.totalPresentClasses || 0;
      acc[record.teacherId].totalAbsentClasses += record.totalAbsentClasses || 0;
      acc[record.teacherId].totalPendingClasses += record.totalPendingClasses || 0;

      return acc;
    }, {});

    // Calcular taxa de presença e carga horária
    Object.values(statistics).forEach((stat: any) => {
      if (stat.totalScheduledClasses > 0) {
        stat.attendanceRate = (stat.totalPresentClasses / stat.totalScheduledClasses) * 100;
        stat.workload = stat.totalPresentClasses * 0.833; // 50min por aula
      }
    });

    res.json(Object.values(statistics));
  } catch (error) {
    console.error('Erro ao calcular estatísticas:', error);
    res.status(500).json({ message: 'Erro ao calcular estatísticas' });
  }
});

// Obter aulas agendadas para um dia específico
router.get('/scheduled-classes/:date', auth, async (req: AuthRequest, res) => {
  try {
    const { date } = req.params;
    const { scheduleId } = req.query; // Permitir passar scheduleId via query
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID não encontrado' });
    }

    console.log('📅 Buscando aulas agendadas para:', date, 'schoolId:', schoolId);

    // 1. VERIFICAR SE O DIA É LETIVO NO CALENDÁRIO
    const schoolDay = await SchoolDay.findOne({
      schoolId,
      date: new Date(date + 'T12:00:00')
    });

    console.log('📅 SchoolDay encontrado:', schoolDay);

    // Se não houver dia letivo cadastrado, mas scheduleId foi passado, usar mesmo assim
    if (!schoolDay && !scheduleId) {
      console.log('⚠️ Dia não cadastrado no calendário e sem scheduleId na query');
      
      // PERMITIR BUSCAR MESMO SEM CALENDÁRIO - usar horário do dia da semana
      const dateObj = new Date(date + 'T12:00:00');
      const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
      const dayMap: { [key: string]: string } = {
        'segunda-feira': 'Segunda',
        'terça-feira': 'Terça',
        'quarta-feira': 'Quarta',
        'quinta-feira': 'Quinta',
        'sexta-feira': 'Sexta',
        'sábado': 'Sábado'
      };
      const targetDay = dayMap[dayOfWeek.toLowerCase()];

      console.log('🔄 Usando horário padrão para:', targetDay);

      // Buscar todos os horários da escola
      // IMPORTANTE: O campo no modelo é 'school', não 'schoolId'
      const timetables = await GeneratedTimetable.find({ school: schoolId });
      
      console.log('📚 Horários encontrados (sem calendário):', timetables.length);
      
      if (timetables.length === 0) {
        // Tentar buscar SEM filtro para debug
        const allTimetables = await GeneratedTimetable.find({}).limit(3);
        console.log('🔍 Primeiros 3 horários no banco:', allTimetables.map((t: any) => ({
          scheduleId: t.scheduleId,
          title: t.title,
          school: t.school || 'SEM CAMPO SCHOOL'
        })));
        
        return res.json({
          date,
          dayOfWeek: targetDay,
          teachers: [],
          scheduleId: null,
          scheduleName: 'Nenhum horário cadastrado',
          message: 'Nenhum horário foi gerado ainda. Crie um horário em "Gerar Horários"',
          warning: true
        });
      }

      // Buscar todos os professores ativos da escola
      const Teacher = mongoose.model('Teacher');
      const allTeachers = await Teacher.find({ schoolId, isActive: true }).select('_id name');
      
      console.log('👨‍🏫 Total de professores ativos (sem calendário):', allTeachers.length);

      // Buscar nomes das turmas
      const Class = mongoose.model('Class');
      const classIds = [...new Set(timetables.map((t: any) => t.classId))];
      const classes = await Class.find({ _id: { $in: classIds } }).select('_id name grade');
      const classMap: { [key: string]: { name: string; grade: string } } = {};
      classes.forEach((cls: any) => {
        classMap[cls._id.toString()] = {
          name: cls.name,
          grade: cls.grade || 'N/A'
        };
      });

      // Organizar aulas por professor - inicializar todos os professores
      const teacherClasses: { [key: string]: any } = {};
      
      // Inicializar todos os professores ativos
      allTeachers.forEach((teacher: any) => {
        teacherClasses[teacher._id.toString()] = {
          teacherId: teacher._id.toString(),
          teacherName: teacher.name,
          classes: []
        };
      });

      // Adicionar aulas do horário
      timetables.forEach((timetable: any) => {
        if (timetable.slots && Array.isArray(timetable.slots)) {
          timetable.slots.forEach((slot: any) => {
            if (slot.day === targetDay && slot.teacherId) {
              // Se o professor existe na lista
              if (teacherClasses[slot.teacherId]) {
                const classInfo = classMap[timetable.classId] || { name: 'Turma desconhecida', grade: 'N/A' };
                
                teacherClasses[slot.teacherId].classes.push({
                  period: slot.period,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  subjectId: slot.subjectId,
                  subjectName: slot.subjectName,
                  classId: timetable.classId,
                  className: classInfo.name,
                  grade: classInfo.grade,
                  status: 'pending'
                });
              }
            }
          });
        }
      });

      // Ordenar aulas por período
      Object.values(teacherClasses).forEach((teacher: any) => {
        teacher.classes.sort((a: any, b: any) => a.period - b.period);
      });

      console.log('👨‍🏫 Professores encontrados (sem calendário):', Object.keys(teacherClasses).length);

      // Períodos padrão
      const defaultPeriods = [
        { period: 1, startTime: '07:00', endTime: '07:50' },
        { period: 2, startTime: '07:50', endTime: '08:40' },
        { period: 3, startTime: '08:40', endTime: '09:30' },
        { period: 4, startTime: '09:50', endTime: '10:40' },
        { period: 5, startTime: '10:40', endTime: '11:30' },
        { period: 6, startTime: '11:30', endTime: '12:20' },
        { period: 7, startTime: '13:40', endTime: '14:30' },
        { period: 8, startTime: '14:30', endTime: '15:20' }
      ];

      return res.json({
        date,
        dayOfWeek: targetDay,
        teachers: Object.values(teacherClasses),
        scheduleId: null,
        scheduleName: 'Horário Padrão (Dia não cadastrado no calendário)',
        message: 'Usando horário padrão do dia da semana. Cadastre este dia no Calendário Letivo para melhor controle.',
        warning: true,
        allPeriods: defaultPeriods
      });
    }

    // Se for feriado/recesso
    if (schoolDay && (schoolDay.dayType === 'holiday' || schoolDay.dayType === 'recess')) {
      console.log('⚠️ Dia não letivo (feriado ou recesso)');
      return res.json({
        date,
        dayOfWeek: '',
        teachers: [],
        message: 'Dia não letivo (feriado ou recesso)'
      });
    }

    // 2. DETERMINAR QUAL DIA DA SEMANA USAR
    let targetDay: string;
    let effectiveScheduleId = scheduleId || schoolDay?.scheduleId; // Priorizar query param
    
    if (schoolDay?.dayType === 'saturday' && schoolDay.followWeekday) {
      // Sábado de reposição: seguir horário de outro dia
      const weekdayMap: { [key: string]: string } = {
        'monday': 'Segunda',
        'tuesday': 'Terça',
        'wednesday': 'Quarta',
        'thursday': 'Quinta',
        'friday': 'Sexta'
      };
      targetDay = weekdayMap[schoolDay.followWeekday];
      console.log('🔄 Sábado de reposição - usando horário de:', targetDay);
    } else {
      // Dia regular: usar o dia da semana normal
      const dateObj = new Date(date + 'T12:00:00');
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
      console.log('📆 Dia regular:', targetDay);
    }

    // 3. BUSCAR HORÁRIOS (FILTRAR POR scheduleId SE ESPECIFICADO)
    // IMPORTANTE: O campo no modelo GeneratedTimetable é 'school', não 'schoolId'
    let query: any = { school: schoolId };
    
    if (effectiveScheduleId) {
      query.scheduleId = effectiveScheduleId;
      console.log('🎯 Usando scheduleId específico:', effectiveScheduleId);
    } else {
      console.log('📋 Buscando TODOS os horários da escola (nenhum scheduleId especificado)');
      console.log('📋 Query sendo usada:', query);
    }

    const timetables = await GeneratedTimetable.find(query);
    console.log('📚 Horários encontrados:', timetables.length);
    
    if (timetables.length > 0) {
      console.log('📚 Detalhes do primeiro horário:', {
        scheduleId: timetables[0].scheduleId,
        title: timetables[0].title,
        classId: timetables[0].classId,
        totalSlots: timetables[0].slots?.length || 0,
        schoolId: (timetables[0] as any).school || 'N/A'
      });
    } else {
      console.log('❌ NENHUM HORÁRIO ENCONTRADO! Query usada:', query);
      console.log('❌ schoolId procurado:', schoolId);
      
      // Tentar buscar SEM filtro de school para debug
      const allTimetables = await GeneratedTimetable.find({}).limit(3);
      console.log('🔍 Primeiros 3 horários no banco (sem filtro):', allTimetables.map((t: any) => ({
        scheduleId: t.scheduleId,
        title: t.title,
        school: t.school || 'SEM CAMPO SCHOOL'
      })));
    }

    // 4. BUSCAR TODOS OS PROFESSORES ATIVOS DA ESCOLA
    const Teacher = mongoose.model('Teacher');
    const allTeachers = await Teacher.find({ schoolId, isActive: true }).select('_id name');
    
    console.log('👨‍🏫 Total de professores ativos:', allTeachers.length);

    // 4.1 BUSCAR NOMES DAS TURMAS
    const Class = mongoose.model('Class');
    const classIds = [...new Set(timetables.map((t: any) => t.classId))];
    const classes = await Class.find({ _id: { $in: classIds } }).select('_id name grade');
    const classMap: { [key: string]: { name: string; grade: string } } = {};
    classes.forEach((cls: any) => {
      classMap[cls._id.toString()] = {
        name: cls.name,
        grade: cls.grade || 'N/A'
      };
    });

    // 5. ORGANIZAR AULAS POR PROFESSOR
    const teacherClasses: { [key: string]: any } = {};

    // Inicializar todos os professores ativos (mesmo sem aulas)
    allTeachers.forEach((teacher: any) => {
      teacherClasses[teacher._id.toString()] = {
        teacherId: teacher._id.toString(),
        teacherName: teacher.name,
        classes: []
      };
    });

    // Adicionar aulas do horário
    let totalSlotsProcessed = 0;
    let slotsForTargetDay = 0;
    const daysFound = new Set<string>();
    
    console.log('🔍 DIA PROCURADO (targetDay):', targetDay);
    
    timetables.forEach((timetable: any, timetableIndex: number) => {
      if (timetable.slots && Array.isArray(timetable.slots)) {
        totalSlotsProcessed += timetable.slots.length;
        
        // Log do primeiro slot de cada horário para debug
        if (timetableIndex === 0 && timetable.slots.length > 0) {
          console.log('📝 EXEMPLO DE SLOT:', {
            day: timetable.slots[0].day,
            period: timetable.slots[0].period,
            teacherId: timetable.slots[0].teacherId,
            teacherName: timetable.slots[0].teacherName
          });
        }
        
        timetable.slots.forEach((slot: any, slotIndex: number) => {
          // Coletar todos os dias únicos encontrados
          if (slot.day) {
            daysFound.add(slot.day);
          }
          
          if (slot.day === targetDay) {
            slotsForTargetDay++;
            
            if (slot.teacherId) {
              // Se o professor existe na lista
              if (teacherClasses[slot.teacherId]) {
                const classInfo = classMap[timetable.classId] || { name: 'Turma desconhecida', grade: 'N/A' };
                
                teacherClasses[slot.teacherId].classes.push({
                  period: slot.period,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  subjectId: slot.subjectId,
                  subjectName: slot.subjectName,
                  classId: timetable.classId,
                  className: classInfo.name,
                  grade: classInfo.grade,
                  status: 'pending'
                });
              } else {
                console.log('⚠️ Professor não encontrado na lista ativa:', slot.teacherId, slot.teacherName);
              }
            }
          }
        });
      }
    });
    
    console.log('📊 Total de slots processados:', totalSlotsProcessed);
    console.log('📊 Dias encontrados nos slots:', Array.from(daysFound));
    console.log('📊 Slots para', targetDay + ':', slotsForTargetDay);
    console.log('👨‍🏫 Professores com aulas neste dia:', Object.values(teacherClasses).filter((t: any) => t.classes.length > 0).length);

    // 5. BUSCAR CONFIGURAÇÃO DE PERÍODOS DO HORÁRIO
    const Schedule = mongoose.model('Schedule');
    let allPeriods: any[] = [];
    
    if (effectiveScheduleId) {
      const schedule = await Schedule.findOne({ _id: effectiveScheduleId });
      if (schedule && schedule.periods && schedule.periods.length > 0) {
        allPeriods = schedule.periods;
        console.log('📋 Encontrados', allPeriods.length, 'períodos no Schedule');
      }
    }
    
    // Se não encontrou períodos, usar padrão de 8 períodos
    if (allPeriods.length === 0) {
      allPeriods = [
        { period: 1, startTime: '07:00', endTime: '07:50' },
        { period: 2, startTime: '07:50', endTime: '08:40' },
        { period: 3, startTime: '08:40', endTime: '09:30' },
        { period: 4, startTime: '09:50', endTime: '10:40' },
        { period: 5, startTime: '10:40', endTime: '11:30' },
        { period: 6, startTime: '11:30', endTime: '12:20' },
        { period: 7, startTime: '13:40', endTime: '14:30' },
        { period: 8, startTime: '14:30', endTime: '15:20' }
      ];
      console.log('📋 Usando 8 períodos padrão');
    }

    // 6. ORDENAR AULAS POR PERÍODO
    Object.values(teacherClasses).forEach((teacher: any) => {
      teacher.classes.sort((a: any, b: any) => a.period - b.period);
    });

    console.log('👨‍🏫 Professores com aulas:', Object.keys(teacherClasses).length);

    res.json({
      date,
      dayOfWeek: targetDay,
      teachers: Object.values(teacherClasses),
      scheduleId: effectiveScheduleId,
      scheduleName: effectiveScheduleId || 'Padrão',
      allPeriods: allPeriods // NOVO: enviar todos os períodos
    });
  } catch (error) {
    console.error('❌ Erro ao buscar aulas agendadas:', error);
    res.status(500).json({ message: 'Erro ao buscar aulas agendadas' });
  }
});

// Atualizar status de uma aula específica
router.put('/class-status', auth, async (req: AuthRequest, res) => {
  const { teacherId, date, period, status } = req.body;
  const schoolId = req.user?.schoolId;
  
  try {
    console.log('📝 [class-status] Requisição recebida:', { teacherId, date, period, status, schoolId });

    if (!schoolId) {
      console.error('❌ [class-status] School ID não encontrado');
      return res.status(400).json({ message: 'School ID não encontrado' });
    }

    if (!teacherId || !date || period === undefined || !status) {
      console.error('❌ [class-status] Dados incompletos:', { teacherId, date, period, status });
      return res.status(400).json({ message: 'Dados incompletos' });
    }

    // Buscar ou criar registro de frequência
    let attendance = await TeacherAttendance.findOne({
      schoolId,
      teacherId,
      date
    });

    console.log('🔍 [class-status] Registro encontrado:', attendance ? 'SIM' : 'NÃO');

    if (attendance) {
      // Atualizar status da aula específica
      const classIndex = attendance.classes.findIndex((c: any) => c.period === period);
      console.log('🔍 [class-status] Índice da aula:', classIndex);
      
      if (classIndex !== -1) {
        attendance.classes[classIndex].status = status;
        attendance.classes[classIndex].markedAt = new Date();
        await attendance.save();
        console.log('✅ [class-status] Status atualizado com sucesso');
      } else {
        console.error('❌ [class-status] Aula não encontrada no registro para período:', period);
        return res.status(404).json({ 
          message: 'Aula não encontrada no registro',
          details: `Período ${period} não está no registro de frequência`
        });
      }
    } else {
      // Registro não existe, buscar aula agendada e criar
      console.log('📝 [class-status] Criando registro automático...');
      
      const targetDate = new Date(date);
      const dayOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][targetDate.getDay()];
      
      // Buscar horário gerado
      const timetables = await GeneratedTimetable.find({ school: schoolId });
      console.log(`📚 [class-status] Encontrados ${timetables.length} horários`);
      
      if (timetables.length === 0) {
        return res.status(404).json({ 
          message: 'Nenhum horário encontrado',
          details: 'Não há horários gerados para buscar informações da aula'
        });
      }
      
      // Usar o horário mais recente
      const timetable = timetables[timetables.length - 1];
      
      console.log(`📅 [class-status] Data alvo: ${date}, Day of week calculado: ${dayOfWeek}`);
      console.log(`📊 [class-status] Timetable tem ${timetable.slots?.length || 0} slots`);
      
      // Validar se timetable tem slots
      if (!timetable.slots || timetable.slots.length === 0) {
        console.error('❌ [class-status] Timetable não possui slots');
        return res.status(404).json({ 
          message: 'Horário sem aulas cadastradas',
          details: 'O horário gerado não possui aulas cadastradas'
        });
      }
      
      // Buscar todas as aulas do professor neste dia
      const teacherSlots = timetable.slots.filter((slot: any) => 
        slot.teacherId?.toString() === teacherId && 
        slot.day === dayOfWeek
      );
      
      console.log(`👨‍🏫 [class-status] Encontradas ${teacherSlots.length} aulas do professor no ${dayOfWeek}`);
      console.log(`🔍 [class-status] Exemplo de slot (se existir):`, teacherSlots[0]);
      
      // Se não encontrou aulas, retornar erro informativo
      if (teacherSlots.length === 0) {
        console.error(`❌ [class-status] Nenhuma aula encontrada para teacherId ${teacherId} no ${dayOfWeek}`);
        return res.status(404).json({ 
          message: 'Nenhuma aula encontrada',
          details: `Professor não tem aulas agendadas para ${dayOfWeek} no horário selecionado`
        });
      }
      
      // Buscar informações das disciplinas e turmas
      console.log('🔍 [class-status] Buscando informações de disciplinas e turmas...');
      
      const classesData = await Promise.all(
        teacherSlots.map(async (slot: any) => {
          try {
            const subject = await Subject.findById(slot.subjectId);
            const classInfo = await Class.findById(slot.classId);
            
            console.log(`📚 [class-status] Slot período ${slot.period}: subject=${subject?.name}, class=${classInfo?.name}`);
            
            return {
              period: slot.period,
              startTime: slot.startTime,
              endTime: slot.endTime,
              subjectId: slot.subjectId?.toString(),
              subjectName: subject?.name || 'Disciplina não encontrada',
              classId: slot.classId?.toString(),
              className: classInfo?.name || 'Turma não encontrada',
              grade: classInfo?.gradeId?.toString() || '',
              status: slot.period === period ? status : 'pending',
              markedAt: slot.period === period ? new Date() : undefined
            };
          } catch (slotError: any) {
            console.error(`❌ [class-status] Erro ao processar slot:`, slotError);
            throw slotError;
          }
        })
      );
      
      console.log(`✅ [class-status] ${classesData.length} aulas processadas`);
      
      // Buscar nome do professor
      const teacher = await Teacher.findById(teacherId);
      console.log(`👨‍🏫 [class-status] Professor: ${teacher?.name || 'Não encontrado'}`);
      
      if (!teacher) {
        console.error(`❌ [class-status] Professor não encontrado: ${teacherId}`);
        return res.status(404).json({ 
          message: 'Professor não encontrado',
          details: `Não foi possível encontrar o professor com ID ${teacherId}`
        });
      }
      
      // Criar novo registro
      attendance = new TeacherAttendance({
        schoolId,
        teacherId,
        teacherName: teacher?.name || 'Professor não encontrado',
        date,
        dayOfWeek,
        classes: classesData
      });
      
      await attendance.save();
      console.log('✅ [class-status] Registro criado com sucesso');
    }

    res.json(attendance);
  } catch (error: any) {
    console.error('❌ [class-status] Erro ao atualizar status da aula:', error);
    console.error('❌ [class-status] Stack trace:', error.stack);
    console.error('❌ [class-status] Detalhes do erro:', {
      message: error.message,
      name: error.name,
      teacherId,
      date,
      period,
      status
    });
    res.status(500).json({ 
      message: 'Erro ao atualizar status da aula',
      error: error.message,
      details: error.stack
    });
  }
});

// Criar/atualizar registro de frequência completo
router.post('/daily-record', auth, async (req: AuthRequest, res) => {
  try {
    const { teacherId, teacherName, date, dayOfWeek, classes } = req.body;
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID não encontrado' });
    }

    if (!teacherId || !date || !classes || !Array.isArray(classes)) {
      return res.status(400).json({ message: 'Dados incompletos' });
    }

    // Buscar registro existente
    let attendance = await TeacherAttendance.findOne({
      schoolId,
      teacherId,
      date
    });

    if (attendance) {
      // Atualizar registro existente
      attendance.classes = classes as any;
      attendance.dayOfWeek = dayOfWeek;
      await attendance.save();
    } else {
      // Criar novo registro
      attendance = new TeacherAttendance({
        schoolId,
        teacherId,
        teacherName,
        date,
        dayOfWeek,
        classes
      });
      await attendance.save();
    }

    res.json(attendance);
  } catch (error: any) {
    console.error('Erro ao salvar registro de frequência:', error);
    res.status(500).json({ 
      message: 'Erro ao salvar registro de frequência',
      error: error.message 
    });
  }
});

// Buscar aulas ausentes para reposição
router.get('/makeup-classes', auth, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, teacherId } = req.query;
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID não encontrado' });
    }

    let query: any = { schoolId };

    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    if (teacherId) {
      query.teacherId = teacherId;
    }

    const records = await TeacherAttendance.find(query);

    // Extrair aulas ausentes
    const makeupClasses: any[] = [];

    records.forEach(record => {
      const absentClasses = record.classes ? record.classes.filter((c: any) => c.status === 'absent') : [];
      
      absentClasses.forEach((cls: any) => {
        makeupClasses.push({
          teacherId: record.teacherId,
          teacherName: record.teacherName,
          date: record.date,
          dayOfWeek: record.dayOfWeek,
          period: cls.period,
          startTime: cls.startTime,
          endTime: cls.endTime,
          subjectId: cls.subjectId,
          subjectName: cls.subjectName,
          classId: cls.classId,
          className: cls.className,
          grade: cls.grade
        });
      });
    });

    res.json(makeupClasses);
  } catch (error) {
    console.error('Erro ao buscar aulas para reposição:', error);
    res.status(500).json({ message: 'Erro ao buscar aulas para reposição' });
  }
});

export default router;
