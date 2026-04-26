import express, { Request, Response } from 'express';
import MakeupSaturday from '../models/MakeupSaturday';
import { auth } from '../middleware/auth';
import { 
  processSaturdayAfterRealization, 
  getTeacherPendingDebts,
  generateSaturdayScheduleFromDebts 
} from '../services/makeupSaturdayService';

const router = express.Router();

// Listar todos os sábados de reposição da escola
router.get('/', auth, async (req: Request, res: Response) => {
  try {
    console.log('🔍 GET /saturday-makeup - User:', (req as any).user);
    // Usar o ID do usuário logado como schoolId
    const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
    
    if (!schoolId) {
      console.error('❌ School ID não encontrado no user:', (req as any).user);
      return res.status(400).json({ error: 'School ID não encontrado' });
    }

    console.log('✅ Buscando sábados para schoolId:', schoolId);
    const makeupSaturdays = await MakeupSaturday.find({ schoolId })
      .sort({ date: -1 });

    console.log('📦 Encontrados', makeupSaturdays.length, 'sábados');
    res.json(makeupSaturdays);
  } catch (error: any) {
    console.error('Erro ao listar sábados de reposição:', error);
    res.status(500).json({ error: 'Erro ao listar sábados de reposição' });
  }
});

// Buscar sábado de reposição específico
router.get('/:id', auth, async (req: Request, res: Response) => {
  try {
    const schoolId = (req as any).user?.schoolId;
    const { id } = req.params;

    const makeupSaturday = await MakeupSaturday.findOne({
      _id: id,
      schoolId
    });

    if (!makeupSaturday) {
      return res.status(404).json({ error: 'Sábado de reposição não encontrado' });
    }

    res.json(makeupSaturday);
  } catch (error: any) {
    console.error('Erro ao buscar sábado de reposição:', error);
    res.status(500).json({ error: 'Erro ao buscar sábado de reposição' });
  }
});

// Criar novo sábado de reposição
router.post('/', auth, async (req: Request, res: Response) => {
  try {
    console.log('🔍 POST /saturday-makeup - User:', (req as any).user);
    console.log('📦 Body recebido:', req.body);
    
    // Usar o ID do usuário logado como schoolId
    const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
    
    if (!schoolId) {
      console.error('❌ School ID não encontrado no user:', (req as any).user);
      return res.status(400).json({ error: 'School ID não encontrado' });
    }

    const { date, schedule, teacherDebts, title } = req.body;

    if (!date || !schedule) {
      console.error('❌ Data ou schedule não fornecidos:', { date, schedule });
      return res.status(400).json({ error: 'Data e horário são obrigatórios' });
    }

    // Calcular total de horas agendadas
    const totalScheduledHours = Object.values(schedule).reduce(
      (sum: number, slots: any) => sum + (Array.isArray(slots) ? slots.length : 0),
      0
    );

    console.log('✅ Verificando se já existe sábado para data:', date);
    // Verificar se já existe um sábado de reposição para esta data
    const existingMakeup = await MakeupSaturday.findOne({
      schoolId,
      date: new Date(date)
    });

    if (existingMakeup) {
      console.log('🔄 Atualizando sábado existente:', existingMakeup._id);
      // Atualizar o existente
      existingMakeup.schedule = schedule;
      existingMakeup.teacherDebts = teacherDebts;
      existingMakeup.totalScheduledHours = totalScheduledHours;
      if (title !== undefined) existingMakeup.title = title;
      await existingMakeup.save();
      console.log('✅ Sábado atualizado com sucesso');
      return res.json(existingMakeup);
    }

    console.log('➕ Criando novo sábado');
    // Criar novo
    const makeupSaturday = new MakeupSaturday({
      schoolId,
      date: new Date(date),
      title: title || '',
      schedule,
      teacherDebts,
      totalScheduledHours,
      status: 'planned'
    });

    await makeupSaturday.save();
    console.log('✅ Novo sábado criado:', makeupSaturday._id);

    res.status(201).json(makeupSaturday);
  } catch (error: any) {
    console.error('Erro ao criar sábado de reposição:', error);
    res.status(500).json({ error: 'Erro ao criar sábado de reposição' });
  }
});

