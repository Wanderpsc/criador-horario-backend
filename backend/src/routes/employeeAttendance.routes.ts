/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Rotas: Ponto / Frequência de Funcionários
 */
import express from 'express';
import mongoose from 'mongoose';
import EmployeeAttendance from '../models/EmployeeAttendance';
import Employee from '../models/Employee';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();
const isValidId = (id: string) => mongoose.isValidObjectId(id);

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function calcDerived(data: any) {
  const { entryTime, exitTime, expectedEntryTime, expectedExitTime, isPlantao, plantaoStart, plantaoEnd } = data;

  let workedMinutes = 0;
  let expectedMinutes = 0;
  let overtimeMinutes = 0;
  let earlyDepartureMinutes = 0;
  let lateArrivalMinutes = 0;

  if (isPlantao && plantaoStart && plantaoEnd) {
    workedMinutes = timeToMinutes(plantaoEnd) - timeToMinutes(plantaoStart);
  } else if (entryTime && exitTime) {
    workedMinutes = timeToMinutes(exitTime) - timeToMinutes(entryTime);
  }

  if (expectedEntryTime && expectedExitTime) {
    expectedMinutes = timeToMinutes(expectedExitTime) - timeToMinutes(expectedEntryTime);
  }

  if (entryTime && expectedEntryTime) {
    const diff = timeToMinutes(entryTime) - timeToMinutes(expectedEntryTime);
    lateArrivalMinutes = diff > 0 ? diff : 0;
  }

  if (exitTime && expectedExitTime) {
    const diff = timeToMinutes(expectedExitTime) - timeToMinutes(exitTime);
    earlyDepartureMinutes = diff > 0 ? diff : 0;
  }

  if (workedMinutes > expectedMinutes && expectedMinutes > 0) {
    overtimeMinutes = workedMinutes - expectedMinutes;
  }

  return { workedMinutes, expectedMinutes, overtimeMinutes, earlyDepartureMinutes, lateArrivalMinutes };
}

// ── GET / — listar registros por data ou período ──────────────────────────────
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { date, startDate, endDate, employeeId, status, setor } = req.query;

    const filter: any = { schoolId };
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;
    if (setor) filter.setor = setor;

    if (date) {
      filter.date = date;
    } else if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const records = await EmployeeAttendance.find(filter).sort({ date: -1, employeeName: 1 });
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /bulk — registrar ponto de múltiplos funcionários em um dia ──────────
router.post('/bulk', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { date, records } = req.body;

    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ message: 'Data e registros são obrigatórios.' });
    }

    const dayOfWeek = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' });
    const results = [];

    for (const rec of records) {
      const derived = calcDerived(rec);
      const update = {
        ...rec,
        schoolId,
        date,
        dayOfWeek,
        ...derived,
      };
      const doc = await EmployeeAttendance.findOneAndUpdate(
        { schoolId, employeeId: rec.employeeId, date },
        { $set: update },
        { upsert: true, new: true, runValidators: true }
      );
      results.push(doc);
    }

    res.json({ saved: results.length, records: results });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST / — registrar ponto individual ──────────────────────────────────────
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const derived = calcDerived(req.body);
    const date = req.body.date;
    const dayOfWeek = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' });

    const doc = await EmployeeAttendance.findOneAndUpdate(
      { schoolId, employeeId: req.body.employeeId, date },
      { $set: { ...req.body, schoolId, dayOfWeek, ...derived } },
      { upsert: true, new: true, runValidators: true }
    );
    res.status(201).json(doc);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /:id — atualizar registro ─────────────────────────────────────────────
router.put('/:id', auth, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const schoolId = req.user!.schoolId || req.user!.id;
    const derived = calcDerived(req.body);

    const doc = await EmployeeAttendance.findOneAndUpdate(
      { _id: req.params.id, schoolId },
      { $set: { ...req.body, ...derived } },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ message: 'Registro não encontrado.' });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /:id/rectify — retificação administrativa (somente role 'school') ──────
