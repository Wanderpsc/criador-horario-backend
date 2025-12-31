import Notification, { INotification } from '../models/Notification';
import NotificationConfig from '../models/NotificationConfig';
import Teacher from '../models/Teacher';
import GeneratedTimetable from '../models/GeneratedTimetable';
import Schedule from '../models/Schedule';
import Subject from '../models/Subject';
import Class from '../models/Class';
import WhatsAppService from './whatsapp.service';

interface ScheduleNotificationParams {
  teacherId: string;
  classId: string;
  subjectId: string;
  period: number;
  day: string;
  startTime: string;
  endTime: string;
  userId: string;
}

export class NotificationService {
  /**
   * Criar lembrete de aula agendado
   */
  static async scheduleClassReminder(params: ScheduleNotificationParams): Promise<INotification | null> {
    try {
      const { teacherId, classId, subjectId, period, day, startTime, endTime, userId } = params;

      // Buscar configuração de notificações
      const config = await NotificationConfig.findOne({ userId });
      if (!config || !config.reminderEnabled) {
        return null;
      }

      // Buscar dados do professor
      const teacher = await Teacher.findById(teacherId);
      if (!teacher || !teacher.phone) {
        console.log(`Professor ${teacherId} não tem telefone cadastrado`);
        return null;
      }

      // Buscar dados da turma e disciplina
      const classData = await Class.findById(classId);
      const subject = await Subject.findById(subjectId);

      if (!classData || !subject) {
        console.log('Turma ou disciplina não encontrada');
        return null;
      }

      // Calcular horário de envio (ex: 15 minutos antes)
      const scheduledFor = this.calculateScheduledTime(day, startTime, config.reminderMinutesBefore);

      // Montar mensagem usando template
      const message = this.buildMessage(config.messageTemplate, {
        teacherName: teacher.name,
        subjectName: subject.name,
        className: classData.name,
        period: period.toString(),
        startTime,
        endTime,
        minutes: config.reminderMinutesBefore.toString(),
      });

      // Criar notificação
      const notification = await Notification.create({
        type: 'class_reminder',
        recipientType: 'teacher',
        recipientId: teacherId,
        recipientPhone: teacher.phone,
        recipientName: teacher.name,
        message,
        status: 'pending',
        scheduledFor,
        metadata: {
          classId,
          className: classData.name,
          subjectId,
          subjectName: subject.name,
          period,
          day,
          startTime,
          endTime,
        },
        schoolId: teacher.schoolId,
        userId,
      });

      return notification;
    } catch (error) {
      console.error('Erro ao agendar lembrete:', error);
      return null;
    }
  }

  /**
   * Processar notificações pendentes (chamado pelo cronjob)
   */
  static async processPendingNotifications(): Promise<void> {
    try {
      const now = new Date();

      // Buscar notificações pendentes que devem ser enviadas agora
      const notifications = await Notification.find({
        status: 'pending',
        scheduledFor: { $lte: now },
      });

      console.log(`📱 Processando ${notifications.length} notificações pendentes`);

      for (const notification of notifications) {
        await this.sendNotification(notification);
      }
    } catch (error) {
      console.error('Erro ao processar notificações:', error);
    }
  }

