/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * E-mail: wanderpsc@gmail.com
 * Todos os direitos reservados.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

import connectDB from './config/database';
import authRoutes from './routes/auth.routes';
import schoolRoutes from './routes/school.routes';
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
import invoiceRoutes from './routes/invoice.routes';
import { errorHandler } from './middleware/errorHandler';
import { startNotificationCron } from './services/notification.cron';
import { startCalendarAlertsCron } from './services/calendar.alerts.cron';
import { COPYRIGHT, SECURITY_INFO } from './config/copyright';

const app = express();
const PORT = process.env.PORT || 5000;

// 🔥 DESABILITAR ETAG - Impede cache 304
app.set('etag', false);

// Conectar ao banco de dados
connectDB();

// ============================================
// SEGURANÇA - PROTEÇÃO CONTRA VULNERABILIDADES
// ============================================

// Helmet: Headers HTTP seguros
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate Limiting: Previne ataques de força bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por IP
  message: 'Muitas requisições deste IP, tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limit para rotas de autenticação (mais restritivo)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Apenas 5 tentativas de login
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas
});

// Aplicar rate limiting global
app.use(limiter);

// Sanitização contra NoSQL Injection
app.use(mongoSanitize({
  replaceWith: '_', // Substitui caracteres proibidos
}));

// Proteção contra HPP (HTTP Parameter Pollution)
app.use(hpp());

// ============================================
// MIDDLEWARES
// ============================================

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'https://criador-horario-aula.surge.sh',
  'https://horario-escolar.surge.sh',
  'https://wanderpsc.github.io',
  'https://wanderpsc.github.io/criador-horario-backend',
  process.env.FRONTEND_URL
].filter((origin): origin is string => Boolean(origin));

console.log('🌐 Origens permitidas no CORS:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (mobile apps, Postman, etc)
    if (!origin) {
      console.log('✅ CORS: Requisição sem origin (permitido)');
      return callback(null, true);
    }
    
    console.log('🔍 CORS: Verificando origem:', origin);
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Origem permitida:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS: Origem BLOQUEADA:', origin);
      console.log('📋 Origens permitidas:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // 10 minutos de cache para preflight
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' })); // Aumentar limite para horários grandes
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 🔥 MIDDLEWARE DE DEBUG - SEMPRE EXECUTA
app.use((req, res, next) => {
  if (req.path.includes('/admin/schools') && req.method === 'GET') {
    console.log('\n🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
    console.log('🚨 MIDDLEWARE: Requisição para /admin/schools');
    console.log('🚨 Path completo:', req.path);
    console.log('🚨 URL completa:', req.url);
    console.log('🚨 Método:', req.method);
    console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨\n');
  }
  next();
});

// Rotas
app.use('/api/auth', authLimiter, authRoutes); // Rate limit especial para autenticação
app.use('/api/schools', schoolRoutes);
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
app.use('/api/invoices', invoiceRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema Criador de Horário de Aula Escolar - API funcionando', timestamp: new Date().toISOString() });
});

// Health check sem /api para verificação do Render
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema funcionando', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  
  // Diagnóstico de variáveis de ambiente
  console.log('\n📋 DIAGNÓSTICO DE CONFIGURAÇÃO:');
  console.log('================================');
  console.log(`✅ NODE_ENV: ${process.env.NODE_ENV || 'não configurado'}`);
  console.log(`✅ PORT: ${PORT}`);
  console.log(`✅ MONGODB_URI: ${process.env.MONGODB_URI ? 'Configurado' : '❌ NÃO CONFIGURADO'}`);
  console.log(`✅ JWT_SECRET: ${process.env.JWT_SECRET ? 'Configurado' : '❌ NÃO CONFIGURADO'}`);
  console.log(`✅ FRONTEND_URL: ${process.env.FRONTEND_URL || 'não configurado'}`);
  console.log(`✅ EMAIL_USER: ${process.env.EMAIL_USER || 'não configurado'}`);
  console.log(`✅ EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? 'Configurado' : '❌ NÃO CONFIGURADO'}`);
  
  // MERCADO PAGO - Verificação crítica
  const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!mpToken || mpToken.length === 0) {
    console.log('❌ MERCADO_PAGO_ACCESS_TOKEN: ⚠️⚠️⚠️ NÃO CONFIGURADO ⚠️⚠️⚠️');
    console.log('⚠️ O SISTEMA DE PAGAMENTO NÃO FUNCIONARÁ!');
    console.log('⚠️ Configure o token no Render: Environment Variables');
  } else if (mpToken.startsWith('APP_USR-')) {
    console.log(`✅ MERCADO_PAGO_ACCESS_TOKEN: Configurado (${mpToken.substring(0, 20)}...)`);
  } else {
    console.log(`⚠️ MERCADO_PAGO_ACCESS_TOKEN: Configurado mas formato incorreto`);
    console.log(`⚠️ Deve começar com 'APP_USR-'`);
    console.log(`⚠️ Valor atual: ${mpToken.substring(0, 20)}...`);
  }
  
  console.log(`✅ WEBHOOK_URL: ${process.env.WEBHOOK_URL || 'não configurado (opcional)'}`);
  console.log('================================\n');
  
  // Exibir copyright e informações de segurança
  COPYRIGHT.display();
  SECURITY_INFO.display();
  
  // Iniciar cronjob de notificações
  startNotificationCron();
  
  // Iniciar cronjob de alertas de calendário
  startCalendarAlertsCron();
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