// Marcar presença/ausência de professor (DEVE VIR ANTES DE /:id)
router.put('/:id/attendance', auth, async (req: Request, res: Response) => {
  try {
    const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
    const { id } = req.params;
    const { teacherId, attended } = req.body;

    console.log('✅ PUT /:id/attendance - Atualizando presença:', { id, teacherId, attended, schoolId });

    // Buscar com ou sem schoolId dependendo se está disponível
    const query: any = { _id: id };
    if (schoolId) {
      query.schoolId = schoolId;
    }

    console.log('🔍 Query de busca:', query);
    const makeupSaturday = await MakeupSaturday.findOne(query);

    if (!makeupSaturday) {
      console.error('❌ Sábado não encontrado com query:', query);
      return res.status(404).json({ error: 'Sábado de reposição não encontrado' });
    }
    
    console.log('✅ Sábado encontrado:', { _id: makeupSaturday._id, schoolId: makeupSaturday.schoolId });

    if (!makeupSaturday.attendedTeachers) {
      makeupSaturday.attendedTeachers = [];
    }

    if (attended) {
      // Adicionar professor à lista se não estiver
      if (!makeupSaturday.attendedTeachers.includes(teacherId)) {
        makeupSaturday.attendedTeachers.push(teacherId);
        console.log(`👨‍🏫 Professor ${teacherId} marcado como presente`);
      }
    } else {
      // Remover professor da lista
      makeupSaturday.attendedTeachers = makeupSaturday.attendedTeachers.filter(
        (id: string) => id !== teacherId
      );
      console.log(`❌ Professor ${teacherId} desmarcado`);
    }

    await makeupSaturday.save();

    res.json(makeupSaturday);
  } catch (error: any) {
    console.error('Erro ao atualizar presença:', error);
    res.status(500).json({ error: 'Erro ao atualizar presença' });
  }
});

// Atualizar sábado de reposição (DEVE VIR DEPOIS DE /:id/attendance)
router.put('/:id', auth, async (req: Request, res: Response) => {
  try {
    const schoolId = (req as any).user?.schoolId;
    const { id } = req.params;
    const { date, schedule } = req.body;

    console.log('🔄 PUT /:id - Atualizando sábado:', { id, hasDate: !!date, hasSchedule: !!schedule });

    const makeupSaturday = await MakeupSaturday.findOne({
      _id: id,
      schoolId
    });

    if (!makeupSaturday) {
      return res.status(404).json({ error: 'Sábado de reposição não encontrado' });
    }

    if (date) makeupSaturday.date = new Date(date);
    if (schedule) makeupSaturday.schedule = schedule;

    await makeupSaturday.save();

    res.json(makeupSaturday);
  } catch (error: any) {
    console.error('Erro ao atualizar sábado de reposição:', error);
    res.status(500).json({ error: 'Erro ao atualizar sábado de reposição' });
  }
});

// Deletar sábado de reposição
router.delete('/:id', auth, async (req: Request, res: Response) => {
  console.log('🔍 DELETE /:id - Iniciando...');
  console.log('📦 Params:', req.params);
  console.log('👤 User completo:', JSON.stringify((req as any).user));
  
  try {
    const schoolId = (req as any).user?.schoolId;
    const { id } = req.params;

    console.log('🏫 SchoolId extraído:', schoolId);
    console.log('🆔 ID recebido:', id);
    console.log('🔍 User role:', (req as any).user?.role);

    // TEMPORÁRIO: Permitir delete sem schoolId para debugging
    if (!schoolId) {
      console.warn('⚠️ School ID não encontrado, mas permitindo delete para debugging');
    }

    // Buscar com ou sem schoolId
    const query: any = { _id: id };
    if (schoolId) {
      query.schoolId = schoolId;
    }
    
    console.log('🔍 Query de busca:', JSON.stringify(query));
    const makeupSaturday = await MakeupSaturday.findOne(query);

    console.log('📄 Documento encontrado:', makeupSaturday ? 'SIM' : 'NÃO');
    if (makeupSaturday) {
      console.log('📄 Documento:', { _id: makeupSaturday._id, schoolId: makeupSaturday.schoolId, date: makeupSaturday.date });
    }

    if (!makeupSaturday) {
      console.error('❌ Documento não encontrado com query:', query);
      return res.status(404).json({ error: 'Sábado de reposição não encontrado' });
    }

    await makeupSaturday.deleteOne();
    console.log('✅ Documento deletado com sucesso');

    res.json({ message: 'Sábado de reposição deletado com sucesso' });
  } catch (error: any) {
    console.error('❌ Erro ao deletar sábado de reposição:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Erro ao deletar sábado de reposição', details: error.message });
  }
});

