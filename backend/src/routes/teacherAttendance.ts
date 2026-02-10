import express from 'express';
import mongoose from 'mongoose';
import TeacherAttendance from '../models/TeacherAttendance';
import GeneratedTimetable from '../models/GeneratedTimetable';
import SchoolDay from '../models/SchoolDay';
import Subject from '../models/Subject';
import Class from '../models/Class';
import Teacher from '../models/Teacher';
import Schedule from '../models/Schedule';
import TeacherPayment from '../models/TeacherPayment';
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

// DEBUG: Verificar dias únicos no horário (SEM AUTH para debug rápido)
router.get('/debug-days/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;

    console.log('🔍 [debug-days] Buscando dias únicos para scheduleId:', scheduleId);

    const timetable = await GeneratedTimetable.findOne({ scheduleId });

    if (!timetable) {
      return res.status(404).json({ message: 'Horário não encontrado' });
    }

    const uniqueDays = [...new Set(timetable.slots.map((s: any) => s.day))];
    const sampleSlots = timetable.slots.slice(0, 5).map((s: any) => ({
      day: s.day,
      dayType: typeof s.day,
      period: s.period,
      teacherId: s.teacherId
    }));

    console.log('🗓️ [debug-days] Dias únicos:', uniqueDays);
    console.log('📋 [debug-days] Exemplo de slots:', sampleSlots);

    res.json({
      uniqueDays,
      totalSlots: timetable.slots.length,
      sampleSlots,
      message: 'Use estes dias exatamente como aparecem no banco de dados'
    });
  } catch (error) {
    console.error('❌ [debug-days] Erro:', error);
    res.status(500).json({ message: 'Erro ao buscar dias' });
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

// ================================
// ROTAS PUT - ESPECÍFICAS PRIMEIRO
// ================================

// Atualizar status de uma aula específica
router.put('/class-status', auth, async (req: AuthRequest, res) => {
  const { teacherId, date, period, status, scheduleId } = req.body;
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
      
      // Buscar TODOS os horários da escola
      console.log(`📚 [class-status] Buscando TODOS os horários da escola...`);
      const allTimetables = await GeneratedTimetable.find({ school: schoolId });
      console.log(`📚 [class-status] Encontrados ${allTimetables.length} horários`);
      
      if (allTimetables.length === 0) {
        return res.status(404).json({ 
          message: 'Nenhum horário encontrado',
          details: 'Não há horários gerados para buscar informações da aula'
        });
      }
      
      // Agregar todos os slots de todos os horários
      let allSlots: any[] = [];
      allTimetables.forEach((t: any) => {
        if (t.slots && Array.isArray(t.slots)) {
          allSlots = [...allSlots, ...t.slots];
        }
      });
      
      console.log(`📚 [class-status] Total de slots agregados: ${allSlots.length}`);
      
      console.log(`📅 [class-status] Data alvo: ${date}, Day of week calculado: ${dayOfWeek}`);
      console.log(`📊 [class-status] Total de slots: ${allSlots.length}`);
      
      // Validar se há slots
      if (allSlots.length === 0) {
        console.error('❌ [class-status] Nenhum slot encontrado');
        return res.status(404).json({ 
          message: 'Horário sem aulas cadastradas',
          details: 'Os horários gerados não possuem aulas cadastradas'
        });
      }
      
      // Logar todos os valores únicos de 'day' para debug
      const uniqueDays = [...new Set(allSlots.map((s: any) => s.day))];
      console.log(`🗓️ [class-status] Dias únicos encontrados nos slots:`, uniqueDays);
      console.log(`👤 [class-status] Procurando teacherId: ${teacherId}`);
      console.log(`📅 [class-status] Procurando dia: ${dayOfWeek}`);
      
      // Buscar todas as aulas do professor neste dia (comparação case-insensitive)
      const teacherSlots = allSlots.filter((slot: any) => {
        const matchTeacher = slot.teacherId?.toString() === teacherId;
        const matchDay = slot.day?.toLowerCase() === dayOfWeek.toLowerCase();
        
        if (matchTeacher && !matchDay) {
          console.log(`⚠️ [class-status] Professor encontrado mas dia diferente: ${slot.day}`);
        }
        
        return matchTeacher && matchDay;
      });
      
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
      
      // Buscar períodos do Schedule ou usar padrão
      let allPeriods: any[] = [];
      if (scheduleId) {
        const scheduleDoc = await Schedule.findOne({ _id: scheduleId });
        if (scheduleDoc && scheduleDoc.periods && scheduleDoc.periods.length > 0) {
          allPeriods = scheduleDoc.periods;
          console.log('📋 [class-status] Encontrados', allPeriods.length, 'períodos no Schedule');
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
        console.log('📋 [class-status] Usando 8 períodos padrão');
      }
      
      const classesData = await Promise.all(
        teacherSlots.map(async (slot: any) => {
          try {
            const subject = await Subject.findById(slot.subjectId);
            const classInfo = await Class.findById(slot.classId);
            
            // Buscar horários do período
            const periodInfo = allPeriods.find((p: any) => p.period === slot.period);
            const startTime = periodInfo?.startTime || '00:00';
            const endTime = periodInfo?.endTime || '00:00';
            
            console.log(`📚 [class-status] Slot período ${slot.period}: subject=${subject?.name}, class=${classInfo?.name}, ${startTime}-${endTime}`);
            
            return {
              period: slot.period,
              startTime,
              endTime,
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

// Atualizar registro de frequência (rota genérica - DEVE VIR DEPOIS DAS ESPECÍFICAS)
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

// Buscar estatísticas detalhadas por disciplina/turma de um professor
router.get('/teacher-subject-report/:teacherId', auth, async (req: AuthRequest, res) => {
  try {
    const { teacherId } = req.params;
    const { startDate, endDate } = req.query;
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID não encontrado' });
    }

    let query: any = { schoolId, teacherId };

    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const records = await TeacherAttendance.find(query);

    // Agrupar por disciplina/turma
    const subjectStats: { [key: string]: any } = {};
    const teacher = records.length > 0 ? records[0].teacherName : '';

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

    return res.json({
      teacherId,
      teacherName: teacher,
      subjects: Object.values(subjectStats)
    });
  } catch (error) {
    console.error('Erro ao buscar relatório por disciplina:', error);
    res.status(500).json({ message: 'Erro ao buscar relatório por disciplina' });
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

      // Buscar disciplinas para garantir que temos os nomes
      const Subject = mongoose.model('Subject');
      const allSubjectIds = [...new Set(
        timetables.flatMap((t: any) => 
          t.slots?.filter((s: any) => s.subjectId).map((s: any) => s.subjectId) || []
        )
      )];
      const subjects = await Subject.find({ _id: { $in: allSubjectIds } }).select('_id name');
      const subjectMap: { [key: string]: string } = {};
      subjects.forEach((subj: any) => {
        subjectMap[subj._id.toString()] = subj.name;
      });

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

      // Criar mapa de períodos
      const periodMap: { [key: number]: { startTime: string; endTime: string } } = {};
      defaultPeriods.forEach((p: any) => {
        periodMap[p.period] = {
          startTime: p.startTime,
          endTime: p.endTime
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
                
                // Buscar horários do período se não estiver no slot
                const periodTimes = periodMap[slot.period] || { startTime: '00:00', endTime: '00:00' };
                const startTime = slot.startTime || periodTimes.startTime;
                const endTime = slot.endTime || periodTimes.endTime;
                
                // Buscar nome da disciplina se não estiver no slot
                const subjectName = slot.subjectName || subjectMap[slot.subjectId] || 'Disciplina desconhecida';
                
                teacherClasses[slot.teacherId].classes.push({
                  period: slot.period,
                  startTime,
                  endTime,
                  subjectId: slot.subjectId,
                  subjectName,
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

    // 5. BUSCAR CONFIGURAÇÃO DE PERÍODOS DO HORÁRIO (MOVER PARA ANTES DO LOOP)
    const Schedule = mongoose.model('Schedule');
    const Subject = mongoose.model('Subject');
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

    // Criar mapa de períodos para lookup rápido
    const periodMap: { [key: number]: { startTime: string; endTime: string } } = {};
    allPeriods.forEach((p: any) => {
      periodMap[p.period] = {
        startTime: p.startTime || '00:00',
        endTime: p.endTime || '00:00'
      };
    });

    // Buscar informações de todas as disciplinas para garantir que temos os nomes
    const allSubjectIds = [...new Set(
      timetables.flatMap((t: any) => 
        t.slots?.filter((s: any) => s.subjectId).map((s: any) => s.subjectId) || []
      )
    )];
    const subjects = await Subject.find({ _id: { $in: allSubjectIds } }).select('_id name');
    const subjectMap: { [key: string]: string } = {};
    subjects.forEach((subj: any) => {
      subjectMap[subj._id.toString()] = subj.name;
    });
    console.log('📚 Disciplinas carregadas:', subjects.length);

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
                
                // Buscar horários do período se não estiver no slot
                const periodTimes = periodMap[slot.period] || { startTime: '00:00', endTime: '00:00' };
                const startTime = slot.startTime || periodTimes.startTime;
                const endTime = slot.endTime || periodTimes.endTime;
                
                // Buscar nome da disciplina se não estiver no slot
                const subjectName = slot.subjectName || subjectMap[slot.subjectId] || 'Disciplina desconhecida';
                
                teacherClasses[slot.teacherId].classes.push({
                  period: slot.period,
                  startTime,
                  endTime,
                  subjectId: slot.subjectId,
                  subjectName,
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

// Criar/atualizar registro de frequência completo
router.post('/daily-record', auth, async (req: AuthRequest, res) => {
  try {
    const { teacherId, teacherName, date, dayOfWeek, classes } = req.body;
    const schoolId = req.user?.schoolId;

    console.log('\n📝 POST /daily-record - Salvando registro diário');
    console.log('   teacherId:', teacherId);
    console.log('   teacherName:', teacherName);
    console.log('   date:', date);
    console.log('   dayOfWeek:', dayOfWeek);
    console.log('   schoolId:', schoolId);
    console.log('   classes:', JSON.stringify(classes, null, 2));

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID não encontrado' });
    }

    if (!teacherId || !date || !classes || !Array.isArray(classes)) {
      console.error('❌ Dados incompletos:', { teacherId, date, hasClasses: !!classes, isArray: Array.isArray(classes) });
      return res.status(400).json({ message: 'Dados incompletos' });
    }

    // Validar cada aula
    for (let i = 0; i < classes.length; i++) {
      const cls = classes[i];
      const requiredFields = ['period', 'startTime', 'endTime', 'subjectId', 'subjectName', 'classId', 'className', 'grade'];
      const missingFields = requiredFields.filter(field => !cls[field]);
      
      if (missingFields.length > 0) {
        console.error(`❌ Aula ${i} está faltando campos:`, missingFields);
        console.error(`   Dados da aula:`, JSON.stringify(cls, null, 2));
        return res.status(400).json({ 
          message: `Aula ${i + 1} está faltando campos obrigatórios: ${missingFields.join(', ')}`,
          missingFields,
          classData: cls
        });
      }
    }

    // Buscar registro existente
    let attendance = await TeacherAttendance.findOne({
      schoolId,
      teacherId,
      date
    });

    if (attendance) {
      // Atualizar registro existente
      console.log('   ✏️ Atualizando registro existente');
      attendance.classes = classes as any;
      attendance.dayOfWeek = dayOfWeek;
      attendance.teacherName = teacherName; // Atualizar nome caso tenha mudado
      await attendance.save();
    } else {
      // Criar novo registro
      console.log('   ➕ Criando novo registro');
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

    console.log('   ✅ Registro salvo com sucesso, ID:', attendance._id);
    res.json(attendance);
  } catch (error: any) {
    console.error('❌ Erro ao salvar registro de frequência:', error);
    console.error('   Stack:', error.stack);
    res.status(500).json({ 
      message: 'Erro ao salvar registro de frequência',
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : undefined
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

// Registrar pagamento de aulas
router.post('/payment', auth, async (req: AuthRequest, res) => {
  try {
    const { teacherId, teacherName, paymentDate, referenceDate, absentClasses } = req.body;
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID não encontrado' });
    }

    // Validação dos campos obrigatórios
    if (!teacherId || !teacherName || !paymentDate || !referenceDate || absentClasses === undefined) {
      return res.status(400).json({ 
        message: 'Campos obrigatórios ausentes',
        required: ['teacherId', 'teacherName', 'paymentDate', 'referenceDate', 'absentClasses']
      });
    }

    // Buscar registro de frequência da data de referência
    const attendanceRecord = await TeacherAttendance.findOne({
      schoolId,
      teacherId,
      date: referenceDate
    });

    if (!attendanceRecord) {
      return res.status(404).json({ 
        message: 'Registro de frequência não encontrado para a data de referência especificada' 
      });
    }

    // Verificar se há aulas ausentes suficientes
    if (attendanceRecord.totalAbsentClasses === 0) {
      return res.status(400).json({ 
        message: 'Não há aulas ausentes para dar baixa nesta data' 
      });
    }

    // Criar registro de pagamento
    const payment = new TeacherPayment({
      schoolId,
      teacherId,
      teacherName,
      paymentDate,
      referenceDate,
      absentClasses: attendanceRecord.totalAbsentClasses,
      status: 'paid',
      createdBy: req.user?.id || 'system',
      timestamp: new Date()
    });

    await payment.save();

    // Atualizar o status das aulas ausentes para "presente" (dando baixa)
    // Isso efetivamente "paga" as aulas ausentes
    attendanceRecord.classes = attendanceRecord.classes.map((cls: any) => {
      if (cls.status === 'absent') {
        return { ...cls, status: 'present', markedAt: new Date() };
      }
      return cls;
    });

    // Recalcular estatísticas
    attendanceRecord.totalPresentClasses = attendanceRecord.classes.filter((c: any) => c.status === 'present').length;
    attendanceRecord.totalAbsentClasses = attendanceRecord.classes.filter((c: any) => c.status === 'absent').length;
    attendanceRecord.totalPendingClasses = attendanceRecord.classes.filter((c: any) => c.status === 'pending').length;

    if (attendanceRecord.totalScheduledClasses > 0) {
      attendanceRecord.attendanceRate = (attendanceRecord.totalPresentClasses / attendanceRecord.totalScheduledClasses) * 100;
    }

    await attendanceRecord.save();

    res.json({
      message: 'Pagamento registrado com sucesso',
      payment,
      updatedAttendance: attendanceRecord
    });
  } catch (error: any) {
    console.error('Erro ao registrar pagamento:', error);
    res.status(500).json({ 
      message: 'Erro ao registrar pagamento',
      error: error.message 
    });
  }
});

export default router;
