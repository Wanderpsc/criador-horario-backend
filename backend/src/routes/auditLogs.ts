import { Router, Response } from 'express';
import AuditLog from '../models/AuditLog';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();

// Listar logs de auditoria (apenas quem tem permissão)
router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    
    // Query parameters para filtros
    const { 
      userId, 
      action, 
      resource, 
      startDate, 
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const query: any = { schoolId };

    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (resource) query.resource = resource;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro ao buscar logs de auditoria', details: error.message });
  }
});

// Buscar logs de um usuário específico
router.get('/user/:userId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const schoolId = req.user!.schoolId;
    
    const logs = await AuditLog.find({ userId, schoolId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    res.json(logs);
  } catch (error: any) {
    console.error('❌ Erro ao buscar logs do usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar logs do usuário', details: error.message });
  }
});

// Estatísticas de auditoria
router.get('/stats', auth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const { startDate, endDate } = req.query;

    const query: any = { schoolId };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }

    const [
      totalLogs,
      actionStats,
      resourceStats,
      userStats,
      errorCount
    ] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$resource', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AuditLog.aggregate([
        { $match: query },
        { 
          $group: { 
            _id: { userId: '$userId', userName: '$userName' },
            count: { $sum: 1 }
          } 
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      AuditLog.countDocuments({ ...query, status: 'error' })
    ]);

    res.json({
      totalLogs,
      errorCount,
      successRate: totalLogs > 0 ? ((totalLogs - errorCount) / totalLogs * 100).toFixed(2) : 100,
      byAction: actionStats,
      byResource: resourceStats,
      topUsers: userStats.map(u => ({
        userId: u._id.userId,
        userName: u._id.userName,
        actions: u.count
      }))
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas', details: error.message });
  }
});

// Exportar logs (CSV)
router.get('/export', auth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const { startDate, endDate } = req.query;

    const query: any = { schoolId };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .lean();

    // Gerar CSV
    const csvHeader = 'Data/Hora,Usuário,E-mail,Ação,Recurso,ID do Recurso,Método,Endpoint,Status,IP,Mensagem de Erro\n';
    const csvRows = logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString('pt-BR');
      const errorMsg = log.errorMessage ? log.errorMessage.replace(/,/g, ';') : '';
      return `${timestamp},${log.userName},${log.userEmail},${log.action},${log.resource},${log.resourceId || ''},${log.method},${log.endpoint},${log.status},${log.ipAddress || ''},${errorMsg}`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.send('\uFEFF' + csv); // BOM para UTF-8
  } catch (error: any) {
    console.error('❌ Erro ao exportar logs:', error);
    res.status(500).json({ error: 'Erro ao exportar logs', details: error.message });
  }
});

export default router;