router.put('/:id/rectify', auth, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });

    // Apenas administrador da escola pode retificar
    if (req.user!.role !== 'school') {
      return res.status(403).json({ message: 'Acesso negado. Somente o administrador pode retificar registros de ponto.' });
    }

    const schoolId = req.user!.schoolId || req.user!.id;
    const { entryTime, exitTime, status, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'O motivo da retificação é obrigatório.' });
    }

    const doc = await EmployeeAttendance.findOne({ _id: req.params.id, schoolId });
    if (!doc) return res.status(404).json({ message: 'Registro não encontrado.' });

    // Guardar valores originais antes de alterar
    const rectEntry = {
      rectifiedBy:       req.user!.id,
      rectifiedByName:   (req.user as any).name || (req.user as any).schoolName || 'Administrador',
      rectifiedAt:       new Date(),
      reason:            reason.trim(),
      originalEntryTime: doc.entryTime,
      originalExitTime:  doc.exitTime,
      originalStatus:    doc.status,
    };

    // Atualizar campos solicitados
    if (entryTime !== undefined) doc.entryTime = entryTime;
    if (exitTime  !== undefined) doc.exitTime  = exitTime;
    if (status    !== undefined) doc.status    = status;

    // Recalcular derivados
    const derived = calcDerived({ ...doc.toObject(), entryTime: doc.entryTime, exitTime: doc.exitTime });
    Object.assign(doc, derived);

    // Anexar histórico
    if (!doc.rectifications) (doc as any).rectifications = [];
    (doc as any).rectifications.push(rectEntry);

    await doc.save();
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const schoolId = req.user!.schoolId || req.user!.id;
    const doc = await EmployeeAttendance.findOneAndDelete({ _id: req.params.id, schoolId });
    if (!doc) return res.status(404).json({ message: 'Registro não encontrado.' });
    res.json({ message: 'Deletado com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /report — sumário por funcionário em período ─────────────────────────
router.get('/report', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { startDate, endDate, employeeId } = req.query;

    const filter: any = { schoolId };
    if (employeeId) filter.employeeId = employeeId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const records = await EmployeeAttendance.find(filter).sort({ employeeName: 1, date: 1 });

    // Agrupar por funcionário
    const byEmployee: Record<string, any> = {};
    for (const r of records) {
      if (!byEmployee[r.employeeId]) {
        byEmployee[r.employeeId] = {
          employeeId: r.employeeId,
          employeeName: r.employeeName,
          cargo: r.cargo,
          setor: r.setor,
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          partialDays: 0,
          medicalLeaveDays: 0,
          vacationDays: 0,
          justifiedDays: 0,
          totalWorkedMinutes: 0,
          totalExpectedMinutes: 0,
          totalOvertimeMinutes: 0,
          totalEarlyDepartureMinutes: 0,
          totalLateArrivalMinutes: 0,
          absenceDates: [],
          records: [],
        };
      }
      const e = byEmployee[r.employeeId];
      e.totalDays++;
      e.totalWorkedMinutes += r.workedMinutes || 0;
      e.totalExpectedMinutes += r.expectedMinutes || 0;
      e.totalOvertimeMinutes += r.overtimeMinutes || 0;
      e.totalEarlyDepartureMinutes += r.earlyDepartureMinutes || 0;
      e.totalLateArrivalMinutes += r.lateArrivalMinutes || 0;
      if (r.status === 'present') e.presentDays++;
      else if (r.status === 'absent') { e.absentDays++; e.absenceDates.push(r.date); }
      else if (r.status === 'partial') e.partialDays++;
      else if (r.status === 'medical_leave') e.medicalLeaveDays++;
      else if (r.status === 'vacation') e.vacationDays++;
      else if (r.status === 'justified') e.justifiedDays++;
      e.records.push(r);
    }

    res.json(Object.values(byEmployee));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /init-day — buscar funcionários e pré-carregar ponto do dia ───────────
router.get('/init-day', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Data obrigatória.' });

    const [employees, existingRecords] = await Promise.all([
      Employee.find({ schoolId, isActive: true }).sort({ name: 1 }),
      EmployeeAttendance.find({ schoolId, date: date as string }),
    ]);

    // Determinar o dia da semana para a data pedida
    const dateObj = new Date(date as string + 'T12:00:00');
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayNames[dateObj.getDay()];

    const recordMap = new Map(existingRecords.map(r => [r.employeeId, r]));

    const rows = employees.map(emp => {
      const existing = recordMap.get(emp._id.toString());
      if (existing) return existing;

      const ws = (emp as any).workSchedule;
      // Usa workSchedule se o dia estiver na escala
      const hasWorkToday = ws?.workDays?.includes(dayKey);
      const expectedEntryTime = hasWorkToday && ws?.entryTime ? ws.entryTime : '';
      const expectedExitTime  = hasWorkToday && ws?.exitTime  ? ws.exitTime  : '';

      return {
        employeeId: emp._id.toString(),
        employeeName: emp.name,
        cargo: emp.cargo,
        setor: emp.setor,
        date,
        status: null,
        shift: emp.jornadaTrabalho?.toLowerCase().includes('manhã') ? 'manha' :
               emp.jornadaTrabalho?.toLowerCase().includes('tarde') ? 'tarde' :
               emp.jornadaTrabalho?.toLowerCase().includes('noturno') ? 'noturno' : 'integral',
        expectedEntryTime,
        expectedExitTime,
        toleranceMinutes: ws?.toleranceMinutes ?? 10,
        workDays: ws?.workDays || ['monday','tuesday','wednesday','thursday','friday'],
        shiftType: (ws as any)?.shiftType || 'single',
        expectedEntryTime2: hasWorkToday && (ws as any)?.shift2EntryTime ? (ws as any).shift2EntryTime : '',
        expectedExitTime2:  hasWorkToday && (ws as any)?.shift2ExitTime  ? (ws as any).shift2ExitTime  : '',
        expectedEntryTime3: hasWorkToday && (ws as any)?.shift3EntryTime ? (ws as any).shift3EntryTime : '',
        expectedExitTime3:  hasWorkToday && (ws as any)?.shift3ExitTime  ? (ws as any).shift3ExitTime  : '',
        entryTime: '',
        exitTime: '',
        entryTime2: '',
        exitTime2: '',
        entryTime3: '',
        exitTime3: '',
      };
    });

    res.json({ rows, date });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /update-schedule/:employeeId — salvar horário de plantão na ficha ──────
router.put('/update-schedule/:employeeId', auth, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.employeeId)) return res.status(400).json({ message: 'ID inválido.' });
    const schoolId = req.user!.schoolId || req.user!.id;
    const { entryTime, exitTime, workDays, toleranceMinutes, shiftType,
             shift2EntryTime, shift2ExitTime, shift3EntryTime, shift3ExitTime } = req.body;

    const emp = await Employee.findOneAndUpdate(
      { _id: req.params.employeeId, schoolId },
      { $set: {
        'workSchedule.entryTime': entryTime || '',
        'workSchedule.exitTime': exitTime || '',
        'workSchedule.workDays': Array.isArray(workDays) ? workDays : ['monday','tuesday','wednesday','thursday','friday'],
        'workSchedule.toleranceMinutes': toleranceMinutes != null ? Number(toleranceMinutes) : 10,
        'workSchedule.shiftType': shiftType || 'single',
        'workSchedule.shift2EntryTime': shift2EntryTime || '',
        'workSchedule.shift2ExitTime': shift2ExitTime || '',
        'workSchedule.shift3EntryTime': shift3EntryTime || '',
        'workSchedule.shift3ExitTime': shift3ExitTime || '',
      }},
      { new: true }
    );
    if (!emp) return res.status(404).json({ message: 'Funcionário não encontrado.' });
    res.json({ message: 'Horário de plantão salvo com sucesso.', workSchedule: (emp as any).workSchedule });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /report-late — registros com atraso no período ───────────────────────
router.get('/report-late', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { startDate, endDate } = req.query;
    const filter: any = { schoolId, lateArrivalMinutes: { $gt: 0 } };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate)   filter.date.$lte = endDate;
    }
    const records = await EmployeeAttendance.find(filter).sort({ date: -1, employeeName: 1 });
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /mark-notification — marcar notificação como gerada ──────────────────
router.post('/mark-notification', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ message: 'IDs obrigatórios.' });

    await EmployeeAttendance.updateMany(
      { _id: { $in: ids }, schoolId },
      { $set: { notificationGenerated: true, notificationDate: new Date() } }
    );
    res.json({ updated: ids.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
