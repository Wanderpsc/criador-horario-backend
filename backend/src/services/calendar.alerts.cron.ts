import cron from 'node-cron';
import CalendarAlertsService from './calendar.alerts.service';

/**
 * Inicia cronjobs para alertas automáticos de calendário
 */
export function startCalendarAlertsCron(): void {
  // Verificar eventos próximos todos os dias às 20:00 (8 PM)
  // Notifica sobre eventos do dia seguinte
  cron.schedule('0 20 * * *', async () => {
    console.log('[Calendar Cron] Verificando eventos próximos...');
    try {
      await CalendarAlertsService.checkUpcomingEvents(1); // 1 dia de antecedência
      console.log('[Calendar Cron] Verificação concluída');
    } catch (error) {
      console.error('[Calendar Cron] Erro ao verificar eventos:', error);
    }
  }, {
    timezone: "America/Sao_Paulo"
  });

  // Verificar dias não letivos todas as manhãs às 06:00
  cron.schedule('0 6 * * *', async () => {
    console.log('[Calendar Cron] Verificando dias não letivos...');
    try {
      await CalendarAlertsService.notifyNonTeachingDays();
      console.log('[Calendar Cron] Verificação de dias não letivos concluída');
    } catch (error) {
      console.error('[Calendar Cron] Erro ao verificar dias não letivos:', error);
    }
  }, {
    timezone: "America/Sao_Paulo"
  });

  // Enviar resumo semanal toda segunda-feira às 07:00
  // Nota: Requer userId, então não implementado como cronjob global
  // Pode ser ativado individualmente por usuário via API

  console.log('✅ Calendar Alerts Cronjobs iniciados:');
  console.log('   - Eventos próximos: Diariamente às 20:00');
  console.log('   - Dias não letivos: Diariamente às 06:00');
}
