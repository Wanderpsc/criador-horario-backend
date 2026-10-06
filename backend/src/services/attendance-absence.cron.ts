import cron from 'node-cron';
import { processAutomaticAbsences } from './attendance-absence.service';

export function startAttendanceAbsenceCron() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await processAutomaticAbsences();
      if (result.employeeAbsences || result.teacherAbsences) {
        console.log('[ponto] Faltas automáticas processadas:', result);
      }
    } catch (error) {
      console.error('[ponto] Erro ao processar faltas automáticas:', error);
    }
  });

  console.log('Cronjob de faltas automáticas iniciado (a cada 5 minutos)');
}
