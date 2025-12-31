/**
 * Rotas de Admin - Sistema de Licenciamento Completo
 * © 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com
 */

import { Router, Response } from 'express';
import User from '../models/User';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/license';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/schools - Listar todas as escolas
 */
router.get('/', async (req: any, res: Response) => {
  try {
    const schools = await User.find({ 
      role: { $in: ['user', 'school'] },
      schoolName: { $exists: true, $ne: null }
    })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: schools.map(school => ({
        id: school._id,
        email: school.email,
        schoolName: school.schoolName,
        isActive: school.isActive || false,
        approvedByAdmin: school.approvedByAdmin || false,
        licenseExpiryDate: school.licenseExpiryDate,
        maxUsers: school.maxUsers || 0,
        paymentStatus: school.paymentStatus || 'pending',
        createdAt: school.createdAt,
        schoolId: school.school
      }))
    });
  } catch (error) {
    console.error('Erro ao listar escolas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar escolas'
    });
  }
});

/**
 * GET /api/admin/schools/stats - Estatísticas gerais
 */
router.get('/stats', async (req: any, res: Response) => {
  try {
    const totalSchools = await User.countDocuments({ 
      role: { $in: ['user', 'school'] },
      schoolName: { $exists: true }
    });
    
    const activeSchools = await User.countDocuments({ 
      role: { $in: ['user', 'school'] },
      schoolName: { $exists: true },
      isActive: true 
    });

    const pendingApproval = await User.countDocuments({
      role: { $in: ['user', 'school'] },
      schoolName: { $exists: true },
      approvedByAdmin: false
    });

    const expiredLicenses = await User.countDocuments({
      role: { $in: ['user', 'school'] },
      schoolName: { $exists: true },
      licenseExpiryDate: { $lt: new Date() }
    });

    res.json({
      success: true,
      data: {
        totalSchools,
        activeSchools,
        inactiveSchools: totalSchools - activeSchools,
        pendingApproval,
        expiredLicenses
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
 * GET /api/admin/schools/:id - Obter detalhes de uma escola
 */
router.get('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const school = await User.findById(id).select('-password');

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        id: school._id,
        email: school.email,
        schoolName: school.schoolName,
        isActive: school.isActive || false,
        approvedByAdmin: school.approvedByAdmin || false,
        licenseExpiryDate: school.licenseExpiryDate,
        maxUsers: school.maxUsers || 0,
        paymentStatus: school.paymentStatus || 'pending',
        createdAt: school.createdAt,
        schoolId: school.school
      }
    });
  } catch (error) {
    console.error('Erro ao obter escola:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter dados da escola'
    });
  }
});

/**
 * PUT /api/admin/schools/:id/approve - Aprovar escola e configurar licença
 */
router.put('/:id/approve', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { licenseExpiryDate, maxUsers } = req.body;

    if (!licenseExpiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Data de expiração da licença é obrigatória'
      });
    }

    const school = await User.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    // Aprovar e ativar
    school.approvedByAdmin = true;
    school.isActive = true;
    school.licenseExpiryDate = new Date(licenseExpiryDate);
    school.maxUsers = maxUsers || 50;
    school.paymentStatus = 'paid';

    await school.save();

    res.json({
      success: true,
      message: 'Escola aprovada e licença ativada com sucesso',
      data: {
        id: school._id,
        email: school.email,
        schoolName: school.schoolName,
        isActive: school.isActive,
        approvedByAdmin: school.approvedByAdmin,
        licenseExpiryDate: school.licenseExpiryDate,
        maxUsers: school.maxUsers,
        paymentStatus: school.paymentStatus
      }
    });
  } catch (error) {
    console.error('Erro ao aprovar escola:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao aprovar escola'
    });
  }
});

/**
 * PUT /api/admin/schools/:id/toggle - Ativar/Desativar escola
 */
router.put('/:id/toggle', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const school = await User.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    school.isActive = !school.isActive;
    await school.save();

    res.json({
      success: true,
      message: `Escola ${school.isActive ? 'ativada' : 'desativada'} com sucesso`,
      data: {
        id: school._id,
        isActive: school.isActive
      }
    });
  } catch (error) {
    console.error('Erro ao alterar status da escola:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao alterar status da escola'
    });
  }
});

/**
 * PUT /api/admin/schools/:id/license - Atualizar licença
 */
router.put('/:id/license', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { licenseExpiryDate, maxUsers, paymentStatus } = req.body;

    const school = await User.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    if (licenseExpiryDate) {
      school.licenseExpiryDate = new Date(licenseExpiryDate);
    }
    if (maxUsers !== undefined) {
      school.maxUsers = maxUsers;
    }
    if (paymentStatus) {
      school.paymentStatus = paymentStatus;
    }

    await school.save();

    res.json({
      success: true,
      message: 'Licença atualizada com sucesso',
      data: {
        id: school._id,
        licenseExpiryDate: school.licenseExpiryDate,
        maxUsers: school.maxUsers,
        paymentStatus: school.paymentStatus
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar licença:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar licença'
    });
  }
});

/**
 * DELETE /api/admin/schools/:id - Deletar escola
 */
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const school = await User.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Escola deletada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar escola:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar escola'
    });
  }
});

export default router;
