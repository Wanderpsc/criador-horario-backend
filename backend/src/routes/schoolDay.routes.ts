/**
 * Rotas para Dias Letivos
 * © 2025 Wander Pires Silva Coelho
 */

import express, { Request, Response } from 'express';
import SchoolDay from '../models/SchoolDay';
import Schedule from '../models/Schedule';
import { auth } from '../middleware/auth';

const router = express.Router();

// GET /api/schooldays/school/:schoolId - Obter todos os dias letivos de uma escola
router.get('/school/:schoolId', auth, async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { startDate, endDate } = req.query;

    let query: any = { schoolId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const schoolDays = await SchoolDay.find(query).sort({ date: 1 });

    // Popular os schedules
    const schoolDaysWithSchedules = await Promise.all(
      schoolDays.map(async (day) => {
        const dayObj = day.toObject();
        if (dayObj.scheduleId) {
          const schedule = await Schedule.findById(dayObj.scheduleId);
          return {
            ...dayObj,
            id: dayObj._id.toString(),
            date: dayObj.date.toISOString().split('T')[0],
            schedule: schedule ? { id: schedule._id.toString(), name: schedule.name } : null
          };
        }
        return {
          ...dayObj,
          id: dayObj._id.toString(),
          date: dayObj.date.toISOString().split('T')[0]
        };
      })
    );

    res.json({ data: schoolDaysWithSchedules });
  } catch (error: any) {
    console.error('Erro ao buscar dias letivos:', error);
    res.status(500).json({ message: 'Erro ao buscar dias letivos', error: error.message });
  }
});

// GET /api/schooldays/school/:schoolId/statistics - Obter estatísticas
router.get('/school/:schoolId/statistics', auth, async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { startDate, endDate } = req.query;

    let query: any = { schoolId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const schoolDays = await SchoolDay.find(query);

    const statistics = {
      totalDays: schoolDays.length,
      completedDays: schoolDays.filter((d) => d.isCompleted).length,
      pendingDays: schoolDays.filter((d) => !d.isCompleted).length,
      regularDays: schoolDays.filter((d) => d.dayType === 'regular').length,
      saturdayDays: schoolDays.filter((d) => d.dayType === 'saturday').length,
      holidays: schoolDays.filter((d) => d.dayType === 'holiday').length,
      recessDays: schoolDays.filter((d) => d.dayType === 'recess').length
    };

    res.json({ data: statistics });
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro ao buscar estatísticas', error: error.message });
  }
});

// GET /api/schooldays/:id - Obter um dia letivo específico
router.get('/:id', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const schoolDay = await SchoolDay.findById(id);

    if (!schoolDay) {
      return res.status(404).json({ message: 'Dia letivo não encontrado' });
    }

    const dayObj = schoolDay.toObject();
    let schedule = null;

    if (dayObj.scheduleId) {
      schedule = await Schedule.findById(dayObj.scheduleId);
    }

    res.json({
      data: {
        ...dayObj,
        id: dayObj._id.toString(),
        date: dayObj.date.toISOString().split('T')[0],
        schedule: schedule ? { id: schedule._id.toString(), name: schedule.name } : null
      }
    });
  } catch (error: any) {
    console.error('Erro ao buscar dia letivo:', error);
    res.status(500).json({ message: 'Erro ao buscar dia letivo', error: error.message });
  }
});

// POST /api/schooldays - Criar um novo dia letivo
router.post('/', auth, async (req: Request, res: Response) => {
  try {
    const { schoolId, date, dayType, scheduleId, notes, followWeekday } = req.body;

    // Verificar se já existe um dia letivo para esta data
    const existingDay = await SchoolDay.findOne({
      schoolId,
      date: new Date(date)
    });

    if (existingDay) {
      return res.status(400).json({ message: 'Já existe um dia letivo cadastrado para esta data' });
    }

    const schoolDay = new SchoolDay({
      schoolId,
      date: new Date(date),
      dayType,
      scheduleId: scheduleId || undefined,
      notes: notes || undefined,
      followWeekday: followWeekday || undefined,
      isCompleted: false
    });

    await schoolDay.save();

    const dayObj = schoolDay.toObject();
    res.status(201).json({
      data: {
        ...dayObj,
        id: dayObj._id.toString(),
        date: dayObj.date.toISOString().split('T')[0]
      }
    });
  } catch (error: any) {
    console.error('Erro ao criar dia letivo:', error);
    res.status(500).json({ message: 'Erro ao criar dia letivo', error: error.message });
  }
});

// POST /api/schooldays/bulk - Criar múltiplos dias letivos
router.post('/bulk', auth, async (req: Request, res: Response) => {
  try {
    const { schoolId, days } = req.body;

    const schoolDays = await Promise.all(
      days.map(async (day: any) => {
        const existingDay = await SchoolDay.findOne({
          schoolId,
          date: new Date(day.date)
        });

        if (existingDay) {
          return null;
        }

        return new SchoolDay({
          schoolId,
          date: new Date(day.date),
          dayType: day.dayType,
          scheduleId: day.scheduleId || undefined,
          notes: day.notes || undefined,
          followWeekday: day.followWeekday || undefined,
          isCompleted: false
        });
      })
    );

    const validDays = schoolDays.filter((d) => d !== null);
    await SchoolDay.insertMany(validDays);

    res.status(201).json({
      message: `${validDays.length} dias letivos criados com sucesso`,
      data: validDays
    });
  } catch (error: any) {
    console.error('Erro ao criar dias letivos em massa:', error);
    res.status(500).json({ message: 'Erro ao criar dias letivos em massa', error: error.message });
  }
});

// PUT /api/schooldays/:id - Atualizar um dia letivo
router.put('/:id', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dayType, scheduleId, notes, followWeekday, isCompleted } = req.body;

    const schoolDay = await SchoolDay.findById(id);

    if (!schoolDay) {
      return res.status(404).json({ message: 'Dia letivo não encontrado' });
    }

    if (dayType !== undefined) schoolDay.dayType = dayType;
    if (scheduleId !== undefined) schoolDay.scheduleId = scheduleId;
    if (notes !== undefined) schoolDay.notes = notes;
    if (followWeekday !== undefined) schoolDay.followWeekday = followWeekday;
    if (isCompleted !== undefined) schoolDay.isCompleted = isCompleted;

    // Se mudou para tipo diferente de saturday, remover followWeekday
    if (dayType && dayType !== 'saturday') {
      schoolDay.followWeekday = undefined;
    }

    await schoolDay.save();

    const dayObj = schoolDay.toObject();
    res.json({
      data: {
        ...dayObj,
        id: dayObj._id.toString(),
        date: dayObj.date.toISOString().split('T')[0]
      }
    });
  } catch (error: any) {
    console.error('Erro ao atualizar dia letivo:', error);
    res.status(500).json({ message: 'Erro ao atualizar dia letivo', error: error.message });
  }
});

// DELETE /api/schooldays/:id - Deletar um dia letivo
router.delete('/:id', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const schoolDay = await SchoolDay.findByIdAndDelete(id);

    if (!schoolDay) {
      return res.status(404).json({ message: 'Dia letivo não encontrado' });
    }

    res.json({ message: 'Dia letivo deletado com sucesso' });
  } catch (error: any) {
    console.error('Erro ao deletar dia letivo:', error);
    res.status(500).json({ message: 'Erro ao deletar dia letivo', error: error.message });
  }
});

export default router;
