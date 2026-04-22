import express from 'express';
import crypto from 'crypto';
import SubstituteLink from '../models/SubstituteLink';
import ClassPayment from '../models/ClassPayment';
import TeacherAttendance from '../models/TeacherAttendance';
import TeacherDebtRecord from '../models/TeacherDebtRecord';
import User from '../models/User';
import Teacher from '../models/Teacher';
import Subject from '../models/Subject';
import Class from '../models/Class';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ─────────────────────────────────────────────
// POST /  — gerar link para uma data (auth)
// ─────────────────────────────────────────────
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { date } = req.body;
    if (!date) return res.status(400).json({ message: 'date é obrigatório (YYYY-MM-DD)' });

    // Buscar escola para nome
    const schoolUser = await User.findById(schoolId).select('schoolName name');
    const schoolName = (schoolUser as any)?.schoolName || (schoolUser as any)?.name || '';

    // Buscar ausências do dia
    const records = await TeacherAttendance.find({ schoolId, date });

    const slots: any[] = [];
    const seenSlots = new Set<string>();
    for (const rec of records) {
      for (const cls of rec.classes) {
        if (cls.status === 'absent') {
          // Chave única para evitar duplicatas (mesmo período + professor ausente + turma)
          const key = `${cls.period}|${rec.teacherId}|${cls.classId}`;
          if (seenSlots.has(key)) continue;
          seenSlots.add(key);
          slots.push({
            period: cls.period,
            startTime: cls.startTime,
            endTime: cls.endTime,
            absentTeacherId: rec.teacherId,
            absentTeacherName: rec.teacherName,
            classId: cls.classId,
            className: cls.className,
            subjectId: cls.subjectId,
            subjectName: cls.subjectName,
            isFilled: false,
            filledBy: '',
            filledTeacherId: '',
          });
        }
      }
    }

    slots.sort((a, b) => a.period - b.period);

    if (slots.length === 0) {
      return res.status(400).json({
        message: 'Não há ausências registradas para esta data. Registre as presenças/ausências primeiro.',
      });
    }

    const dateObj = new Date(date + 'T12:00:00');
    const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const dateLabel = `${weekdays[dateObj.getDay()]}, ${dateObj.toLocaleDateString('pt-BR')}`;

    const token = crypto.randomBytes(20).toString('hex');
    const link = new SubstituteLink({
      token,
      schoolId,
      schoolName,
      date,
      dateLabel,
      slots,
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: req.user!.id,
    });

    await link.save();
    res.status(201).json(link);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /  — listar links gerados pela escola (auth)
// ─────────────────────────────────────────────
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const links = await SubstituteLink.find({ schoolId }).sort({ createdAt: -1 }).limit(50);
    res.json(links);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /public/:token  — exibir link para professor (sem auth)