  /**
   * Enviar notificação (SMS/WhatsApp)
   */
  private static async sendNotification(notification: INotification): Promise<void> {
    try {
      // Buscar configuração
      const config = await NotificationConfig.findOne({ userId: notification.userId });

      if (!config) {
        throw new Error('Configuração de notificações não encontrada');
      }

      // Verificar qual canal usar (baseado no metadata.channel)
      const channel = notification.metadata?.channel || 'whatsapp';

      console.log(`📤 Enviando ${channel} para ${notification.recipientPhone}`);

      let success = false;
      let errorMessage = '';

      // Validar telefone
      if (!notification.recipientPhone) {
        throw new Error('Telefone do destinatário não informado');
      }

      // Enviar via WhatsApp Business API
      if (channel === 'whatsapp' && config.sendToWhatsApp) {
        const result = await WhatsAppService.sendMessage({
          to: notification.recipientPhone,
          message: notification.message,
          recipientName: notification.recipientName,
          userId: notification.userId, // Passa userId para buscar config da escola
        });

        success = result.success;
        if (!success) {
          errorMessage = result.error || 'Erro ao enviar WhatsApp';
        }
      }
      // SMS via Twilio (TODO: implementar)
      else if (channel === 'sms' && config.sendToSMS) {
        // TODO: Implementar integração com Twilio SMS
        console.log('📱 SMS ainda não implementado - use WhatsApp');
        errorMessage = 'SMS não implementado';
      }
      // Telegram (TODO: implementar)
      else if (channel === 'telegram') {
        // TODO: Implementar integração com Telegram Bot
        console.log('📱 Telegram ainda não implementado - use WhatsApp');
        errorMessage = 'Telegram não implementado';
      }
      else {
        errorMessage = 'Nenhum método de envio configurado ou habilitado';
      }

      // Atualizar status da notificação
      if (success) {
        notification.status = 'sent';
        notification.sentAt = new Date();
        console.log(`✅ ${channel} enviado para ${notification.recipientName || notification.recipientPhone}`);
      } else {
        notification.status = 'failed';
        notification.errorMessage = errorMessage;
        console.error(`❌ Falha ao enviar ${channel}:`, errorMessage);
      }

      await notification.save();
    } catch (error: any) {
      console.error('Erro ao enviar notificação:', error);
      notification.status = 'failed';
      notification.errorMessage = error.message;
      await notification.save();
    }
  }

  /**
   * Calcular horário de envio baseado no dia e hora da aula
   */
  private static calculateScheduledTime(day: string, startTime: string, minutesBefore: number): Date {
    const now = new Date();
    const daysOfWeek = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const dayIndex = daysOfWeek.indexOf(day);

    if (dayIndex === -1) {
      throw new Error('Dia da semana inválido');
    }

    // Encontrar próxima ocorrência desse dia da semana
    const currentDayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1; // Ajustar domingo
    let daysUntilTarget = dayIndex - currentDayIndex;
    if (daysUntilTarget < 0) {
      daysUntilTarget += 7;
    }

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysUntilTarget);

    // Extrair hora e minuto do startTime (formato: "07:00")
    const [hours, minutes] = startTime.split(':').map(Number);
    targetDate.setHours(hours, minutes, 0, 0);

    // Subtrair os minutos de antecedência
    targetDate.setMinutes(targetDate.getMinutes() - minutesBefore);

    return targetDate;
  }

  /**
   * Construir mensagem a partir do template
   */
  private static buildMessage(template: string, data: Record<string, string>): string {
    let message = template;

    Object.entries(data).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return message;
  }

  /**
   * Gerar lembretes para um horário gerado
   */
  static async generateRemindersForTimetable(userId: string): Promise<number> {
    try {
      const timetables = await GeneratedTimetable.find({ userId });
      let count = 0;

      for (const timetable of timetables) {
        const slots = timetable.slots || [];

        for (const slot of slots) {
          const notification = await this.scheduleClassReminder({
            teacherId: slot.teacherId,
            classId: slot.classId,
            subjectId: slot.subjectId,
            period: slot.period,
            day: slot.day,
            startTime: slot.startTime || '07:00',
            endTime: slot.endTime || '07:50',
            userId,
          });

          if (notification) {
            count++;
          }
        }
      }

      console.log(`✅ ${count} lembretes gerados para o horário`);
      return count;
    } catch (error) {
      console.error('Erro ao gerar lembretes:', error);
      return 0;
    }
  }

  /**
   * Cancelar lembretes de um horário
   */
  static async cancelRemindersForTimetable(userId: string): Promise<void> {
    try {
      await Notification.updateMany(
        {
          userId,
          status: 'pending',
          type: 'class_reminder',
        },
        {
          status: 'cancelled',
        }
      );

      console.log('✅ Lembretes antigos cancelados');
    } catch (error) {
      console.error('Erro ao cancelar lembretes:', error);
    }
  }
}
