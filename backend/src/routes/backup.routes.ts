/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com
 * Rotas de Gerenciamento de Backups
 */

import express from 'express';
import { auth as requireAuth } from '../middleware/auth';
import { AutoBackupService } from '../services/auto-backup.service';
import Backup from '../models/Backup';

const router = express.Router();

/**
 * GET /backups
 * Lista todos os backups (admin) ou backups do usuário (cliente)
 */
router.get('/', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.role === 'admin' ? undefined : req.user.id;
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const backups = await AutoBackupService.listBackups({
      userId,
      status,
      limit,
    });

    res.json({
      success: true,
      count: backups.length,
      backups,
    });
  } catch (error: any) {
    console.error('[Backup Routes] Erro ao listar backups:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar backups',
      error: error.message,
    });
  }
});

/**
 * GET /backups/statistics
 * Estatísticas gerais de backups (apenas admin)
 */
router.get('/statistics', requireAuth, async (req: any, res: any) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem acessar estatísticas.',
      });
    }

    const stats = await AutoBackupService.getStatistics();

    res.json({
      success: true,
      statistics: stats,
    });
  } catch (error: any) {
    console.error('[Backup Routes] Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas',
      error: error.message,
    });
  }
});

/**
 * GET /backups/:id
 * Obtém detalhes de um backup específico
 */
router.get('/:id', requireAuth, async (req: any, res: any) => {
  try {
    const backup = await Backup.findById(req.params.id)
      .populate('userId', 'name email schoolName')
      .populate('restoredBy', 'name email');

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup não encontrado',
      });
    }

    // Verificar permissão
    if (req.user.role !== 'admin' && backup.userId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado',
      });
    }

    res.json({
      success: true,
      backup,
    });
  } catch (error: any) {
    console.error('[Backup Routes] Erro ao obter backup:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter backup',
      error: error.message,
    });
  }
});

/**
 * POST /backups/restore/:id
 * Restaura um backup específico (apenas admin)
 */
router.post('/restore/:id', requireAuth, async (req: any, res: any) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem restaurar backups.',
      });
    }

    await AutoBackupService.restoreBackup(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Backup restaurado com sucesso',
    });
  } catch (error: any) {
    console.error('[Backup Routes] Erro ao restaurar backup:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao restaurar backup',
      error: error.message,
    });
  }
});

/**
 * POST /backups/manual
 * Cria um backup manual (admin ou cliente)
 */
router.post('/manual', requireAuth, async (req: any, res: any) => {
  try {
    await AutoBackupService.createLoginBackup(req.user.id);

    res.json({
      success: true,
      message: 'Backup manual iniciado com sucesso',
    });
  } catch (error: any) {
    console.error('[Backup Routes] Erro ao criar backup manual:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar backup manual',
      error: error.message,
    });
  }
});

/**
 * DELETE /backups/:id
 * Deleta um backup (apenas admin)
 */
router.delete('/:id', requireAuth, async (req: any, res: any) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem deletar backups.',
      });
    }

    await AutoBackupService.deleteBackup(req.params.id);

    res.json({
      success: true,
      message: 'Backup deletado com sucesso',
    });
  } catch (error: any) {
    console.error('[Backup Routes] Erro ao deletar backup:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar backup',
      error: error.message,
    });
  }
});

export default router;
