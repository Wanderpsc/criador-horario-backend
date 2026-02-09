import express from 'express';
import mongoose from 'mongoose';
import TeacherAttendance from '../models/TeacherAttendance';
import GeneratedTimetable from '../models/GeneratedTimetable';
import SchoolDay from '../models/SchoolDay';
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
      const timetables = await GeneratedTimetable.find({ schoolId });
      
      if (timetables.length === 0) {
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
                teacherClasses[slot.teacherId].classes.push({
                  period: slot.period,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  subjectId: slot.subjectId,
                  subjectName: slot.subjectName,
                  classId: timetable.classId,
                  className: timetable.name,
                  grade: timetable.grade || 'N/A',
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

      return res.json({
        date,
        dayOfWeek: targetDay,
        teachers: Object.values(teacherClasses),
        scheduleId: null,
        scheduleName: 'Horário Padrão (Dia não cadastrado no calendário)',
        message: 'Usando horário padrão do dia da semana. Cadastre este dia no Calendário Letivo para melhor controle.',
        warning: true
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
    let query: any = { schoolId };
    
    if (effectiveScheduleId) {
      query.scheduleId = effectiveScheduleId;
      console.log('🎯 Usando scheduleId específico:', effectiveScheduleId);
    }

    const timetables = await GeneratedTimetable.find(query);
    console.log('📚 Horários encontrados:', timetables.length);

    // 4. BUSCAR TODOS OS PROFESSORES ATIVOS DA ESCOLA
    const Teacher = mongoose.model('Teacher');
    const allTeachers = await Teacher.find({ schoolId, isActive: true }).select('_id name');
    
    console.log('👨‍🏫 Total de professores ativos:', allTeachers.length);

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
    timetables.forEach((timetable: any) => {
      if (timetable.slots && Array.isArray(timetable.slots)) {
        timetable.slots.forEach((slot: any) => {
          if (slot.day === targetDay && slot.teacherId) {
            // Se o professor existe na lista
            if (teacherClasses[slot.teacherId]) {
              teacherClasses[slot.teacherId].classes.push({
                period: slot.period,
                startTime: slot.startTime,
                endTime: slot.endTime,
                subjectId: slot.subjectId,
                subjectName: slot.subjectName,
                classId: timetable.classId,
                className: timetable.name,
                grade: timetable.grade || 'N/A',
                status: 'pending'
              });
            }
          }
        });
      }
    });

    // 5. ORDENAR AULAS POR PERÍODO
    Object.values(teacherClasses).forEach((teacher: any) => {
      teacher.classes.sort((a: any, b: any) => a.period - b.period);
    });

    console.log('👨‍🏫 Professores com aulas:', Object.keys(teacherClasses).length);

    res.json({
      date,
      dayOfWeek: targetDay,
      teachers: Object.values(teacherClasses),
      scheduleId: effectiveScheduleId,
      scheduleName: effectiveScheduleId || 'Padrão'
    });
  } catch (error) {
    console.error('❌ Erro ao buscar aulas agendadas:', error);
    res.status(500).json({ message: 'Erro ao buscar aulas agendadas' });
  }
});

// Atualizar status de uma aula específica
router.put('/class-status', auth, async (req: AuthRequest, res) => {
  try {
    const { teacherId, date, period, status } = req.body;
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID não encontrado' });
    }

    if (!teacherId || !date || period === undefined || !status) {
      return res.status(400).json({ message: 'Dados incompletos' });
    }

    // Buscar ou criar registro de frequência
    let attendance = await TeacherAttendance.findOne({
      schoolId,
      teacherId,
      date
    });

    if (attendance) {
      // Atualizar status da aula específica
      const classIndex = attendance.classes.findIndex((c: any) => c.period === period);
      if (classIndex !== -1) {
        attendance.classes[classIndex].status = status;
        attendance.classes[classIndex].markedAt = new Date();
      }
      await attendance.save();
    }

    res.json(attendance);
  } catch (error: any) {
    console.error('Erro ao atualizar status da aula:', error);
    res.status(500).json({ 
      message: 'Erro ao atualizar status da aula',
      error: error.message 
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
