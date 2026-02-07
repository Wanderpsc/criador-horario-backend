import express from 'express';
import TeacherAttendance from '../models/TeacherAttendance';
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

// Atualizar registro de frequência
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

// Obter estatísticas de frequência
router.get('/statistics', auth, async (req: AuthRequest, res) => {
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

    // Calcular estatísticas
    const statistics = records.reduce((acc: any, record) => {
      if (!acc[record.teacherId]) {
        acc[record.teacherId] = {
          teacherId: record.teacherId,
          teacherName: record.teacherName,
          totalScheduledClasses: 0,
          totalGivenClasses: 0,
          totalAbsences: 0,
          totalPresences: 0
        };
      }

      acc[record.teacherId].totalScheduledClasses += record.scheduledClasses;
      acc[record.teacherId].totalGivenClasses += record.givenClasses;
      
      if (record.status === 'absent') {
        acc[record.teacherId].totalAbsences++;
      } else {
        acc[record.teacherId].totalPresences++;
      }

      return acc;
    }, {});

    res.json(Object.values(statistics));
  } catch (error) {
    console.error('Erro ao calcular estatísticas:', error);
    res.status(500).json({ message: 'Erro ao calcular estatísticas' });
  }
});

export default router;
