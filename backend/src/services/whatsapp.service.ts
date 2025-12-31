/**
 * Serviço de Integração com WhatsApp Business (Meta Cloud API)
 * 
 * © 2025 Wander Pires Silva Coelho
 * E-mail: wanderpsc@gmail.com
 * WhatsApp: (89) 98139-8723
 */

import axios from 'axios';
import WhatsAppConfig from '../models/WhatsAppConfig';

interface WhatsAppConfigData {
  accessToken: string;
  phoneNumberId: string;
  version: string;
}

interface WhatsAppMessage {
  to: string; // Número do destinatário no formato internacional (ex: 5589981398723)
  message: string;
  recipientName?: string;
  userId: string; // ID da escola para buscar configuração
}

interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class WhatsAppService {
  /**
   * Busca configuração do WhatsApp da escola no banco de dados
   */
  private static async getConfig(userId: string): Promise<WhatsAppConfigData | null> {
    try {
      const config = await WhatsAppConfig.findOne({ userId, isEnabled: true })
        .select('+accessToken'); // Forçar incluir accessToken

      if (!config) {
        console.warn(`⚠️  WhatsApp não configurado para escola ${userId}`);
        return null;
      }

      return {
        accessToken: config.accessToken,
        phoneNumberId: config.phoneNumberId,
        version: config.apiVersion,
      };
    } catch (error: any) {
      console.error('Erro ao buscar config WhatsApp:', error.message);
      return null;
    }
  }

  /**
   * Envia mensagem via WhatsApp Business API oficial
   */
  static async sendMessage(data: WhatsAppMessage): Promise<WhatsAppResponse> {
    try {
      // Buscar configuração da escola
      const config = await this.getConfig(data.userId);
      
      if (!config) {
        return {
          success: false,
          error: 'WhatsApp não configurado para esta escola',
        };
      }

      // Formatar número do destinatário (remover caracteres especiais)
      const toNumber = this.formatPhoneNumber(data.to);

      // Endpoint da Meta Cloud API
      const url = `https://graph.facebook.com/${config.version}/${config.phoneNumberId}/messages`;

      // Payload da mensagem
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toNumber,
        type: 'text',
        text: {
          preview_url: false,
          body: data.message,
        },
      };

      // Enviar requisição
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 segundos
      });

      if (response.data && response.data.messages) {
        const messageId = response.data.messages[0].id;
        console.log(`✅ WhatsApp enviado para ${data.recipientName || toNumber} (ID: ${messageId})`);
        
        // Atualizar estatísticas
        await this.updateStats(data.userId, true);
        
        return {
          success: true,
          messageId,
        };
      }

      return {
        success: false,
        error: 'Resposta inválida da API',
      };

    } catch (error: any) {
      console.error('❌ Erro ao enviar WhatsApp:', error.response?.data || error.message);
      
      // Atualizar estatísticas de falha
      await this.updateStats(data.userId, false);
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Formata número de telefone para o formato internacional
   * Exemplo: (89) 98139-8723 → 5589981398723
   */
  private static formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '');

    // Se não começar com 55 (código do Brasil), adiciona
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }

    return cleaned;
  }

  /**
   * Envia mensagem para múltiplos destinatários
   */
  static async sendBulkMessages(
    recipients: Array<{ phone: string; name?: string }>,
    message: string,
    userId: string
  ): Promise<{ sent: number; failed: number; results: WhatsAppResponse[] }> {
    const results: WhatsAppResponse[] = [];
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const result = await this.sendMessage({
        to: recipient.phone,
        message,
        recipientName: recipient.name,
        userId,
      });

      results.push(result);

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Aguardar 1 segundo entre envios para evitar rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`📊 WhatsApp: ${sent} enviados, ${failed} falhas`);

    return { sent, failed, results };
  }

  /**
   * Atualiza estatísticas de uso
   */
  private static async updateStats(userId: string, success: boolean): Promise<void> {
    try {
      const update: any = {
        lastMessageAt: new Date(),
      };

      if (success) {
        update.$inc = { messagesSent: 1 };
      } else {
        update.$inc = { messagesFailed: 1 };
      }

      await WhatsAppConfig.findOneAndUpdate(
        { userId },
        update
      );
    } catch (error: any) {
      console.error('Erro ao atualizar stats:', error.message);
    }
  }

  /**
   * Verifica se o WhatsApp está configurado para uma escola
   */
  static async isConfigured(userId: string): Promise<boolean> {
    const config = await this.getConfig(userId);
    return !!config;
  }

  /**
   * Testa a configuração do WhatsApp de uma escola
   */
  static async testConnection(userId: string): Promise<{ success: boolean; message: string; phoneNumber?: string }> {
    try {
      const config = await this.getConfig(userId);
      
      if (!config) {
        return {
          success: false,
          message: 'WhatsApp não configurado',
        };
      }

      // Tenta obter informações do número de telefone
      const url = `https://graph.facebook.com/${config.version}/${config.phoneNumberId}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
        },
        timeout: 10000,
      });

      const phoneNumber = response.data.display_phone_number;

      // Atualizar último teste
      await WhatsAppConfig.findOneAndUpdate(
        { userId },
        {
          lastTestedAt: new Date(),
          testStatus: 'success',
          testMessage: `Conectado: ${phoneNumber}`,
          displayPhoneNumber: phoneNumber,
          verifiedAt: new Date(),
        }
      );

      console.log(`✅ WhatsApp conectado (${userId}):`, phoneNumber);
      
      return {
        success: true,
        message: 'Conexão bem-sucedida',
        phoneNumber,
      };

    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      
      // Atualizar último teste
      await WhatsAppConfig.findOneAndUpdate(
        { userId },
        {
          lastTestedAt: new Date(),
          testStatus: 'failed',
          testMessage: errorMsg,
        }
      );

      console.error(`❌ Erro ao testar WhatsApp (${userId}):`, errorMsg);
      
      return {
        success: false,
        message: errorMsg,
      };
    }
  }
}

export default WhatsAppService;
