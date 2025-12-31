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

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Cria uma preferência de pagamento (para checkout transparente ou redirect)
   */
  async createPreference(preferenceData: PaymentPreference) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/checkout/preferences`,
        preferenceData,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Erro ao criar preferência MP:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao criar preferência de pagamento'
      };
    }
  }

  /**
   * Cria pagamento PIX e retorna QR Code
   */
  async createPixPayment(paymentData: PixPaymentRequest) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/payments`,
        paymentData,
        { headers: this.getHeaders() }
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
        data: response.data
      };
    } catch (error: any) {
      console.error('Erro ao consultar pagamento:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao consultar pagamento'
      };
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
