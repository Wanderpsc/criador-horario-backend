import cron from 'node-cron';
import { NotificationService } from '../services/notification.service';

/**
 * Cronjob para processar notificações pendentes
 * Executa a cada minuto
 */
export const startNotificationCron = () => {
  // Executar a cada minuto
  cron.schedule('* * * * *', async () => {
    try {
      console.log('🔄 Processando notificações pendentes...');
      await NotificationService.processPendingNotifications();
    } catch (error) {
      console.error('❌ Erro no cronjob de notificações:', error);
    }
  });

  console.log('✅ Cronjob de notificações iniciado (executa a cada minuto)');
};
