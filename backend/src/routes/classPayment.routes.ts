import express from 'express';
import ClassPayment from '../models/ClassPayment';
import TeacherAttendance from '../models/TeacherAttendance';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ─────────────────────────────────────────────
// GET /  — listar pagamentos da escola + período
// ─────────────────────────────────────────────
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { startDate, endDate, month, year, schoolYear } = req.query;
    const schoolYearFilter = schoolYear ? { schoolYear: Number(schoolYear) } : {};

    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = { $gte: String(startDate), $lte: String(endDate) };
    } else if (month && year) {
      const m = String(month).padStart(2, '0');
      const y = String(year);
      const last = new Date(Number(y), Number(month), 0).getDate();
      dateFilter = { $gte: `${y}-${m}-01`, $lte: `${y}-${m}-${last}` };
    }

    const payments = await ClassPayment.find({
      schoolId,
      ...schoolYearFilter,
      ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
    }).sort({ date: -1, period: 1 });

    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /gaps?date=YYYY-MM-DD — lacunas de ausência para uma data
// ─────────────────────────────────────────────
router.get('/gaps', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'date é obrigatório' });

    // Buscar presenças com ausências
    const records = await TeacherAttendance.find({
      schoolId,
      date: String(date),
    });

    const gaps: any[] = [];
    for (const rec of records) {
      for (const cls of rec.classes) {
        if (cls.status === 'absent') {
          // Verificar se já foi pago
          const existing = await ClassPayment.findOne({
            schoolId,
            date: String(date),
            period: cls.period,
            absentTeacherId: rec.teacherId,
            classId: cls.classId,
          });
          gaps.push({
            period: cls.period,
            startTime: cls.startTime,
            endTime: cls.endTime,
            absentTeacherId: rec.teacherId,
            absentTeacherName: rec.teacherName,
            classId: cls.classId,
            className: cls.className,
            subjectId: cls.subjectId,
            subjectName: cls.subjectName,
            alreadyPaid: !!existing,
            paymentId: existing?._id,
          });
        }
      }
    }

    gaps.sort((a, b) => a.period - b.period);

    // Deduplicar por (professor, período, turma) — evita duplicatas de registros repetidos no banco
    const seen = new Set<string>();
    const uniqueGaps = gaps.filter(gap => {
      const key = `${gap.absentTeacherId}-${gap.period}-${gap.classId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({ date, gaps: uniqueGaps });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /  — criar pagamento manualmente
// ─────────────────────────────────────────────
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const {
      date, period, startTime, endTime,
      absentTeacherId, absentTeacherName,
      substituteTeacherId, substituteTeacherName,
      classId, className, subjectId, subjectName,
      status, notes,
    } = req.body;

    if (!date || !period || !absentTeacherId || !classId) {
      return res.status(400).json({ message: 'Campos obrigatórios: date, period, absentTeacherId, classId' });
    }

    const payment = new ClassPayment({
      schoolId,
      date, period, startTime, endTime,
      absentTeacherId, absentTeacherName,
      substituteTeacherId: substituteTeacherId || '',
      substituteTeacherName: substituteTeacherName || '',
      classId, className,
      subjectId: subjectId || '',
      subjectName: subjectName || '',
      status: status || 'paid',
      notes: notes || '',
      createdBy: req.user!.id,
      filledAt: new Date(),
      schoolYear: date ? new Date(date).getFullYear() : new Date().getFullYear(),
    });

    await payment.save();

    // Sincronizar com TeacherAttendance quando criado como pago
    if (payment.status === 'paid' || payment.status === 'filled') {
      try {
        const attend = await TeacherAttendance.findOne({
          schoolId,
          teacherId: payment.absentTeacherId,
          date: payment.date,
        });
        if (attend) {
          const ci = (attend.classes as any[]).findIndex(
            (c: any) => c.period === payment.period && c.classId === payment.classId
          );
          if (ci !== -1) {
            (attend.classes[ci] as any).paidAt = new Date();
            (attend.classes[ci] as any).classPaymentId = payment._id.toString();
            await attend.save();
          }
        }
      } catch (_syncErr) {
        // Não bloquear a resposta por erro na sincronização
      }
    }

    res.status(201).json(payment);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// PATCH /:id/status  — atualizar status (pending → paid)
// ─────────────────────────────────────────────
router.patch('/:id/status', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { status } = req.body;
    const payment = await ClassPayment.findOneAndUpdate(
      { _id: req.params.id, schoolId },
      { status },
      { new: true }
    );
    if (!payment) return res.status(404).json({ message: 'Registro não encontrado' });

    // Sincronizar com TeacherAttendance: marcar a aula como paga
    if (status === 'paid' || status === 'filled') {
      try {
        const attend = await TeacherAttendance.findOne({
          schoolId,
          teacherId: payment.absentTeacherId,
          date: payment.date,
        });
        if (attend) {
          const ci = (attend.classes as any[]).findIndex(
            (c: any) => c.period === payment.period && c.classId === payment.classId
          );
          if (ci !== -1) {
            (attend.classes[ci] as any).paidAt = new Date();
            (attend.classes[ci] as any).classPaymentId = payment._id.toString();
            await attend.save();
          }
        }
      } catch (_syncErr) {
        // Não bloquear a resposta por erro na sincronização
      }
    }

    res.json(payment);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /:id
// ─────────────────────────────────────────────
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const payment = await ClassPayment.findOneAndDelete({ _id: req.params.id, schoolId });
    if (!payment) return res.status(404).json({ message: 'Registro não encontrado' });
    res.json({ message: 'Excluído com sucesso' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
