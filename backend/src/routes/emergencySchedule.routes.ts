import { Router } from 'express';
import EmergencySchedule from '../models/EmergencySchedule';
import TeacherDebtRecord from '../models/TeacherDebtRecord';

const router = Router();

// GET /api/emergency-schedules - Buscar todos os horários emergenciais
router.get('/', async (req, res) => {
  try {
    const schedules = await EmergencySchedule.find().sort({ date: -1 });
    
    res.json({
      success: true,
      data: schedules
    });
  } catch (error: any) {
    console.error('Erro ao buscar horários emergenciais:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar horários emergenciais',
      error: error.message
    });
  }
});

// Gerar horário emergencial
router.post('/', async (req, res) => {
  try {
    const { 
      date, 
      dayOfWeek, 
      classId, 
      baseScheduleId, 
      absentTeacherIds,
      absentTeacherId, // Manter compatibilidade com código antigo
      reason,
      originalSlots,
      emergencySlots,
      affectedSlotsCount,
      makeupClasses // Campo para aulas de reposição no sábado
    } = req.body;

    // Suportar tanto array quanto string única
    const teacherIds = absentTeacherIds || (absentTeacherId ? [absentTeacherId] : []);

    console.log('📥 Criando horário emergencial:', {
      date,
      classId,
      absentTeacherIds: teacherIds,
      affectedSlotsCount,
      makeupClasses: makeupClasses?.length || 0
    });

    // Criar débitos para cada professor ausente
    const teacherDebts = [];
    const affectedSlots = originalSlots.filter((slot: any) => slot.isAffected);

    for (const teacherId of teacherIds) {
      for (const slot of affectedSlots) {
        // Apenas criar débito se o slot for deste professor
        if (slot.teacherId === teacherId) {
          teacherDebts.push({
            teacherId,
            classId: slot.classId || classId,
            subjectId: slot.subjectId,
            hoursOwed: 1, // 1 aula
            absenceDate: new Date(date),
            reason
          });
        }
      }
    }

    // Extrair nomes das turmas afetadas
    const classNames = [...new Set(originalSlots.map((s: any) => s.className).filter(Boolean))];
    
    // Extrair nomes dos professores ausentes (se disponível)
    const absentTeacherNames = [...new Set(
      affectedSlots
        .filter((s: any) => teacherIds.includes(s.teacherId))
        .map((s: any) => s.teacherName)
        .filter(Boolean)
    )];

    // Salvar horário emergencial
    // Corrigir timezone: adicionar T12:00:00 para evitar mudança de dia
    const dateWithTime = date.includes('T') ? date : `${date}T12:00:00`;
    
    const emergencySchedule = new EmergencySchedule({
      date: new Date(dateWithTime),
      dayOfWeek,
      classId,
      baseScheduleId,
      absentTeacherIds: teacherIds,
      absentTeacherNames,
      classNames,
      reason,
      originalSlots,
      emergencySlots,
      affectedSlotsCount,
      teacherDebts,
      makeupClasses: makeupClasses || [] // Adicionar aulas de reposição
    });

    await emergencySchedule.save();

    console.log('✅ Horário emergencial criado:', {
      debts: teacherDebts.length,
      makeupClasses: makeupClasses?.length || 0
    });

    // Criar registros de débito
    for (const debt of teacherDebts) {
      const debtRecord = new TeacherDebtRecord({
        ...debt,
        emergencyScheduleId: emergencySchedule._id.toString()
      });
      await debtRecord.save();
    }

    console.log('✅ Horário emergencial criado com', teacherDebts.length, 'débitos e', makeupClasses?.length || 0, 'aulas de reposição');

    res.json({
      success: true,
      data: emergencySchedule,
      message: `Horário emergencial criado. ${teacherDebts.length} aula(s) a repor.`
    });
  } catch (error: any) {
    console.error('❌ Erro ao criar horário emergencial:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar horário emergencial',
      error: error.message
    });
  }
});

