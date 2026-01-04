import axios from 'axios';

// Configuração do Mercado Pago
// IMPORTANTE: Adicionar ACCESS_TOKEN no arquivo .env
const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
const MERCADO_PAGO_API = 'https://api.mercadopago.com/v1';

interface PaymentItem {
  title: string;
  description: string;
  quantity: number;
  unit_price: number;
  currency_id: string;
}

interface PaymentPreference {
  items: PaymentItem[];
  payer?: {
    name?: string;
    email?: string;
  };
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  auto_return?: 'approved' | 'all';
  external_reference?: string;
  notification_url?: string;
  payment_methods?: {
    excluded_payment_types?: Array<{ id: string }>;
    installments?: number;
  };
}

interface PixPaymentRequest {
  transaction_amount: number;
  description: string;
  payment_method_id: 'pix';
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
  external_reference?: string;
  notification_url?: string;
}

class MercadoPagoService {
  private accessToken: string;
  private apiUrl: string;

  constructor() {
    this.accessToken = MERCADO_PAGO_ACCESS_TOKEN;
    this.apiUrl = MERCADO_PAGO_API;
  }

  private getHeaders(idempotencyKey?: string) {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
    
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }
    
    return headers;
  }

  /**
   * Cria uma preferência de pagamento (para checkout transparente ou redirect)
   */
  async createPreference(preferenceData: PaymentPreference) {
    try {
      console.log('🔵 [MP] Criando preferência de pagamento...');
      console.log('📤 [MP] Dados enviados:', JSON.stringify(preferenceData, null, 2));
      
      // URL correta da API de preferências
      const preferencesUrl = 'https://api.mercadopago.com/checkout/preferences';
      
      const response = await axios.post(
        preferencesUrl,
        preferenceData,
        { headers: this.getHeaders() }
      );

      console.log('✅ [MP] Preferência criada com sucesso!');
      console.log('📥 [MP] Resposta:', response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('❌ [MP] Erro ao criar preferência!');
      console.error('📛 [MP] Status:', error.response?.status);
      console.error('📛 [MP] Erro completo:', JSON.stringify(error.response?.data, null, 2));
      console.error('📛 [MP] Headers:', error.response?.headers);
      
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data || 'Erro ao criar preferência de pagamento',
        details: error.response?.data
      };
    }
  }

  /**
   * Cria pagamento PIX e retorna QR Code
   */
  async createPixPayment(paymentData: PixPaymentRequest) {
    try {
      // Gerar chave de idempotência única
      const idempotencyKey = `pix-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      const response = await axios.post(
        `${this.apiUrl}/payments`,
        paymentData,
        { headers: this.getHeaders(idempotencyKey) }
      );

      const payment = response.data;

      return {
        success: true,
        data: {
          id: payment.id,
          status: payment.status,
          qrCode: payment.point_of_interaction?.transaction_data?.qr_code,
          qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
          ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url,
          expirationDate: payment.date_of_expiration
        }
      };
    } catch (error: any) {
      console.error('Erro ao criar pagamento PIX:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao criar pagamento PIX'
      };
    }
  }

  /**
   * Consulta status de um pagamento
   */
  async getPaymentStatus(paymentId: string) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/payments/${paymentId}`,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        status: response.data.status,
        statusDetail: response.data.status_detail,
        amount: response.data.transaction_amount,
        paymentMethod: response.data.payment_method_id,
        data: response.data
      };
    } catch (error: any) {
      console.error('Erro ao consultar pagamento:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Processa notificação de webhook
   */
  async processWebhookNotification(type: string, id: string) {
    try {
      let endpoint = '';
      
      switch (type) {
        case 'payment':
          endpoint = `${this.apiUrl}/payments/${id}`;
          break;
        case 'merchant_order':
          endpoint = `${this.apiUrl}/merchant_orders/${id}`;
          break;
        default:
          return {
            success: false,
            error: 'Tipo de notificação não suportado'
          };
      }

      const response = await axios.get(endpoint, { headers: this.getHeaders() });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Erro ao processar webhook:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao processar notificação'
      };
    }
  }

  /**
   * Cancela um pagamento
   */
  async cancelPayment(paymentId: string) {
    try {
      const response = await axios.put(
        `${this.apiUrl}/payments/${paymentId}`,
        { status: 'cancelled' },
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Erro ao cancelar pagamento:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao cancelar pagamento'
      };
    }
  }

  /**
   * Cria um reembolso
   */
  async refundPayment(paymentId: string, amount?: number) {
    try {
      const refundData: any = {};
      if (amount) {
        refundData.amount = amount;
      }

      const response = await axios.post(
        `${this.apiUrl}/payments/${paymentId}/refunds`,
        refundData,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Erro ao realizar reembolso:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao realizar reembolso'
      };
    }
  }
}

export default new MercadoPagoService();