// ─────────────────────────────────────────────
router.get('/public/:token', async (req, res) => {
  try {
    const link = await SubstituteLink.findOne({ token: req.params.token });
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });
    if (!link.isActive) return res.status(410).json({ message: 'Este link foi desativado.' });
    if (link.expiresAt < new Date()) return res.status(410).json({ message: 'Este link expirou.' });

    // Auto-refresh: re-sincronizar slots com ausências atuais antes de retornar
    // Garante que professores marcados ausentes DEPOIS da geração do link apareçam
    try {
      const records = await TeacherAttendance.find({ schoolId: link.schoolId, date: link.date });
      if (records.length > 0) {
        const seenSlots = new Set<string>();
        const freshSlots: any[] = [];

        for (const rec of records) {
          for (const cls of rec.classes) {
            if (cls.status === 'absent') {
              const key = `${cls.period}|${rec.teacherId}|${cls.classId}`;
              if (seenSlots.has(key)) continue;
              seenSlots.add(key);

              // Preservar estado de preenchimento se já existia
              const existing = (link.slots as any[]).find(
                (s: any) =>
                  s.period === cls.period &&
                  s.absentTeacherId?.toString() === rec.teacherId?.toString() &&
                  s.classId?.toString() === cls.classId?.toString()
              );

              freshSlots.push({
                period: cls.period,
                startTime: cls.startTime,
                endTime: cls.endTime,
                absentTeacherId: rec.teacherId,
                absentTeacherName: rec.teacherName,
                classId: cls.classId,
                className: cls.className,
                subjectId: cls.subjectId,
                subjectName: cls.subjectName,
                isFilled: existing?.isFilled || false,
                filledBy: existing?.filledBy || '',
                filledTeacherId: existing?.filledTeacherId || '',
                filledAt: existing?.filledAt,
              });
            }
          }
        }

        freshSlots.sort((a, b) => a.period - b.period);
        link.slots = freshSlots;
        await link.save();
      }
    } catch (_) {
      // Se o auto-refresh falhar, retorna os slots existentes sem interromper
    }

    // Enriquecer com lista de professores da escola para o formulário
    const teachers = await Teacher.find({ schoolId: link.schoolId, isActive: true })
      .select('_id name').lean();
    const subjects = await Subject.find({ schoolId: link.schoolId })
      .select('_id name').lean();
    const classes = await Class.find({ userId: link.schoolId })
      .select('_id name').lean();

    res.json({ link, teachers, subjects, classes });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /public/:token/debts/:teacherId — buscar débitos do professor (sem auth)
// ─────────────────────────────────────────────
router.get('/public/:token/debts/:teacherId', async (req, res) => {
  try {
    const link = await SubstituteLink.findOne({ token: req.params.token });
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });
    if (!link.isActive) return res.status(410).json({ message: 'Este link foi desativado.' });

    const debts = await TeacherDebtRecord.find({
      teacherId: req.params.teacherId,
      isPaid: false,
    }).lean();

    // Enriquecer com nomes
    const classIds = [...new Set(debts.map(d => d.classId))];
    const subjectIds = [...new Set(debts.map(d => d.subjectId))];
    const classesData = await Class.find({ _id: { $in: classIds } }).select('_id name').lean();
    const subjectsData = await Subject.find({ _id: { $in: subjectIds } }).select('_id name').lean();
    const classNameMap = new Map(classesData.map((c: any) => [c._id.toString(), c.name]));
    const subjectNameMap = new Map(subjectsData.map((s: any) => [s._id.toString(), s.name]));

    const enriched = debts.map(d => ({
      _id: d._id,
      classId: d.classId,
      className: classNameMap.get(d.classId) || d.classId,
      subjectId: d.subjectId,
      subjectName: subjectNameMap.get(d.subjectId) || d.subjectId,
      hoursOwed: d.hoursOwed,
      hoursPaid: d.hoursPaid,
      remaining: d.hoursOwed - (d.hoursPaid || 0),
      absenceDate: d.absenceDate,
    }));

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /public/:token/fill  — professor preenche lacuna (sem auth)
// ─────────────────────────────────────────────
router.post('/public/:token/fill', async (req, res) => {
  try {
    const {
      slotId,
      teacherName,
      teacherId,
      subjectId,
      subjectName,
      classId,
      className,
      // Tipo de preenchimento: 'reposicao' | 'adiantamento'
      fillType,
      // Se reposição: ID do TeacherDebtRecord a ser abatido
      debtRecordId,
    } = req.body;

    if (!slotId || !teacherName?.trim()) {
      return res.status(400).json({ message: 'slotId e teacherName são obrigatórios.' });
    }
    if (!fillType || !['reposicao', 'adiantamento'].includes(fillType)) {
      return res.status(400).json({ message: 'fillType deve ser "reposicao" ou "adiantamento".' });
    }

    const link = await SubstituteLink.findOne({ token: req.params.token });
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });
    if (!link.isActive) return res.status(410).json({ message: 'Este link foi desativado.' });
    if (link.expiresAt < new Date()) return res.status(410).json({ message: 'Este link expirou.' });

    const slot = (link.slots as any[]).find((s: any) => s._id?.toString() === slotId);
    if (!slot) return res.status(404).json({ message: 'Lacuna não encontrada.' });
    if (slot.isFilled) return res.status(409).json({ message: 'Esta lacuna já foi preenchida.' });

    // Marcar slot como preenchido
    slot.isFilled = true;
    slot.filledBy = teacherName.trim();
    slot.filledTeacherId = teacherId || '';
    slot.filledAt = new Date();
    await link.save();

    // Abater no TeacherDebtRecord se for reposição
    let debtRecord: any = null;
    if (fillType === 'reposicao' && debtRecordId) {
      debtRecord = await TeacherDebtRecord.findById(debtRecordId);
      if (debtRecord) {
        debtRecord.hoursPaid = (debtRecord.hoursPaid || 0) + 1;
        if (debtRecord.hoursPaid >= debtRecord.hoursOwed) {
          debtRecord.isPaid = true;
          if (!debtRecord.paidDates) debtRecord.paidDates = [];
          debtRecord.paidDates.push(new Date());
        }
        await debtRecord.save();
      }
    }

    // Criar ClassPayment
    const payment = new ClassPayment({
      schoolId: link.schoolId,
      date: link.date,
      period: slot.period,
      startTime: slot.startTime,
      endTime: slot.endTime,
      absentTeacherId: slot.absentTeacherId,
      absentTeacherName: slot.absentTeacherName,
      substituteTeacherId: teacherId || '',
      substituteTeacherName: teacherName.trim(),
      classId: classId || slot.classId,
      className: className || slot.className,
      subjectId: subjectId || slot.subjectId,
      subjectName: subjectName || slot.subjectName,
      filledViaLink: true,
      substituteToken: link.token,
      status: fillType === 'adiantamento' ? 'paid' : 'filled',
      notes: fillType === 'adiantamento'
        ? `Adiantamento de aula — Prof. ${teacherName.trim()}`
        : `Reposição — ${debtRecord ? `Abatido débito de ${debtRecord.absenceDate?.toISOString?.().split?.('T')?.[0] || ''}` : ''}`,
      filledAt: new Date(),
    });
    await payment.save();

    res.json({
      message: fillType === 'adiantamento'
        ? 'Adiantamento registrado! Será contabilizado como saldo no relatório.'
        : 'Reposição registrada com sucesso! O déficit foi abatido.',
      payment,
      debtDeducted: !!debtRecord,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// PUT /:id/refresh  — re-sincronizar slots com ausências atuais (auth)
// ─────────────────────────────────────────────
router.put('/:id/refresh', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const link = await SubstituteLink.findOne({ _id: req.params.id, schoolId });
    if (!link) return res.status(404).json({ message: 'Link não encontrado' });
    if (!link.isActive) return res.status(400).json({ message: 'Link inativo não pode ser atualizado' });

    // Re-buscar ausências do dia
    const records = await TeacherAttendance.find({ schoolId, date: link.date });

    const seenSlots = new Set<string>();
    const freshSlots: any[] = [];

    for (const rec of records) {
      for (const cls of rec.classes) {
        if (cls.status === 'absent') {
          const key = `${cls.period}|${rec.teacherId}|${cls.classId}`;
          if (seenSlots.has(key)) continue;
          seenSlots.add(key);

          // Verificar se já existe um slot preenchido para esta entrada
          const existing = (link.slots as any[]).find(
            (s: any) =>
              s.period === cls.period &&
              s.absentTeacherId?.toString() === rec.teacherId?.toString() &&
              s.classId?.toString() === cls.classId?.toString()
          );

          freshSlots.push({
            period: cls.period,
            startTime: cls.startTime,
            endTime: cls.endTime,
            absentTeacherId: rec.teacherId,
            absentTeacherName: rec.teacherName,
            classId: cls.classId,
            className: cls.className,
            subjectId: cls.subjectId,
            subjectName: cls.subjectName,
            isFilled: existing?.isFilled || false,
            filledBy: existing?.filledBy || '',
            filledTeacherId: existing?.filledTeacherId || '',
            filledAt: existing?.filledAt,
          });
        }
      }
    }

    freshSlots.sort((a, b) => a.period - b.period);
    link.slots = freshSlots;
    await link.save();

    res.json({ message: 'Link atualizado com as ausências atuais.', link });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /:id  — desativar link (auth)
// ─────────────────────────────────────────────
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const link = await SubstituteLink.findOneAndUpdate(
      { _id: req.params.id, schoolId },
      { isActive: false },
      { new: true }
    );
    if (!link) return res.status(404).json({ message: 'Link não encontrado' });
    res.json({ message: 'Link desativado.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
