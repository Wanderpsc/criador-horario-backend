/**
 * Middleware de verificação de licença e pagamento
 * © 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com
 */

import { Response, NextFunction } from 'express';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'school';
  };
}

/**
 * Verifica se a licença está ativa e paga
 */
export const checkLicenseAndPayment = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    // Admin sempre tem acesso
    if (req.user?.role === 'admin') {
      return next();
    }

    const user = await User.findById(req.user?.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verifica aprovação do admin
    if (!user.approvedByAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado: Aguardando aprovação do administrador',
        code: 'PENDING_APPROVAL'
      });
    }

    // Verifica status de pagamento
    if (user.paymentStatus !== 'paid') {
      let message = 'Acesso negado: ';
      switch (user.paymentStatus) {
        case 'pending':
          message += 'Pagamento pendente. Entre em contato com o administrador.';
          break;
        case 'expired':
          message += 'Licença expirada. Renove sua assinatura.';
          break;
        case 'cancelled':
          message += 'Licença cancelada. Entre em contato com o suporte.';
          break;
      }

      return res.status(403).json({
        success: false,
        message,
        code: 'PAYMENT_REQUIRED',
        paymentStatus: user.paymentStatus
      });
    }

    // Verifica data de expiração
    if (user.licenseExpiryDate && user.licenseExpiryDate < new Date()) {
      // Atualiza status para expirado
      user.paymentStatus = 'expired';
      await user.save();

      return res.status(403).json({
        success: false,
        message: 'Licença expirada em ' + user.licenseExpiryDate.toLocaleDateString('pt-BR'),
        code: 'LICENSE_EXPIRED',
        expiryDate: user.licenseExpiryDate
      });
    }

    // Tudo OK, permite acesso
    next();
  } catch (error) {
    console.error('Erro ao verificar licença:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar licença'
    });
  }
};

/**
 * Middleware apenas para admin
 */
export const requireAdmin = (
  req: any,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado: Apenas administradores'
    });
  }
  next();
};
