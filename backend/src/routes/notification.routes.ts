import { Router } from 'express';
import { auth, AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';
import NotificationConfig from '../models/NotificationConfig';
import { NotificationService } from '../services/notification.service';
import { Response } from 'express';

const router = Router();

/**
 * GET /api/notifications - Listar notificações
 */
router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, type, recipientId } = req.query;

    const filter: any = { userId };
    
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (recipientId) filter.recipientId = recipientId;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/notifications - Criar notificação manual
 */
router.post('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const notificationData = {
      ...req.body,
      userId,
      schoolId: userId, // Temporariamente usando userId como schoolId
    };

    const notification = await Notification.create(notificationData);

    // Notificação criada - será processada pelo sistema de notificações
    // O envio será feito quando chegar a hora programada (scheduledFor)
    // ou imediatamente se não houver agendamento

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error: any) {
    console.error('Erro ao criar notificação:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/notifications/config - Obter configuração
 */
router.get('/config', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    let config = await NotificationConfig.findOne({ userId });

    // Criar configuração padrão se não existir
    if (!config) {
      config = await NotificationConfig.create({
        userId,
        schoolId: userId,
        reminderEnabled: true,
        reminderMinutesBefore: 15,
        messageTemplate: 'Olá {{teacherName}}! Lembrete: Sua aula de {{subjectName}} na turma {{className}} começa em {{minutes}} minutos ({{startTime}}). Sala: {{period}}º horário.',
      });
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error('Erro ao buscar configuração:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/notifications/config - Atualizar configuração
 */
router.put('/config', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    let config = await NotificationConfig.findOne({ userId });

    if (!config) {
      config = await NotificationConfig.create({
        ...req.body,
        userId,
        schoolId: userId,
      });
    } else {
      Object.assign(config, req.body);
      await config.save();
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar configuração:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/notifications/generate-reminders - Gerar lembretes para horário
 */
router.post('/generate-reminders', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Cancelar lembretes antigos
    await NotificationService.cancelRemindersForTimetable(userId);

    // Gerar novos lembretes
    const count = await NotificationService.generateRemindersForTimetable(userId);

    res.json({
      success: true,
      message: `${count} lembretes gerados com sucesso`,
      data: { count },
    });
  } catch (error: any) {
    console.error('Erro ao gerar lembretes:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/notifications/:id - Cancelar/Remover notificação
 */
router.delete('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const notification = await Notification.findOne({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificação não encontrada',
      });
    }

    // Remover permanentemente
    await Notification.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Notificação removida com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao remover notificação:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PATCH /api/notifications/:id/read - Marcar notificação como lida
 */
router.patch('/:id/read', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const notification = await Notification.findOne({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificação não encontrada',
      });
    }

    notification.read = true;
    await notification.save();

    res.json({
      success: true,
      data: notification
    });
  } catch (error: any) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PATCH /api/notifications/mark-all-read - Marcar todas como lidas
 */
router.patch('/mark-all-read', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    await Notification.updateMany(
      { userId, read: false },
      { read: true }
    );

    res.json({
      success: true,
      message: 'Todas as notificações foram marcadas como lidas'
    });
  } catch (error: any) {
    console.error('Erro ao marcar notificações:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
