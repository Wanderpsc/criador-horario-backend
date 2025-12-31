import express from 'express';
import { body, validationResult } from 'express-validator';
import Schedule from '../models/Schedule';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Criar horário
router.post('/', auth,
  [
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('periods').isArray().withMessage('Períodos devem ser um array')
  ],
  async (req: AuthRequest, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      console.log('📝 Criando horário - Dados recebidos:', JSON.stringify(req.body, null, 2));

      // Filtrar períodos vazios
      const periods = (req.body.periods || []).filter((p: any) => {
        const isValid = p.startTime && p.endTime && p.startTime !== '' && p.endTime !== '';
        if (!isValid) {
          console.log(`❌ Período inválido removido:`, p);
        }
        return isValid;
      });

      console.log(`✅ Períodos válidos: ${periods.length} de ${req.body.periods?.length || 0}`);
      console.log('📊 Períodos que serão salvos:', JSON.stringify(periods, null, 2));

      const schedule = new Schedule({
        ...req.body,
        periods,
        userId: req.user!.id
      });

      await schedule.save();
      console.log('💾 Horário salvo:', schedule._id);
      console.log('📋 Períodos salvos no banco:', schedule.periods?.length || 0);
      res.status(201).json(schedule);
    } catch (error: any) {
      console.error('❌ Erro ao criar horário:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Listar horários
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    console.log('⏰ GET /schedules - req.user.id:', req.user!.id);
    const schedules = await Schedule.find({ userId: req.user!.id });
    res.json(schedules);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Obter horário por ID
router.get('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const schedule = await Schedule.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!schedule) {
      return res.status(404).json({ message: 'Horário não encontrado' });
    }
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Atualizar horário
router.put('/:id', auth, async (req: AuthRequest, res) => {
  try {
    console.log('✏️ Atualizando horário - Dados recebidos:', JSON.stringify(req.body, null, 2));

    // Filtrar períodos vazios
    const periods = (req.body.periods || []).filter((p: any) => 
      p.startTime && p.endTime && p.startTime !== '' && p.endTime !== ''
    );

    console.log(`✅ Períodos válidos: ${periods.length} de ${req.body.periods?.length || 0}`);

    const schedule = await Schedule.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      { ...req.body, periods },
      { new: true, runValidators: true }
    );
    if (!schedule) {
      return res.status(404).json({ message: 'Horário não encontrado' });
    }
    console.log('💾 Horário atualizado:', schedule._id);
    res.json(schedule);
  } catch (error: any) {
    console.error('❌ Erro ao atualizar horário:', error);
    res.status(500).json({ message: error.message });
  }
});

// Deletar horário
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Validar formato do ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ message: 'ID inválido' });
    }

    // Tentar converter para ObjectId (validação do Mongoose)
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID inválido: formato incorreto' });
    }

    const schedule = await Schedule.findOneAndDelete({ 
      _id: id, 
      userId: req.user!.id 
    });
    
    if (!schedule) {
      return res.status(404).json({ message: 'Horário não encontrado ou você não tem permissão para deletá-lo' });
    }
    
    res.json({ 
      success: true,
      message: 'Horário deletado com sucesso',
      deletedId: id
    });
  } catch (error: any) {
    console.error('Erro ao deletar horário:', error);
    res.status(500).json({ 
      message: 'Erro ao deletar horário: ' + error.message 
    });
  }
});

export default router;
