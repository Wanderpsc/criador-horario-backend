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

    const { date, schedule, teacherDebts } = req.body;

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
      await existingMakeup.save();
      console.log('✅ Sábado atualizado com sucesso');
      return res.json(existingMakeup);
    }

    console.log('➕ Criando novo sábado');
    // Criar novo
    const makeupSaturday = new MakeupSaturday({
      schoolId,
      date: new Date(date),
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
    const { date, maxPeriods, lessonDuration, startTime, selectedTeacherIds } = req.body;

    console.log('🎯 Gerando horário automático para:', { schoolId, date, maxPeriods, lessonDuration, startTime });
    console.log('📦 Body completo:', JSON.stringify(req.body, null, 2));
    
    if (selectedTeacherIds && selectedTeacherIds.length > 0) {
      console.log(`👥 Filtrando ${selectedTeacherIds.length} professores selecionados:`, selectedTeacherIds);
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
      selectedTeacherIds // Passa os professores selecionados
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

console.log('🔥 ROTAS REGISTRADAS: GET /, POST /, PUT /:id/attendance, PUT /:id, DELETE /:id');
console.log('🔥 NOVAS ROTAS: POST /:id/process, GET /teacher-debts/:teacherId, POST /generate-from-debts');

export default router;
