import express from 'express';
import { body, validationResult } from 'express-validator';
import License from '../models/License';
import User from '../models/User';
import { auth, adminOnly, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';
import * as licenseEmailService from '../services/licenseEmailService';
import * as licenseNotificationService from '../services/licenseNotificationService';

const router = express.Router();

// Gerar nova licença (apenas admin)
router.post('/', auth, adminOnly,
  [
    body('expiryDate').isISO8601().withMessage('Data de expiração inválida'),
    body('maxSchools').isNumeric().withMessage('Número de escolas deve ser um número')
  ],
  async (req: AuthRequest, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const key = crypto.randomBytes(16).toString('hex').toUpperCase();

      const license = new License({
        key,
        expiryDate: req.body.expiryDate,
        maxSchools: req.body.maxSchools || 1,
        createdBy: req.user!.id
      });

      await license.save();
      
      // Enviar email de notificação (opcional - não bloqueia criação se falhar)
      if (req.body.userEmail && req.body.userName) {
        try {
          await licenseEmailService.sendLicenseCreatedEmail({
            userEmail: req.body.userEmail,
            userName: req.body.userName,
            key: license.key,
            expiresAt: license.expiresAt,
            maxSchools: license.maxSchools,
            price: req.body.price
          });
        } catch (emailError) {
          console.error('Erro ao enviar email de criação de licença:', emailError);
        }
      }
      
      res.status(201).json(license);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Ativar licença
router.post('/activate', auth,
  [body('key').notEmpty().withMessage('Chave da licença é obrigatória')],
  async (req: AuthRequest, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const license = await License.findOne({ key: req.body.key, isActive: true });
      if (!license) {
        return res.status(404).json({ message: 'Licença não encontrada ou inválida' });
      }

      if (license.expiresAt && license.expiresAt < new Date()) {
        return res.status(400).json({ message: 'Licença expirada' });
      }

      if (license.userId) {
        return res.status(400).json({ message: 'Licença já está em uso' });
      }

      license.userId = req.user!.id as any;
      await license.save();

      await User.findByIdAndUpdate(req.user!.id, {
        licenseKey: license.key
      });

      res.json({ message: 'Licença ativada com sucesso', license });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Listar todas as licenças (apenas admin)
router.get('/', auth, adminOnly, async (req: AuthRequest, res) => {
  try {
    const licenses = await License.find().populate('userId', 'name email schoolName');
    res.json({ success: true, data: licenses });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verificar licença do usuário
router.get('/my-license', auth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user!.id);
    
    // Usuários pay-per-use não precisam de licença tradicional
    if (user && user.paymentModel === 'pay-per-use') {
      return res.json({
        key: 'PAY_PER_USE',
        isActive: true,
        expiryDate: null,
        maxSchools: 1,
        userId: user._id,
        paymentModel: 'pay-per-use',
        credits: user.credits || 0,
        message: 'Usuário utiliza modelo de pagamento por horário'
      });
    }
    
    if (!user || !user.licenseKey) {
      return res.status(404).json({ message: 'Licença não encontrada' });
    }

    const license = await License.findOne({ key: user.licenseKey });
    res.json(license);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Desativar licença (apenas admin)
router.patch('/:id/deactivate', auth, adminOnly, async (req: AuthRequest, res) => {
  try {
    const license = await License.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!license) {
      return res.status(404).json({ message: 'Licença não encontrada' });
    }
    res.json(license);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Excluir licença (apenas admin)
router.delete('/:id', auth, adminOnly, async (req: AuthRequest, res) => {
  try {
    const license = await License.findByIdAndDelete(req.params.id);
    if (!license) {
      return res.status(404).json({ message: 'Licença não encontrada' });
    }
    res.json({ success: true, message: 'Licença excluída com sucesso' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Enviar notificação manual (apenas admin)
router.post('/:id/notify', auth, adminOnly,
  [body('type').isIn(['created', 'expiring', 'expired', 'renewed']).withMessage('Tipo de notificação inválido')],
  async (req: AuthRequest, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await licenseNotificationService.sendManualNotification(req.params.id, req.body.type);
      res.json({ success: true, message: 'Notificação enviada com sucesso' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Verificar licenças expirando e expiradas (apenas admin) - para testes manuais
router.post('/check/expiring', auth, adminOnly, async (req: AuthRequest, res: any) => {
  try {
    const result = await licenseNotificationService.runDailyCheck();
    res.json({ 
      success: true, 
      message: 'Verificação concluída',
      result
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
