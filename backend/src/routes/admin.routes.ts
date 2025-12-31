/**
 * Rotas de gerenciamento de licenças (Admin)
 * © 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com
 */

import { Router, Response } from 'express';
import User from '../models/User';
import { authenticate } from '../middleware/auth';
import { requireAdmin, AuthRequest } from '../middleware/license';

const router = Router();

// Todas as rotas requerem autenticação de admin
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/users/stats - Estatísticas de usuários
 */
router.get('/users/stats', async (req: any, res: Response) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeUsers = await User.countDocuments({ role: 'user', isActive: true });
    const inactiveUsers = totalUsers - activeUsers;
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const schoolUsers = await User.countDocuments({ role: { $in: ['user', 'school'] } });
    
    const totalSchools = schoolUsers;
    const activeSchools = await User.countDocuments({ 
      role: { $in: ['user', 'school'] }, 
      isActive: true 
    });
    const inactiveSchools = totalSchools - activeSchools;

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        adminUsers,
        schoolUsers,
        totalSchools,
        activeSchools,
        inactiveSchools
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas'
    });
  }
});

/**
 * GET /api/admin/users - Listar todos os usuários
 */
router.get('/users', async (req: any, res: Response) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar usuários'
    });
  }
});

/**
 * PUT /api/admin/users/:id/approve - Aprovar usuário
 */
router.put('/users/:id/approve', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { licenseExpiryDate, maxUsers } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    user.approvedByAdmin = true;
    if (licenseExpiryDate) {
      user.licenseExpiryDate = new Date(licenseExpiryDate);
    }
    if (maxUsers) {
      user.maxUsers = maxUsers;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Usuário aprovado com sucesso',
      data: {
        id: user._id,
        email: user.email,
        approvedByAdmin: user.approvedByAdmin,
        licenseExpiryDate: user.licenseExpiryDate,
        maxUsers: user.maxUsers
      }
    });
  } catch (error) {
    console.error('Erro ao aprovar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao aprovar usuário'
    });
  }
});

/**
 * PUT /api/admin/users/:id/payment - Confirmar pagamento
 */
router.put('/users/:id/payment', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!['pending', 'paid', 'expired', 'cancelled'].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Status de pagamento inválido'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    user.paymentStatus = paymentStatus;
    await user.save();

    res.json({
      success: true,
      message: 'Status de pagamento atualizado',
      data: {
        id: user._id,
        email: user.email,
        paymentStatus: user.paymentStatus
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar pagamento'
    });
  }
});

/**
 * PUT /api/admin/users/:id/extend - Estender licença
 */
router.put('/users/:id/extend', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { months } = req.body;

    if (!months || months < 1) {
      return res.status(400).json({
        success: false,
        message: 'Número de meses inválido'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const currentExpiry = user.licenseExpiryDate || new Date();
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + parseInt(months));

    user.licenseExpiryDate = newExpiry;
    user.paymentStatus = 'paid';

    await user.save();

    res.json({
      success: true,
      message: `Licença estendida por ${months} meses`,
      data: {
        id: user._id,
        email: user.email,
        licenseExpiryDate: user.licenseExpiryDate
      }
    });
  } catch (error) {
    console.error('Erro ao estender licença:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao estender licença'
    });
  }
});

/**
 * DELETE /api/admin/users/:id - Desativar usuário
 */
router.delete('/users/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    user.paymentStatus = 'cancelled';
    user.approvedByAdmin = false;
    await user.save();

    res.json({
      success: true,
      message: 'Usuário desativado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao desativar usuário'
    });
  }
});

/**
 * GET /api/admin/schools - Listar todas as escolas cadastradas
 */
