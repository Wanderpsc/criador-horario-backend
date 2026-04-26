/**
 * Rotas para Gerenciamento de Ano Letivo
 * © 2025 Wander Pires Silva Coelho
 */

import express from 'express';
import { auth, AuthRequest } from '../middleware/auth';
import TeacherSubject from '../models/TeacherSubject';
import TeacherAttendance from '../models/TeacherAttendance';
import ClassPayment from '../models/ClassPayment';
import MakeupSaturday from '../models/MakeupSaturday';
import SchoolDay from '../models/SchoolDay';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/school-years — listar anos letivos com dados disponíveis
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;

    // Obter anos distintos de cada coleção
    const [taYears, cpYears, tsYears, sdYears, msYears] = await Promise.all([
      TeacherAttendance.distinct('schoolYear', { schoolId, schoolYear: { $exists: true, $ne: null } }),
      ClassPayment.distinct('schoolYear', { schoolId, schoolYear: { $exists: true, $ne: null } }),
      TeacherSubject.distinct('schoolYear', { schoolId, schoolYear: { $exists: true, $ne: null } }),
      SchoolDay.distinct('schoolYear', { schoolId, schoolYear: { $exists: true, $ne: null } }),
      MakeupSaturday.distinct('schoolYear', { schoolId, schoolYear: { $exists: true, $ne: null } }),
    ]);

    const allYears = new Set<number>([
      ...taYears, ...cpYears, ...tsYears, ...sdYears, ...msYears
    ].map(Number).filter(y => y > 2000 && y < 2100));

    const yearsArray = Array.from(allYears).sort((a, b) => b - a); // mais recente primeiro

    // Montar estatísticas por ano
    const yearsWithStats = await Promise.all(
      yearsArray.map(async (year) => {
        const [attendanceCount, paymentCount, workloadCount, schoolDayCount] = await Promise.all([
          TeacherAttendance.countDocuments({ schoolId, schoolYear: year }),
          ClassPayment.countDocuments({ schoolId, schoolYear: year }),
          TeacherSubject.countDocuments({ schoolId: { $in: [schoolId] }, schoolYear: year }),
          SchoolDay.countDocuments({ schoolId, schoolYear: year }),
        ]);
        return {
          year,
          attendanceCount,
          paymentCount,
          workloadCount,
          schoolDayCount,
        };
      })
    );

    res.json({ success: true, data: yearsWithStats });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/school-years/new — iniciar novo ano letivo
// Body: { year: number, copyFromYear?: number, copyWorkload?: boolean }
//
// Copia os registros de TeacherSubject (lotação docente) do ano anterior para o
// novo ano se copyWorkload=true (padrão: true).
// NÃO copia: TeacherAttendance, ClassPayment, MakeupSaturday, SchoolDay.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/new', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { year, copyFromYear, copyWorkload = true } = req.body;

    if (!year || isNaN(Number(year))) {
      return res.status(400).json({ message: 'Informe o ano letivo (ex: 2027)' });
    }

    const newYear = Number(year);
    const sourceYear = copyFromYear ? Number(copyFromYear) : newYear - 1;

    // Verificar se já existem dados no novo ano
    const existingCount = await TeacherSubject.countDocuments({
      schoolId: { $in: [schoolId] },
      schoolYear: newYear,
    });

    if (existingCount > 0) {
      return res.status(409).json({
        message: `O ano letivo ${newYear} já possui ${existingCount} lotação(ões) cadastrada(s). Use a página de Lotação Docente para gerenciar.`,
        existingCount,
      });
    }

    let copiedWorkload = 0;

    if (copyWorkload) {
      // Buscar lotações do ano anterior
      const sourceWorkload = await TeacherSubject.find({
        schoolId: { $in: [schoolId] },
        schoolYear: sourceYear,
      }).lean();

      if (sourceWorkload.length === 0) {
        return res.status(404).json({
          message: `Nenhuma lotação encontrada no ano letivo ${sourceYear} para copiar.`,
        });
      }

      // Criar cópias para o novo ano (sem _id, sem timestamps antigos)
      const copies = sourceWorkload.map((ts: any) => ({
        teacherId: ts.teacherId,
        subjectId: ts.subjectId,
        classId: ts.classId,
        weeklyHours: ts.weeklyHours,
        schoolId: ts.schoolId,
        userId: ts.userId,
        schoolYear: newYear,
      }));

      const result = await TeacherSubject.insertMany(copies, { ordered: false });
      copiedWorkload = result.length;
    }

    res.status(201).json({
      success: true,
      message: `Ano letivo ${newYear} iniciado com sucesso!`,
      newYear,
      copiedWorkload,
      sourceYear: copyWorkload ? sourceYear : null,
    });
  } catch (err: any) {
    if (err.code === 11000) {
      // Duplicatas parciais — retornar OK com aviso
      return res.status(200).json({
        success: true,
        message: 'Algumas lotações já existiam no novo ano (duplicatas ignoradas).',
      });
    }
    res.status(500).json({ message: err.message });
  }
});

export default router;
