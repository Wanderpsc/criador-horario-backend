import { Router } from 'express';
import { auth, AuthRequest } from '../middleware/auth';
import Teacher from '../models/Teacher';
import Notification from '../models/Notification';
import { NotificationService } from '../services/notification.service';
import { Response } from 'express';

const router = Router();

/**
 * GET /api/live-messages/teachers - Listar professores para envio
 */
router.get('/teachers', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const teachers = await Teacher.find({ 
      userId,
      isActive: true,
      phone: { $exists: true, $ne: '' }
    }).select('name phone email');

    res.json({
      success: true,
      data: teachers,
    });
  } catch (error: any) {
    console.error('[Live Messages] Erro ao buscar professores:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/live-messages/send - Enviar mensagem instantânea
 */
router.post('/send', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { recipientIds, message, sendToAll, channels } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Mensagem é obrigatória',
      });
    }

    // Validar canais de envio
    if (!channels || (!channels.whatsapp && !channels.sms && !channels.telegram)) {
      return res.status(400).json({
        success: false,
        message: 'Selecione pelo menos um canal de envio',
      });
    }

    let recipients: any[] = [];

    if (sendToAll) {
      // Enviar para todos os professores ativos com telefone
      recipients = await Teacher.find({
        userId,
        isActive: true,
        phone: { $exists: true, $ne: '' }
      });
    } else if (recipientIds && Array.isArray(recipientIds)) {
      // Enviar para professores específicos
      recipients = await Teacher.find({
        _id: { $in: recipientIds },
        userId,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Selecione pelo menos um destinatário ou marque "Enviar para todos"',
      });
    }

    if (recipients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum destinatário encontrado',
      });
    }

    // Criar notificações para cada destinatário e canal
    const notifications = [];
    const selectedChannels = [];
    
    if (channels.whatsapp) selectedChannels.push('whatsapp');
    if (channels.sms) selectedChannels.push('sms');
    if (channels.telegram) selectedChannels.push('telegram');

    for (const teacher of recipients) {
      if (!teacher.phone) continue;

      for (const channel of selectedChannels) {
        const notification = await Notification.create({
          type: 'general_announcement',
          recipientType: 'teacher',
          recipientId: teacher._id,
          recipientPhone: teacher.phone,
          recipientName: teacher.name,
          message,
          status: 'pending',
          scheduledFor: new Date(), // Envio imediato
          metadata: {
            channel, // whatsapp, sms, telegram
            priority: 'high',
          },
          schoolId: userId,
          userId,
        });

        notifications.push(notification);

        // Processar envio imediatamente (em produção, usar fila)
        setTimeout(() => {
          NotificationService['sendNotification'](notification);
        }, 100);
      }
    }

    const channelNames = selectedChannels.map(ch => {
      if (ch === 'whatsapp') return 'WhatsApp';
      if (ch === 'sms') return 'SMS';
      return 'Telegram';
    }).join(', ');

    res.json({
      success: true,
      message: `Mensagem enviada para ${recipients.length} professor(es) via ${channelNames}`,
      data: {
        count: recipients.length,
        channels: selectedChannels,
        totalNotifications: notifications.length,
        notifications,
      },
    });
  } catch (error: any) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/live-messages/alert-vacant - Alertar sobre horário vago
 */
router.post('/alert-vacant', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { classId, className, period, day, reason } = req.body;

    // Buscar coordenadores/diretores (aqui você pode ter uma lógica para identificar)
    // Por enquanto, enviamos para todos os professores como exemplo
    const message = `⚠️ ALERTA DE HORÁRIO VAGO!\n\nTurma: ${className}\nDia: ${day}\nPeríodo: ${period}º horário\nMotivo: ${reason || 'Professor ausente'}\n\nProcure a coordenação imediatamente.`;

    // Criar notificação broadcast
    const notification = await Notification.create({
      type: 'general_announcement',
      recipientType: 'all',
      message,
      status: 'pending',
      scheduledFor: new Date(),
      metadata: {
        classId,
        className,
        period,
        day,
      },
      schoolId: userId,
      userId,
    });

    res.json({
      success: true,
      message: 'Alerta de horário vago enviado',
      data: notification,
    });
  } catch (error: any) {
    console.error('Erro ao enviar alerta:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/live-messages/vacant-slots - Buscar horários vagos
 */
router.get('/vacant-slots', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Aqui você implementaria a lógica para detectar horários sem professor
    // Por enquanto, retorna array vazio como exemplo
    
    res.json({
      success: true,
      data: [],
      message: 'Funcionalidade em desenvolvimento',
    });
  } catch (error: any) {
    console.error('Erro ao buscar horários vagos:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
