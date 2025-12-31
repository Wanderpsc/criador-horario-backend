/**
 * Serviço de Notificações Automáticas
 * © 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com
 */

import Notification from '../models/Notification';
import User from '../models/User';
import License from '../models/License';

export class AutoNotificationService {
  /**
   * Enviar notificação de boas-vindas
   */
  static async sendWelcomeNotification(userId: string) {
    try {
      await Notification.create({
        userId,
        type: 'system',
        title: '🎉 Bem-vindo ao EduSync-PRO!',
        message: 'Obrigado por escolher nosso sistema! Explore todas as funcionalidades e crie seus horários de forma inteligente.',
        priority: 'high',
        read: false,
        actionUrl: '/dashboard',
        metadata: {
          channel: 'internal'
        }
      });
    } catch (error) {
      console.error('Erro ao enviar notificação de boas-vindas:', error);
    }
  }

  /**
   * Notificar sobre atualização do sistema
   */
  static async sendSystemUpdateNotification(title: string, message: string) {
    try {
      const users = await User.find({ role: { $ne: 'admin' } });
      
      await Promise.all(
        users.map(user =>
          Notification.create({
            userId: user._id.toString(),
            type: 'update',
            title: `⚡ ${title}`,
            message,
            priority: 'medium',
            read: false,
            metadata: {
              channel: 'internal'
            }
          })
        )
      );

      return users.length;
    } catch (error) {
      console.error('Erro ao enviar notificação de atualização:', error);
      return 0;
    }
  }

  /**
   * Notificar sobre vencimento de licença (7 dias antes)
   */
  static async checkLicenseExpiration() {
    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const expiringLicenses = await License.find({
        status: 'active',
        expirationDate: {
          $lte: sevenDaysFromNow,
          $gte: new Date()
        }
      });

      for (const license of expiringLicenses) {
        // Verificar se userId e expirationDate existem
        if (!license.userId || !license.expirationDate) {
          console.warn('Licença sem userId ou expirationDate:', license._id);
          continue;
        }

        const daysLeft = Math.ceil(
          (new Date(license.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        await Notification.create({
          userId: license.userId.toString(),
          type: 'license',
          title: '⚠️ Sua licença está expirando!',
          message: `Sua licença do plano ${license.plan || 'Básico'} expira em ${daysLeft} dia(s). Renove agora para não perder o acesso!`,
          priority: daysLeft <= 3 ? 'urgent' : 'high',
          read: false,
          actionUrl: '/license-management',
          metadata: {
            channel: 'internal',
            licenseId: license._id.toString(),
            dueDate: license.expirationDate
          }
        });
      }

      return expiringLicenses.length;
    } catch (error) {
      console.error('Erro ao verificar licenças expirando:', error);
      return 0;
    }
  }

  /**
   * Notificar sobre pagamento pendente
   */
  static async sendPaymentReminderNotification(
    userId: string,
    amount: number,
    dueDate: Date,
    invoiceId?: string
  ) {
    try {
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
      if (daysUntilDue <= 0) priority = 'urgent';
      else if (daysUntilDue <= 3) priority = 'high';

      await Notification.create({
        userId,
        type: 'payment',
        title: daysUntilDue <= 0 ? '🚨 Pagamento Vencido!' : '💳 Lembrete de Pagamento',
        message: daysUntilDue <= 0
          ? `Seu pagamento de R$ ${amount.toFixed(2)} está vencido desde ${dueDate.toLocaleDateString('pt-BR')}. Regularize para manter o acesso.`
          : `Você tem um pagamento de R$ ${amount.toFixed(2)} vencendo em ${daysUntilDue} dia(s).`,
        priority,
        read: false,
        actionUrl: '/sales-management',
        metadata: {
          channel: 'internal',
          amount,
          dueDate,
          invoiceId
        }
      });
    } catch (error) {
      console.error('Erro ao enviar lembrete de pagamento:', error);
    }
  }

  /**
   * Notificar confirmação de pagamento
   */
  static async sendPaymentConfirmationNotification(
    userId: string,
    amount: number,
    paymentId: string
  ) {
    try {
      await Notification.create({
        userId,
        type: 'payment',
        title: '✅ Pagamento Confirmado!',
        message: `Recebemos seu pagamento de R$ ${amount.toFixed(2)}. Obrigado! Seu acesso está garantido.`,
        priority: 'high',
        read: false,
        actionUrl: '/sales-management',
        metadata: {
          channel: 'internal',
          amount,
          paymentId
        }
      });
    } catch (error) {
      console.error('Erro ao enviar confirmação de pagamento:', error);
    }
  }

  /**
   * Notificar sobre nota fiscal disponível
   */
  static async sendInvoiceAvailableNotification(
    userId: string,
    invoiceNumber: string,
    amount: number,
    downloadUrl: string
  ) {
    try {
      await Notification.create({
        userId,
        type: 'invoice',
        title: '📄 Nota Fiscal Disponível',
        message: `Sua nota fiscal #${invoiceNumber} no valor de R$ ${amount.toFixed(2)} está disponível para download.`,
        priority: 'medium',
        read: false,
        actionUrl: downloadUrl,
        metadata: {
          channel: 'internal',
          invoiceId: invoiceNumber,
          amount
        }
      });
    } catch (error) {
      console.error('Erro ao enviar notificação de nota fiscal:', error);
    }
  }

  /**
   * Notificar sobre licença renovada
   */
  static async sendLicenseRenewedNotification(
    userId: string,
    plan: string,
    expirationDate: Date
  ) {
    try {
      await Notification.create({
        userId,
        type: 'license',
        title: '🎊 Licença Renovada com Sucesso!',
        message: `Sua licença do plano ${plan} foi renovada! Nova data de validade: ${expirationDate.toLocaleDateString('pt-BR')}.`,
        priority: 'high',
        read: false,
        actionUrl: '/license-management',
        metadata: {
          channel: 'internal',
          dueDate: expirationDate
        }
      });
    } catch (error) {
      console.error('Erro ao enviar notificação de renovação:', error);
    }
  }
}
