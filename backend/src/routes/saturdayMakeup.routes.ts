import { Router } from 'express';
import SaturdayMakeup from '../models/SaturdayMakeup';
import TeacherDebtRecord from '../models/TeacherDebtRecord';

const router = Router();

// Gerar horário de sábado automaticamente
router.post('/generate', async (req, res) => {
  try {
    const { date } = req.body;

    console.log('📅 Gerando sábado de reposição para:', date);

    // Buscar todos os débitos não pagos
    const unpaidDebts = await TeacherDebtRecord.find({ isPaid: false }).sort({ absenceDate: 1 });

    if (unpaidDebts.length === 0) {
      return res.json({
        success: true,
        message: 'Não há débitos pendentes',
        data: null
      });
    }

    console.log('📚 Débitos pendentes:', unpaidDebts.length);

    // Agrupar débitos por professor e turma
    const debtsByTeacherClass: { [key: string]: any[] } = {};
    for (const debt of unpaidDebts) {
      const key = `${debt.teacherId}-${debt.classId}`;
      if (!debtsByTeacherClass[key]) {
        debtsByTeacherClass[key] = [];
      }
      debtsByTeacherClass[key].push(debt);
    }

    // Criar slots de sábado
    const slots = [];
    let period = 1;
    const startTimes = ['08:00', '08:50', '09:40', '10:30', '11:20', '12:10', '13:00', '13:50'];

    for (const [key, debts] of Object.entries(debtsByTeacherClass)) {
      for (const debt of debts) {
        const remainingHours = debt.hoursOwed - debt.hoursPaid;
        if (remainingHours > 0) {
          slots.push({
            period: period++,
            startTime: startTimes[(period - 2) % startTimes.length],
            endTime: startTimes[(period - 1) % startTimes.length] || '14:40',
            classId: debt.classId,
            subjectId: debt.subjectId,
            teacherId: debt.teacherId,
            debtRecordId: debt._id.toString(),
            hoursCount: Math.min(remainingHours, 1)
          });
        }
      }
    }

    if (slots.length === 0) {
      return res.json({
        success: true,
        message: 'Todos os débitos já foram pagos',
        data: null
      });
    }

    // Criar sábado de reposição
    const saturdayMakeup = new SaturdayMakeup({
      date: new Date(date),
      slots,
      teachersInvolved: [...new Set(slots.map(s => s.teacherId))],
      classesInvolved: [...new Set(slots.map(s => s.classId))],
      totalDebtsBeingPaid: slots.length,
      status: 'planned'
    });

    await saturdayMakeup.save();

    console.log('✅ Sábado de reposição criado com', slots.length, 'aulas');

    res.json({
      success: true,
      data: saturdayMakeup,
      message: `Sábado de reposição criado com ${slots.length} aula(s)`
    });
  } catch (error: any) {
    console.error('❌ Erro ao gerar sábado:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar sábado de reposição',
      error: error.message
    });
  }
});

// Listar sábados de reposição
router.get('/', async (req, res) => {
  try {
    const saturdays = await SaturdayMakeup.find().sort({ date: -1 });

    res.json({
      success: true,
      data: saturdays
    });
  } catch (error: any) {
    console.error('Erro ao buscar sábados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar sábados de reposição',
      error: error.message
    });
  }
});

// Confirmar sábado de reposição (atualiza status e marca débitos como pagos)
router.patch('/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;

    const saturday = await SaturdayMakeup.findById(id);
    if (!saturday) {
      return res.status(404).json({
        success: false,
        message: 'Sábado não encontrado'
      });
    }

    saturday.status = 'confirmed';
    await saturday.save();

    // Marcar débitos como pagos
    for (const slot of saturday.slots) {
      await TeacherDebtRecord.findByIdAndUpdate(slot.debtRecordId, {
        $inc: { hoursPaid: slot.hoursCount },
        $push: { paidDates: new Date() },
        isPaid: true
      });
    }

    res.json({
      success: true,
      data: saturday,
      message: 'Sábado confirmado e débitos atualizados'
    });
  } catch (error: any) {
    console.error('Erro ao confirmar sábado:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao confirmar sábado',
      error: error.message
    });
  }
});

// Atualizar registro de presença
router.put('/:id/attendance', async (req, res) => {
  try {
    const { id } = req.params;
    const { attendanceRecords } = req.body;

    console.log('📝 Atualizando presença do sábado:', id);
    console.log('📋 Registros:', attendanceRecords?.length || 0);

    const saturday = await SaturdayMakeup.findById(id);
    if (!saturday) {
      return res.status(404).json({
        success: false,
        message: 'Sábado não encontrado'
      });
    }

    // Atualizar registros de presença
    saturday.attendanceRecords = attendanceRecords;
    await saturday.save();

    console.log('✅ Presença atualizada com sucesso');

    res.json({
      success: true,
      data: saturday,
      message: 'Presença atualizada com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Erro ao atualizar presença:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar presença',
      error: error.message
    });
  }
});

export default router;
