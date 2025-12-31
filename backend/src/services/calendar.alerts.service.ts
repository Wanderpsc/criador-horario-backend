import Teacher from '../models/Teacher';
import { NotificationService } from './notification.service';
import { INotification } from '../models/Notification';

// Interface para eventos de calendário (temporariamente simplificada)
interface CalendarEvent {
  userId: any;
  date: Date;
  title: string;
  type: 'holiday' | 'school-event' | 'recess' | 'teacher-meeting' | 'parent-meeting' | 'exam-period' | 'other';
  description?: string;
}

export class CalendarAlertsService {
  /**
   * Verifica eventos próximos e envia notificações
   * Nota: Requer implementação de modelo SchoolCalendar
   */
  static async checkUpcomingEvents(daysInAdvance: number = 1): Promise<void> {
    try {
      console.log(`[Calendar Alerts] Funcionalidade de calendário pendente de implementação de modelo`);
      // TODO: Implementar quando SchoolCalendar model for criado
      return;
    } catch (error) {
      console.error('[Calendar Alerts] Erro ao verificar eventos:', error);
      throw error;
    }
  }

  /**
   * Notifica sobre um evento específico
   */
  private static async notifyEvent(event: CalendarEvent): Promise<void> {
    try {
      // Buscar todos os professores ativos do usuário que criou o evento
      const teachers = await Teacher.find({ 
        userId: event.userId,
        isActive: true,
        phone: { $exists: true, $ne: '' }
      });

      if (teachers.length === 0) {
        console.log('[Calendar Alerts] Nenhum professor com telefone encontrado');
        return;
      }

      const eventDate = new Date(event.date);
      const dateStr = eventDate.toLocaleDateString('pt-BR');
      const dayOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][eventDate.getDay()];

      let message = '';
      
      // Mensagem baseada no tipo de evento
      if (event.type === 'holiday') {
        message = `📅 FERIADO: ${event.title}\n` +
                  `📆 Data: ${dayOfWeek}, ${dateStr}\n` +
                  `ℹ️ ${event.description || 'Não haverá aulas neste dia'}`;
      } else if (event.type === 'school-event') {
        message = `🎓 EVENTO ESCOLAR: ${event.title}\n` +
                  `📆 Data: ${dayOfWeek}, ${dateStr}\n` +
                  `ℹ️ ${event.description || 'Verifique a programação do evento'}`;
      } else if (event.type === 'recess') {
        message = `🏖️ RECESSO: ${event.title}\n` +
                  `📆 Data: ${dayOfWeek}, ${dateStr}\n` +
                  `ℹ️ ${event.description || 'Não haverá aulas neste período'}`;
      } else if (event.type === 'teacher-meeting') {
        message = `👥 REUNIÃO DE PROFESSORES: ${event.title}\n` +
                  `📆 Data: ${dayOfWeek}, ${dateStr}\n` +
                  `⏰ Horário: ${event.description || 'A definir'}\n` +
                  `⚠️ Presença obrigatória`;
      } else if (event.type === 'parent-meeting') {
        message = `👨‍👩‍👧 REUNIÃO DE PAIS: ${event.title}\n` +
                  `📆 Data: ${dayOfWeek}, ${dateStr}\n` +
                  `ℹ️ ${event.description || 'Confira o horário de atendimento'}`;
      } else if (event.type === 'exam-period') {
        message = `📝 PERÍODO DE AVALIAÇÕES: ${event.title}\n` +
                  `📆 Data: ${dayOfWeek}, ${dateStr}\n` +
                  `ℹ️ ${event.description || 'Verifique o calendário de provas'}`;
      } else {
        message = `📅 LEMBRETE: ${event.title}\n` +
                  `📆 Data: ${dayOfWeek}, ${dateStr}\n` +
                  `ℹ️ ${event.description || ''}`;
      }

      // Criar notificações para todos os professores
      for (const teacher of teachers) {
        const notification = new (await import('../models/Notification')).default({
          userId: event.userId,
          recipientType: 'teacher' as const,
          recipientId: teacher._id,
          recipientPhone: teacher.phone,
          type: 'general_announcement' as const,
          message,
          status: 'pending' as const,
          scheduledFor: new Date(),
          metadata: {
            eventTitle: event.title,
            eventType: event.type,
            eventDate: event.date.toISOString(),
          },
        });
        
        await notification.save();
      }

      console.log(`[Calendar Alerts] Notificações criadas para evento: ${event.title}`);
    } catch (error) {
      console.error('[Calendar Alerts] Erro ao notificar evento:', error);
    }
  }

  /**
   * Notifica sobre dias não letivos
   */
  static async notifyNonTeachingDays(): Promise<void> {
    try {
      console.log(`[Calendar Alerts] Funcionalidade de calendário pendente de implementação de modelo`);
      // TODO: Implementar quando SchoolCalendar model for criado
      return;
    } catch (error) {
      console.error('[Calendar Alerts] Erro ao verificar dias não letivos:', error);
    }
  }

  /**
   * Notifica sobre eventos importantes da semana
   */
  static async notifyWeeklyEvents(userId: string): Promise<void> {
    try {
      console.log(`[Calendar Alerts] Funcionalidade de calendário pendente de implementação de modelo`);
      // TODO: Implementar quando SchoolCalendar model for criado
      return;
    } catch (error) {
      console.error('[Calendar Alerts] Erro ao enviar resumo semanal:', error);
    }
  }

  /**
   * Verifica se amanhã é dia letivo
   */
  static async isTomorrowSchoolDay(userId: string): Promise<boolean> {
    try {
      // TODO: Implementar quando SchoolCalendar model for criado
      return true; // Por padrão, assume que é dia letivo
    } catch (error) {
      console.error('[Calendar Alerts] Erro ao verificar dia letivo:', error);
      return true; // Por padrão, assume que é dia letivo
    }
  }
}

export default CalendarAlertsService;