// Buscar horários emergenciais por data e turma
router.get('/by-date', async (req, res) => {
  try {
    const { date, classId } = req.query;

    const query: any = {};
    if (date) query.date = new Date(date as string);
    if (classId) query.classId = classId;

    const schedules = await EmergencySchedule.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: schedules
    });
  } catch (error: any) {
    console.error('Erro ao buscar horários emergenciais:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar horários emergenciais',
      error: error.message
    });
  }
});

// Buscar débitos de um professor
router.get('/debts/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { isPaid } = req.query;

    const query: any = { teacherId };
    if (isPaid !== undefined) {
      query.isPaid = isPaid === 'true';
    }

    const debts = await TeacherDebtRecord.find(query).sort({ absenceDate: 1 });

    const totalOwed = debts.reduce((sum, d) => sum + (d.hoursOwed - d.hoursPaid), 0);

    res.json({
      success: true,
      data: {
        debts,
        totalOwed,
        totalDebts: debts.length
      }
    });
  } catch (error: any) {
    console.error('Erro ao buscar débitos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar débitos',
      error: error.message
    });
  }
});

// Marcar horas como pagas
router.patch('/debts/:debtId/pay', async (req, res) => {
  try {
    const { debtId } = req.params;
    const { hoursPaid } = req.body;

    const debt = await TeacherDebtRecord.findById(debtId);
    if (!debt) {
      return res.status(404).json({
        success: false,
        message: 'Débito não encontrado'
      });
    }

    debt.hoursPaid += hoursPaid;
    debt.paidDates.push(new Date());

    if (debt.hoursPaid >= debt.hoursOwed) {
      debt.isPaid = true;
    }

    await debt.save();

    res.json({
      success: true,
      data: debt,
      message: 'Débito atualizado'
    });
  } catch (error: any) {
    console.error('Erro ao atualizar débito:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar débito',
      error: error.message
    });
  }
});

// Excluir horário emergencial
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Tentando excluir horário emergencial:', id);

    const schedule = await EmergencySchedule.findByIdAndDelete(id);
    
    if (!schedule) {
      console.log('❌ Horário não encontrado:', id);
      return res.status(404).json({
        success: false,
        message: 'Horário emergencial não encontrado'
      });
    }

    console.log('✅ Horário excluído com sucesso:', id);
    res.json({
      success: true,
      message: 'Horário emergencial excluído com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Erro ao excluir horário emergencial:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir horário emergencial',
      error: error.message
    });
  }
});

// POST /api/emergency-schedules/teacher-debts/:teacherId/pay - Dar baixa em débitos (reposição realizada)
router.post('/teacher-debts/:teacherId/pay', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { date, hoursRepaid, details } = req.body;

    console.log(`💰 Dando baixa em débitos do professor ${teacherId}:`, {
      date,
      hoursRepaid,
      details
    });

    // Buscar débitos pendentes do professor
    const debts = await TeacherDebtRecord.find({
      teacherId,
      isPaid: false
    }).sort({ absenceDate: 1 });

    let hoursToRepay = hoursRepaid;
    const updatedDebts = [];

    // Dar baixa nos débitos mais antigos primeiro
    for (const debt of debts) {
      if (hoursToRepay <= 0) break;

      const hoursOwed = debt.hoursOwed - debt.hoursPaid;
      const hoursToPayNow = Math.min(hoursOwed, hoursToRepay);

      debt.hoursPaid += hoursToPayNow;
      debt.paidDates.push(new Date(date));

      if (debt.hoursPaid >= debt.hoursOwed) {
        debt.isPaid = true;
      }

      await debt.save();
      updatedDebts.push(debt);
      hoursToRepay -= hoursToPayNow;

      console.log(`  ✅ ${hoursToPayNow}h pagas em débito de ${new Date(debt.absenceDate).toLocaleDateString()}`);
    }

    res.json({
      success: true,
      message: `${hoursRepaid} hora(s) de reposição registradas`,
      data: {
        debtsUpdated: updatedDebts.length,
        debtsPaidInFull: updatedDebts.filter(d => d.isPaid).length,
        remainingHours: hoursToRepay
      }
    });
  } catch (error: any) {
    console.error('Erro ao dar baixa em débitos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao dar baixa em débitos',
      error: error.message
    });
  }
});

export default router;
