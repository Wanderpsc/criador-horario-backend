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
    const { startDate, endDate, month, year } = req.query;

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
    res.json({ date, gaps });
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
    });

    await payment.save();
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
