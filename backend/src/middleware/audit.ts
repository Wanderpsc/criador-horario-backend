import { Request, Response, NextFunction } from 'express';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from './auth';

// Mapear endpoints para recursos
const endpointToResource: { [key: string]: string } = {
  '/api/teachers': 'teachers',
  '/api/subjects': 'subjects',
  '/api/grades': 'grades',
  '/api/classes': 'classes',
  '/api/class-subjects': 'classSubjects',
  '/api/teacher-subjects': 'teacherSubjects',
  '/api/schedules': 'schedules',
  '/api/timetables/generate': 'timetableGenerator',
  '/api/school-days': 'calendar',
  '/api/notifications': 'notifications',
  '/api/emergency-schedule': 'emergencySchedule',
  '/api/teacher-attendance': 'teacherAttendance',
  '/api/teacher-frequency-report': 'frequencyReports',
  '/api/school-users': 'users'
};

// Mapear método HTTP para ação
const methodToAction: { [key: string]: string } = {
  'GET': 'read',
  'POST': 'create',
  'PUT': 'update',
  'PATCH': 'update',
  'DELETE': 'delete'
};

export const auditMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Salvar o método original res.json para capturar a resposta
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  
  let responseBody: any;
  let responseSent = false;

  // Interceptar res.json
  res.json = function(body: any) {
    if (!responseSent) {
      responseBody = body;
      responseSent = true;
    }
    return originalJson(body);
  };

  // Interceptar res.send
  res.send = function(body: any) {
    if (!responseSent) {
      responseBody = body;
      responseSent = true;
    }
    return originalSend(body);
  };

  // Aguardar resposta
  res.on('finish', async () => {
    try {
      // Apenas logar se usuário estiver autenticado
      if (!req.user || !req.user.userId) {
        return;
      }

      // Não logar rotas de auditoria para evitar loop infinito
      if (req.path.startsWith('/api/audit-logs')) {
        return;
      }

      // Não logar GETs simples de listagem (apenas CUD operations e logins)
      if (req.method === 'GET' && !req.path.includes('/export')) {
        return;
      }

      // Determinar recurso a partir do endpoint
      let resource = 'unknown';
      for (const [endpoint, resourceName] of Object.entries(endpointToResource)) {
        if (req.path.startsWith(endpoint)) {
          resource = resourceName;
          break;
        }
      }

      // Determinar ação
      let action = methodToAction[req.method] || 'unknown';
      if (req.path.includes('/generate')) action = 'generate';
      if (req.path.includes('/export')) action = 'export';

      // Extrair ID do recurso se houver
      const pathParts = req.path.split('/');
      const resourceId = pathParts.length > 3 ? pathParts[3] : undefined;

      // Determinar status
      const status = res.statusCode >= 200 && res.statusCode < 400 ? 'success' : 'error';
      
      // Extrair mensagem de erro se houver
      let errorMessage: string | undefined;
      if (status === 'error' && typeof responseBody === 'object' && responseBody) {
        errorMessage = responseBody.error || responseBody.message || `HTTP ${res.statusCode}`;
      }

      // Capturar mudanças para operações de update
      let changes: any = undefined;
      if (action === 'update' && req.body) {
        changes = {
          after: req.body
        };
      } else if (action === 'create' && req.body) {
        changes = {
          after: req.body
        };
      }

      // Criar log de auditoria
      await AuditLog.create({
        userId: req.user.userId,
        userName: req.user.name || 'Unknown',
        userEmail: req.user.email || 'unknown@email.com',
        schoolId: req.user.schoolId,
        action,
        resource,
        resourceId,
        method: req.method,
        endpoint: req.path,
        changes,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        timestamp: new Date(),
        status,
        errorMessage
      });

      console.log(`📝 Audit Log: ${req.user.email} - ${action} ${resource} - ${status}`);
    } catch (error) {
      console.error('❌ Erro ao criar log de auditoria:', error);
      // Não falhar a requisição se o log falhar
    }
  });

  next();
};

export const checkPermission = (resource: string, action: 'create' | 'read' | 'update' | 'delete' | 'access' | 'manage' | 'generate') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.permissions) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const permissions = req.user.permissions;
      
      // Admin tem acesso total
      if (req.user.role === 'admin') {
        return next();
      }

      // Verificar permissão específica
      const resourcePermissions = (permissions as any)[resource];
      
      if (!resourcePermissions) {
        return res.status(403).json({ 
          error: 'Sem permissão para acessar este recurso',
          resource,
          action
        });
      }

      const hasPermission = resourcePermissions[action];
      
      if (!hasPermission) {
        return res.status(403).json({ 
          error: `Sem permissão para ${action} em ${resource}`,
          resource,
          action
        });
      }

      next();
    } catch (error: any) {
      console.error('❌ Erro ao verificar permissão:', error);
      res.status(500).json({ error: 'Erro ao verificar permissões', details: error.message });
    }
  };
};