// Processar sábado após realização (dar baixa e acumular débitos)
router.post('/:id/process', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('🔄 Processando sábado:', id);

    const result = await processSaturdayAfterRealization(id);

    res.json({
      success: true,
      message: 'Sábado processado com sucesso',
      data: result
    });
  } catch (error: any) {
    console.error('Erro ao processar sábado:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao processar sábado',
      details: error.message 
    });
  }
});

// Buscar débitos pendentes de um professor
router.get('/teacher-debts/:teacherId', auth, async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    console.log('🔍 Buscando débitos do professor:', teacherId);

    const result = await getTeacherPendingDebts(teacherId);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Erro ao buscar débitos:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar débitos',
      details: error.message 
    });
  }
});

// Gerar horário automaticamente baseado em débitos
router.post('/generate-from-debts', auth, async (req: Request, res: Response) => {
  try {
    const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
    const { date, maxPeriods, lessonDuration, startTime, selectedTeacherIds, selectedClassIds } = req.body;

    console.log('🎯 Gerando horário automático para:', { schoolId, date, maxPeriods, lessonDuration, startTime });
    console.log('📦 Body completo:', JSON.stringify(req.body, null, 2));
    
    if (selectedTeacherIds && selectedTeacherIds.length > 0) {
      console.log(`👥 Filtrando ${selectedTeacherIds.length} professores selecionados:`, selectedTeacherIds);
    }
    if (selectedClassIds && selectedClassIds.length > 0) {
      console.log(`🏫 Filtrando ${selectedClassIds.length} turmas selecionadas:`, selectedClassIds);
    }

    if (!schoolId || !date) {
      console.error('❌ Validação falhou - schoolId:', schoolId, 'date:', date);
      return res.status(400).json({ 
        success: false,
        error: 'schoolId e date são obrigatórios' 
      });
    }

    console.log('📞 Chamando generateSaturdayScheduleFromDebts...');
    const result = await generateSaturdayScheduleFromDebts(
      schoolId,
      new Date(date),
      maxPeriods || 4,
      lessonDuration || 60,
      startTime || '08:00',
      selectedTeacherIds,
      selectedClassIds
    );

    console.log('✅ Horário gerado com sucesso!');
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('❌ Erro ao gerar horário:', error);
    console.error('❌ Stack:', error.stack);
    console.error('❌ Mensagem:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao gerar horário',
      details: error.message,
      stack: error.stack
    });
  }
});

