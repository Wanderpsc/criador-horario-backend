/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * E-mail: wanderpsc@gmail.com
 * Todos os direitos reservados.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

import connectDB from './config/database';
import authRoutes from './routes/auth.routes';
import teacherRoutes from './routes/teacher.routes';
import subjectRoutes from './routes/subject.routes';
import timetableRoutes from './routes/timetable.routes';
import scheduleRoutes from './routes/schedule.routes';
import licenseRoutes from './routes/license.routes';
import adminRoutes from './routes/admin.routes';
import adminSchoolsRoutes from './routes/admin-schools.routes';
import creditsRoutes from './routes/credits.routes';
import planRoutes from './routes/plan.routes';
import gradeRoutes from './routes/grade.routes';
import classRoutes from './routes/class.routes';
import generatedTimetableRoutes from './routes/generatedTimetable.routes';
import teacherSubjectRoutes from './routes/teacherSubject.routes';
import pdfImportRoutes from './routes/pdfImport.routes';
import notificationRoutes from './routes/notification.routes';
import liveMessageRoutes from './routes/liveMessage.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import emergencyScheduleRoutes from './routes/emergencySchedule.routes';
import saturdayMakeupRoutes from './routes/makeupSaturday.routes';
import schoolDayRoutes from './routes/schoolDay.routes';
import backupRoutes from './routes/backup.routes';
import paymentRoutes from './routes/payment.routes';
import webhookRoutes from './routes/webhook.routes';
import messageRoutes from './routes/message.routes';
import { errorHandler } from './middleware/errorHandler';
import { startNotificationCron } from './services/notification.cron';
import { startCalendarAlertsCron } from './services/calendar.alerts.cron';

const app = express();
const PORT = process.env.PORT || 5000;

// Conectar ao banco de dados
connectDB();

// Middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'https://criador-horario-aula.surge.sh',
  process.env.FRONTEND_URL
].filter((origin): origin is string => Boolean(origin));

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/schools', adminSchoolsRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/timetables', timetableRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/generated-timetables', generatedTimetableRoutes);
app.use('/api/teacher-subjects', teacherSubjectRoutes);
app.use('/api/pdf-import', pdfImportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/live-messages', liveMessageRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/emergency-schedules', emergencyScheduleRoutes);
app.use('/api/saturday-makeup', saturdayMakeupRoutes);
app.use('/api/schooldays', schoolDayRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payments', webhookRoutes);
app.use('/api/messages', messageRoutes);

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema Criador de Horário de Aula Escolar - API funcionando' });
});

// Error handler
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  
  // Iniciar cronjob de notificações
  startNotificationCron();
  
  // Iniciar cronjob de alertas de calendário
  startCalendarAlertsCron();
  
  console.log(`© 2025 Wander Pires Silva Coelho - Todos os direitos reservados`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM recebido, encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT recebido, encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});

// Log para confirmar que o servidor não está terminando
console.log('✅ Servidor inicializado e aguardando conexões...');

export default app;
