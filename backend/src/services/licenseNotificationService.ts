/**
 * Serviço de Verificação e Notificação de Licenças
 * © 2025 Wander Pires Silva Coelho
 * 
 * Responsável por verificar licenças próximas do vencimento
 * e enviar notificações automáticas
 */

import License from '../models/License';
import User from '../models/User';
import * as licenseEmailService from './licenseEmailService';

/**
 * Verifica e notifica licenças próximas do vencimento (7 dias)
 */
export const checkExpiringLicenses = async () => {
  try {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const eightDaysFromNow = new Date();
    eightDaysFromNow.setDate(eightDaysFromNow.getDate() + 8);

    // Buscar licenças que vencerão entre 7 e 8 dias (para notificar apenas uma vez)
    const expiringLicenses = await License.find({
      isActive: true,
      expiresAt: {
        $gte: sevenDaysFromNow,
        $lt: eightDaysFromNow,
      },
    });

    console.log(`[Notificação] Encontradas ${expiringLicenses.length} licenças expirando em 7 dias`);

    for (const license of expiringLicenses) {
      if (license.userId) {
        const user = await User.findById(license.userId);
        if (user && user.email) {
          try {
            await licenseEmailService.sendLicenseExpiringEmail({
              userEmail: user.email,
              userName: user.name || 'Usuário',
              key: license.key,
              expiresAt: license.expiresAt,
            });
            console.log(`[Notificação] Email de vencimento enviado para ${user.email}`);
          } catch (error) {
            console.error(`[Notificação] Erro ao enviar email para ${user.email}:`, error);
          }
        }
      }
    }

    return expiringLicenses.length;
  } catch (error) {
    console.error('[Notificação] Erro ao verificar licenças expirando:', error);
    throw error;
  }
};

/**
 * Verifica e notifica licenças que expiraram hoje
 */
export const checkExpiredLicenses = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Buscar licenças que expiraram hoje
    const expiredLicenses = await License.find({
      isActive: true,
      expiresAt: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    console.log(`[Notificação] Encontradas ${expiredLicenses.length} licenças expiradas hoje`);

    for (const license of expiredLicenses) {
      // Desativar a licença
      license.isActive = false;
      await license.save();

      if (license.userId) {
        const user = await User.findById(license.userId);
        if (user && user.email) {
          try {
            await licenseEmailService.sendLicenseExpiredEmail({
              userEmail: user.email,
              userName: user.name || 'Usuário',
              key: license.key,
              expiresAt: license.expiresAt,
            });
            console.log(`[Notificação] Email de expiração enviado para ${user.email}`);
          } catch (error) {
            console.error(`[Notificação] Erro ao enviar email para ${user.email}:`, error);
          }
        }
      }
    }

    return expiredLicenses.length;
  } catch (error) {
    console.error('[Notificação] Erro ao verificar licenças expiradas:', error);
    throw error;
  }
};

/**
 * Verifica todas as licenças e envia notificações apropriadas
 */
export const runDailyCheck = async () => {
  console.log('[Notificação] Iniciando verificação diária de licenças...');
  
  const expiring = await checkExpiringLicenses();
  const expired = await checkExpiredLicenses();
  
  console.log(`[Notificação] Verificação completa: ${expiring} expirando, ${expired} expiradas`);
  
  return { expiring, expired };
};

/**
 * Envia notificação manual para uma licença específica
 */
export const sendManualNotification = async (licenseId: string, notificationType: 'created' | 'expiring' | 'expired' | 'renewed') => {
  try {
    const license = await License.findById(licenseId);
    if (!license) {
      throw new Error('Licença não encontrada');
    }

    if (!license.userId) {
      throw new Error('Licença não está associada a um usuário');
    }

    const user = await User.findById(license.userId);
    if (!user || !user.email) {
      throw new Error('Usuário não encontrado ou sem email');
    }

    const emailData = {
      userEmail: user.email,
      userName: user.name || 'Usuário',
      key: license.key,
      expiresAt: license.expiresAt,
      maxSchools: license.maxSchools,
    };

    switch (notificationType) {
      case 'created':
        await licenseEmailService.sendLicenseCreatedEmail(emailData);
        break;
      case 'expiring':
        await licenseEmailService.sendLicenseExpiringEmail(emailData);
        break;
      case 'expired':
        await licenseEmailService.sendLicenseExpiredEmail(emailData);
        break;
      case 'renewed':
        await licenseEmailService.sendLicenseRenewedEmail(emailData);
        break;
      default:
        throw new Error('Tipo de notificação inválido');
    }

    return { success: true, message: 'Notificação enviada com sucesso' };
  } catch (error) {
    console.error('[Notificação] Erro ao enviar notificação manual:', error);
    throw error;
  }
};

export default {
  checkExpiringLicenses,
  checkExpiredLicenses,
  runDailyCheck,
  sendManualNotification,
};