// Confirmar aulas individuais (por slot) e atualizar presenças / abater déficits
router.put('/:id/confirm-slots', auth, async (req: Request, res: Response) => {
  try {
    const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
    const { id } = req.params;
    const { confirmedSlots } = req.body; // Array<{ classId: string; period: number }>

    if (!Array.isArray(confirmedSlots)) {
      return res.status(400).json({ error: 'confirmedSlots deve ser um array' });
    }

    const query: any = { _id: id };
    if (schoolId) query.schoolId = schoolId;

    const makeupSaturday = await MakeupSaturday.findOne(query);
    if (!makeupSaturday) {
      return res.status(404).json({ error: 'Sábado de reposição não encontrado' });
    }

    // Montar set de chaves confirmadas para lookup O(1)
    const confirmedSet = new Set<string>(
      confirmedSlots.map((s: { classId: string; period: number }) => `${s.classId}-${s.period}`)
    );

    // Atualizar schedule marcando slots confirmados e coletando professores presentes
    const updatedSchedule: Record<string, any[]> = {};
    const confirmedTeacherIds = new Set<string>();
    let confirmedCount = 0;

    for (const [classId, slots] of Object.entries(makeupSaturday.schedule as Record<string, any[]>)) {
      updatedSchedule[classId] = slots.map((slot: any) => {
        const key = `${classId}-${slot.period}`;
        const isConfirmed = confirmedSet.has(key);
        if (isConfirmed && slot.teacherId) {
          confirmedTeacherIds.add(slot.teacherId as string);
          confirmedCount++;
        }
        return { ...slot, confirmed: isConfirmed };
      });
    }

    makeupSaturday.schedule = updatedSchedule;
    makeupSaturday.attendedTeachers = Array.from(confirmedTeacherIds);
    makeupSaturday.totalRealizedHours = confirmedCount;
    // Marcar como realizado assim que há aulas confirmadas
    if (confirmedCount > 0) {
      makeupSaturday.status = 'realized';
    }

    await makeupSaturday.save();

    // ─── Abater makeupClasses no EmergencySchedule + criar ClassPayments ────────
    if (confirmedTeacherIds.size > 0) {
      try {
        const now = new Date();
        const saturdayDateStr = makeupSaturday.date instanceof Date
          ? makeupSaturday.date.toISOString().split('T')[0]
          : String(makeupSaturday.date).split('T')[0];
        const saturdayDateLabel = new Date(saturdayDateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        // Coletar todos os slots confirmados com detalhes para o helper
        const confirmedSlotsList: Array<{
          teacherId: string; teacherName: string;
          classId: string; className: string;
          subjectId: string; subjectName: string;
        }> = [];
        const confirmedTeacherClassSubject = new Map<string, Set<string>>();
        for (const [, slots] of Object.entries(updatedSchedule)) {
          for (const slot of slots as any[]) {
            if (slot.confirmed && slot.teacherId && slot.classId && slot.subjectId) {
              confirmedSlotsList.push({
                teacherId: slot.teacherId,
                teacherName: slot.teacherName || '',
                classId: slot.classId,
                className: slot.className || '',
                subjectId: slot.subjectId,
                subjectName: slot.subjectName || '',
              });
              if (!confirmedTeacherClassSubject.has(slot.teacherId)) {
                confirmedTeacherClassSubject.set(slot.teacherId, new Set());
              }
              confirmedTeacherClassSubject.get(slot.teacherId)!.add(`${slot.classId}|${slot.subjectId}`);
            }
          }
        }

        // Marcar makeupClasses como isRepaid no EmergencySchedule (mantém consistência)
        try {
          const EmergencySchedule = (await import('../models/EmergencySchedule')).default;
          const allSchedules = await EmergencySchedule.find({
            'makeupClasses.originalTeacherId': { $in: Array.from(confirmedTeacherIds) },
            'makeupClasses.isRepaid': { $ne: true }
          });
          let totalAbated = 0;
          for (const es of allSchedules) {
            let changed = false;
            for (const mc of (es.makeupClasses || []) as any[]) {
              if (mc.isRepaid) continue;
              const keys = confirmedTeacherClassSubject.get(mc.originalTeacherId);
              if (keys?.has(`${mc.classId}|${mc.subjectId}`)) {
                mc.isRepaid = true;
                mc.repaidAt = now;
                changed = true;
                totalAbated++;
              }
            }
            if (changed) { es.markModified('makeupClasses'); await es.save(); }
          }
          console.log(`✅ ${totalAbated} makeupClasse(s) marcado(s) como repaid em EmergencySchedule`);
        } catch (esErr: any) {
          console.error('⚠️ Erro ao marcar EmergencySchedule:', esErr.message);
        }

        // Criar ClassPayments via TeacherAttendance (fonte de verdade das ausências)
        const paymentsCreated = await createPaymentsFromAttendance(
          schoolId, confirmedSlotsList, saturdayDateStr, saturdayDateLabel, now
        );
        console.log(`💰 ${paymentsCreated} ClassPayment(s) criado(s) para o sábado ${saturdayDateStr}`);
      } catch (err: any) {
        console.error('⚠️ Erro ao criar ClassPayments:', err.message);
      }
    }
    // ──────────────────────────────────────────────────────────────────────────

    console.log(`✅ ${confirmedCount} slot(s) confirmado(s) em ${confirmedTeacherIds.size} professor(es)`);

    res.json({
      success: true,
      data: makeupSaturday,
      confirmedCount,
      attendedTeachers: Array.from(confirmedTeacherIds)
    });
  } catch (error: any) {
    console.error('Erro ao confirmar slots:', error);
    res.status(500).json({ error: 'Erro ao confirmar aulas', details: error.message });
  }
});

// ─── Helper: criar ClassPayments lendo ausências do TeacherAttendance ────────
// Para cada slot confirmado (teacherId+classId+subjectId), conta quantos
// foram confirmados, busca ausências reais no TeacherAttendance (data ≤ sábado)
// e cria um ClassPayment por ausência não paga, em ordem cronológica.
async function createPaymentsFromAttendance(
  schoolId: string,
  confirmedSlots: Array<{
    teacherId: string; teacherName: string;
    classId: string; className: string;
    subjectId: string; subjectName: string;
  }>,
  saturdayDateStr: string,
  saturdayDateLabel: string,
  now: Date
): Promise<number> {
  const TeacherAttendance = (await import('../models/TeacherAttendance')).default;
  const ClassPayment = (await import('../models/ClassPayment')).default;

  // Agrupar slots por (teacherId, classId, subjectId) e contar
  const slotMap = new Map<string, {
    count: number;
    teacherId: string; teacherName: string;
    classId: string; className: string;
    subjectId: string; subjectName: string;
  }>();
  for (const slot of confirmedSlots) {
    const key = `${slot.teacherId}|${slot.classId}|${slot.subjectId}`;
    if (!slotMap.has(key)) {
      slotMap.set(key, { count: 0, ...slot });
    }
    slotMap.get(key)!.count++;
  }

  let paymentsCreated = 0;

  for (const [, info] of slotMap) {
    const { count, teacherId, teacherName, classId, className, subjectId, subjectName } = info;

    // Pagamentos já existentes para este professor+turma+disciplina
    const existingPayments = await ClassPayment.find({ schoolId, absentTeacherId: teacherId, classId, subjectId });
    const paidSet = new Set<string>(existingPayments.map((p: any) => `${p.date}|${p.period}`));

    // Buscar todas as ausências do professor nesta turma+disciplina até a data do sábado
    const attendanceRecords = await TeacherAttendance.find({
      schoolId,
      teacherId,
      date: { $lte: saturdayDateStr },
    }).sort({ date: 1 });

    let remaining = count;

    for (const record of attendanceRecords) {
      if (remaining <= 0) break;
      const absentClasses = ((record.classes as any[]) || []).filter((cls: any) =>
        cls.status === 'absent' &&
        cls.subjectId === subjectId &&
        cls.classId === classId
      );
      for (const cls of absentClasses) {
        if (remaining <= 0) break;
        const payKey = `${record.date}|${cls.period}`;
        if (paidSet.has(payKey)) continue;

        await ClassPayment.create({
          schoolId,
          absentTeacherId: teacherId,
          absentTeacherName: teacherName,
          substituteTeacherId: teacherId,
          substituteTeacherName: `Reposição (sáb. ${saturdayDateLabel})`,
          date: record.date as string, // YYYY-MM-DD string do TeacherAttendance
          period: cls.period,
          classId: cls.classId || classId,
          className: cls.className || className,
          subjectId: cls.subjectId || subjectId,
          subjectName: cls.subjectName || subjectName,
          status: 'paid',
          filledAt: now,
          notes: `Reposto no sábado de reposição ${saturdayDateStr}`,
        });
        paymentsCreated++;
        remaining--;
        paidSet.add(payKey);
      }
    }
  }

  return paymentsCreated;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /:id/fix-retroactive — corrige sábados já confirmados antes do fix de status
//   • Lê os slots com confirmed:true já salvos no schedule
//   • Cria ClassPayment para cada ausência encontrada no TeacherAttendance
//   • Atualiza status para 'realized' se houver slots confirmados
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/fix-retroactive', auth, async (req: Request, res: Response) => {
  try {
    const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
    const { id } = req.params;

    const query: any = { _id: id };
    if (schoolId) query.schoolId = schoolId;

    const makeupSaturday = await MakeupSaturday.findOne(query);
    if (!makeupSaturday) {
      return res.status(404).json({ error: 'Sábado de reposição não encontrado' });
    }

    const schedule = makeupSaturday.schedule as Record<string, any[]>;

    // Coletar todos os slots confirmados
    const confirmedSlots: Array<{
      teacherId: string; teacherName: string;
      classId: string; className: string;
      subjectId: string; subjectName: string;
    }> = [];
    let confirmedCount = 0;

    for (const [, slots] of Object.entries(schedule)) {
      for (const slot of slots as any[]) {
        if (slot.confirmed && slot.teacherId && slot.classId && slot.subjectId) {
          confirmedSlots.push({
            teacherId: slot.teacherId,
            teacherName: slot.teacherName || '',
            classId: slot.classId,
            className: slot.className || '',
            subjectId: slot.subjectId,
            subjectName: slot.subjectName || '',
          });
          confirmedCount++;
        }
      }
    }

    if (confirmedCount === 0) {
      return res.json({ success: true, message: 'Nenhum slot confirmado encontrado no schedule.', paymentsCreated: 0 });
    }

    // Atualizar status para 'realized'
    if (makeupSaturday.status !== 'realized') {
      makeupSaturday.status = 'realized';
      await makeupSaturday.save();
    }

    const now = new Date();
    const saturdayDateStr = makeupSaturday.date instanceof Date
      ? makeupSaturday.date.toISOString().split('T')[0]
      : String(makeupSaturday.date).split('T')[0];
    const saturdayDateLabel = new Date(saturdayDateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Também marcar makeupClasses como isRepaid no EmergencySchedule (se existir)
    try {
      const EmergencySchedule = (await import('../models/EmergencySchedule')).default;
      const confirmedTeacherIds = [...new Set(confirmedSlots.map(s => s.teacherId))];
      const allSchedules = await EmergencySchedule.find({
        'makeupClasses.originalTeacherId': { $in: confirmedTeacherIds },
      });
      const classSubjectByTeacher = new Map<string, Set<string>>();
      for (const slot of confirmedSlots) {
        if (!classSubjectByTeacher.has(slot.teacherId)) classSubjectByTeacher.set(slot.teacherId, new Set());
        classSubjectByTeacher.get(slot.teacherId)!.add(`${slot.classId}|${slot.subjectId}`);
      }
      for (const es of allSchedules) {
        let changed = false;
        for (const mc of (es.makeupClasses || []) as any[]) {
          if (mc.isRepaid) continue;
          const keys = classSubjectByTeacher.get(mc.originalTeacherId);
          if (keys?.has(`${mc.classId}|${mc.subjectId}`)) {
            mc.isRepaid = true;
            mc.repaidAt = now;
            changed = true;
          }
        }
        if (changed) {
          es.markModified('makeupClasses');
          await es.save();
        }
      }
    } catch (_) { /* silently ignore EmergencySchedule errors */ }

    // Criar ClassPayments via TeacherAttendance
    const paymentsCreated = await createPaymentsFromAttendance(
      schoolId, confirmedSlots, saturdayDateStr, saturdayDateLabel, now
    );

    console.log(`🔧 Retroactive fix: status=realized, ${paymentsCreated} ClassPayment(s) criado(s) para sábado ${saturdayDateStr}`);

    res.json({
      success: true,
      message: `Correção aplicada: ${paymentsCreated} pagamento(s) criado(s), status → realizado.`,
      paymentsCreated,
      confirmedCount,
    });
  } catch (error: any) {
    console.error('Erro no fix retroativo:', error);
    res.status(500).json({ error: 'Erro ao aplicar correção retroativa', details: error.message });
  }
});

console.log('🔥 ROTAS REGISTRADAS: GET /, POST /, PUT /:id/attendance, PUT /:id, DELETE /:id');
console.log('🔥 NOVAS ROTAS: POST /:id/process, GET /teacher-debts/:teacherId, POST /generate-from-debts, PUT /:id/confirm-slots, POST /:id/fix-retroactive');

export default router;