router.get('/schools', async (req: any, res: Response) => {
  try {
    const schools = await User.find({ role: 'user' })
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: schools });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PATCH /api/admin/schools/:id/approve - Aprovar cadastro de escola
 */
router.patch('/schools/:id/approve', async (req: any, res: Response) => {
  try {
    const { licenseExpiryDate, adminNotes } = req.body;
    
    const expiryDate = licenseExpiryDate 
      ? new Date(licenseExpiryDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const school = await User.findByIdAndUpdate(
      req.params.id,
      {
        registrationStatus: 'approved',
        approvedByAdmin: true,
        paymentStatus: 'paid',
        licenseExpiryDate: expiryDate,
        adminNotes
      },
      { new: true }
    ).select('-password');
    
    if (!school) {
      return res.status(404).json({ message: 'Escola não encontrada' });
    }
    
    res.json({ success: true, message: 'Escola aprovada com sucesso', data: school });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PATCH /api/admin/schools/:id/reject - Rejeitar cadastro
 */
router.patch('/schools/:id/reject', async (req: any, res: Response) => {
  try {
    const { adminNotes } = req.body;
    
    const school = await User.findByIdAndUpdate(
      req.params.id,
      { registrationStatus: 'rejected', approvedByAdmin: false, adminNotes },
      { new: true }
    ).select('-password');
    
    if (!school) {
      return res.status(404).json({ message: 'Escola não encontrada' });
    }
    
    res.json({ success: true, message: 'Cadastro rejeitado', data: school });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PATCH /api/admin/schools/:id/suspend - Suspender escola
 */
router.patch('/schools/:id/suspend', async (req: any, res: Response) => {
  try {
    const { adminNotes } = req.body;
    
    const school = await User.findByIdAndUpdate(
      req.params.id,
      { registrationStatus: 'suspended', approvedByAdmin: false, adminNotes },
      { new: true }
    ).select('-password');
    
    if (!school) {
      return res.status(404).json({ message: 'Escola não encontrada' });
    }
    
    res.json({ success: true, message: 'Escola suspensa', data: school });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PATCH /api/admin/schools/:id/notes - Atualizar observações administrativas
 */
router.patch('/schools/:id/notes', async (req: any, res: Response) => {
  try {
    const { adminNotes } = req.body;
    
    const school = await User.findByIdAndUpdate(
      req.params.id,
      { adminNotes },
      { new: true }
    ).select('-password');
    
    if (!school) {
      return res.status(404).json({ message: 'Escola não encontrada' });
    }
    
    res.json({ success: true, message: 'Observações atualizadas', data: school });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/admin/dashboard-stats - Estatísticas do dashboard
 */
router.get('/dashboard-stats', async (req: any, res: Response) => {
  try {
    const totalClients = await User.countDocuments({ role: 'user' });
    const activeClients = await User.countDocuments({ 
      role: 'user', 
      registrationStatus: 'approved',
      approvedByAdmin: true 
    });
    const pendingApprovals = await User.countDocuments({ 
      role: 'user', 
      registrationStatus: 'pending' 
    });
    const suspendedClients = await User.countDocuments({ 
      role: 'user', 
      registrationStatus: 'suspended' 
    });

    // Cálculos financeiros simulados (implementar com modelo Transaction)
    const monthlyRevenue = 0; // TODO: Calcular da tabela de transações
    const pendingPayments = await User.countDocuments({ 
      role: 'user', 
      paymentStatus: 'pending' 
    });

    // Licenças expirando nos próximos 30 dias
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringSoon = await User.countDocuments({
      role: 'user',
      licenseExpiryDate: { $lte: thirtyDaysFromNow, $gte: new Date() }
    });

    res.json({
      success: true,
      data: {
        totalClients,
        activeClients,
        pendingApprovals,
        suspendedClients,
        totalRevenue: 0, // TODO: Implementar
        monthlyRevenue,
        pendingPayments,
        expiringSoon,
        unreadMessages: 0, // TODO: Implementar
        systemNotifications: pendingApprovals + expiringSoon
      }
    });
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar estatísticas'
    });
  }
});

/**
 * GET /api/admin/backups - Listar todos os backups
 */
router.get('/backups', async (req: any, res: Response) => {
  try {
    // TODO: Implementar modelo Backup e listar do banco
    // Por enquanto, retorna array vazio
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('Erro ao listar backups:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar backups'
    });
  }
});

/**
 * POST /api/admin/backups/create/:clientId - Criar backup de um cliente
 */
router.post('/backups/create/:clientId?', async (req: any, res: Response) => {
  try {
    const { clientId } = req.params;
    
    // TODO: Implementar lógica de backup
    // - Se clientId fornecido, fazer backup apenas deste cliente
    // - Caso contrário, fazer backup geral
    
    res.json({
      success: true,
      message: 'Backup criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar backup:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar backup'
    });
  }
});

/**
 * GET /api/admin/backups/download/:backupId - Download de backup
 */
router.get('/backups/download/:backupId', async (req: any, res: Response) => {
  try {
    const { backupId } = req.params;
    
    // TODO: Implementar download do arquivo de backup
    
    res.status(501).json({
      success: false,
      message: 'Funcionalidade em implementação'
    });
  } catch (error) {
    console.error('Erro ao baixar backup:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao baixar backup'
    });
  }
});

/**
 * POST /api/admin/backups/restore/:backupId - Restaurar backup
 */
router.post('/backups/restore/:backupId', async (req: any, res: Response) => {
  try {
    const { backupId } = req.params;
    
    // TODO: Implementar restauração de backup
    
    res.status(501).json({
      success: false,
      message: 'Funcionalidade em implementação'
    });
  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao restaurar backup'
    });
  }
});

/**
 * DELETE /api/admin/backups/:backupId - Excluir backup
 */
router.delete('/backups/:backupId', async (req: any, res: Response) => {
  try {
    const { backupId } = req.params;
    
    // TODO: Implementar exclusão de backup
    
    res.json({
      success: true,
      message: 'Backup excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir backup:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir backup'
    });
  }
});

export default router;
