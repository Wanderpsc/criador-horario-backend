/**
 * Rotas para Configuração do WhatsApp Business
 * 
 * © 2025 Wander Pires Silva Coelho
 * E-mail: wanderpsc@gmail.com
 */

import { Router, Response } from 'express';
import { auth, AuthRequest } from '../middleware/auth';
import WhatsAppConfig from '../models/WhatsAppConfig';
import { WhatsAppService } from '../services/whatsapp.service';

const router = Router();

/**
 * GET /api/whatsapp/config
 * Buscar configuração do WhatsApp da escola
 */
router.get('/config', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const config = await WhatsAppConfig.findOne({ userId });

    if (!config) {
      return res.json({
        success: true,
        data: null,
        message: 'WhatsApp não configurado',
      });
    }

    // Não retornar o accessToken por segurança
    const response = {
      isEnabled: config.isEnabled,
      phoneNumberId: config.phoneNumberId,
      businessPhoneNumber: config.businessPhoneNumber,
      displayPhoneNumber: config.displayPhoneNumber,
      apiVersion: config.apiVersion,
      verifiedAt: config.verifiedAt,
      lastTestedAt: config.lastTestedAt,
      testStatus: config.testStatus,
      testMessage: config.testMessage,
      messagesSent: config.messagesSent,
      messagesFailed: config.messagesFailed,
      lastMessageAt: config.lastMessageAt,
      hasToken: !!config.accessToken,
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error('Erro ao buscar config WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar configuração',
      error: error.message,
    });
  }
});

/**
 * POST /api/whatsapp/config
 * Criar ou atualizar configuração do WhatsApp
 */
router.post('/config', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      accessToken,
      phoneNumberId,
      businessPhoneNumber,
      apiVersion = 'v18.0',
    } = req.body;

    // Validar campos obrigatórios
    if (!accessToken || !phoneNumberId || !businessPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: accessToken, phoneNumberId, businessPhoneNumber',
      });
    }

    // Buscar nome da escola (pode vir do body ou usar genérico)
    const schoolName = req.body.schoolName || 'Escola';

    // Criar ou atualizar configuração
    const config = await WhatsAppConfig.findOneAndUpdate(
      { userId },
      {
        userId,
        schoolName,
        accessToken,
        phoneNumberId,
        businessPhoneNumber,
        apiVersion,
        isEnabled: true, // Habilitar automaticamente ao configurar
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Configuração WhatsApp salva para: ${schoolName}`);

    res.json({
      success: true,
      message: 'Configuração salva com sucesso',
      data: {
        isEnabled: config.isEnabled,
        phoneNumberId: config.phoneNumberId,
        businessPhoneNumber: config.businessPhoneNumber,
      },
    });
  } catch (error: any) {
    console.error('Erro ao salvar config WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar configuração',
      error: error.message,
    });
  }
});

/**
 * POST /api/whatsapp/test
 * Testar conexão com WhatsApp Business API
 */
router.post('/test', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado',
      });
    }

    const result = await WhatsAppService.testConnection(userId);

    res.json({
      success: result.success,
      message: result.message,
      phoneNumber: result.phoneNumber,
    });
  } catch (error: any) {
    console.error('Erro ao testar WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao testar conexão',
      error: error.message,
    });
  }
});

/**
 * PUT /api/whatsapp/toggle
 * Ativar/desativar WhatsApp
 */
router.put('/toggle', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { enabled } = req.body;

    const config = await WhatsAppConfig.findOneAndUpdate(
      { userId },
      { isEnabled: enabled },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuração não encontrada. Configure o WhatsApp primeiro.',
      });
    }

    res.json({
      success: true,
      message: `WhatsApp ${enabled ? 'ativado' : 'desativado'}`,
      data: {
        isEnabled: config.isEnabled,
      },
    });
  } catch (error: any) {
    console.error('Erro ao alternar WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao alternar estado',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/whatsapp/config
 * Remover configuração do WhatsApp
 */
router.delete('/config', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    await WhatsAppConfig.findOneAndDelete({ userId });

    res.json({
      success: true,
      message: 'Configuração removida com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao remover config WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao remover configuração',
      error: error.message,
    });
  }
});

/**
 * GET /api/whatsapp/stats
 * Estatísticas de uso do WhatsApp
 */
router.get('/stats', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const config = await WhatsAppConfig.findOne({ userId });

    if (!config) {
      return res.json({
        success: true,
        data: {
          messagesSent: 0,
          messagesFailed: 0,
          lastMessageAt: null,
        },
      });
    }

    res.json({
      success: true,
      data: {
        messagesSent: config.messagesSent,
        messagesFailed: config.messagesFailed,
        lastMessageAt: config.lastMessageAt,
        successRate: config.messagesSent + config.messagesFailed > 0
          ? ((config.messagesSent / (config.messagesSent + config.messagesFailed)) * 100).toFixed(1)
          : '0',
      },
    });
  } catch (error: any) {
    console.error('Erro ao buscar stats WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: error.message,
    });
  }
});

export default router;
