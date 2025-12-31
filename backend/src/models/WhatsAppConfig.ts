/**
 * Modelo de Configuração do WhatsApp Business por Escola
 * 
 * © 2025 Wander Pires Silva Coelho
 * E-mail: wanderpsc@gmail.com
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IWhatsAppConfig extends Document {
  userId: string; // ID da escola/usuário
  schoolName: string; // Nome da escola
  isEnabled: boolean; // WhatsApp ativado/desativado
  
  // Credenciais da Meta Cloud API
  accessToken: string; // Token de acesso (criptografado)
  phoneNumberId: string; // ID do número de telefone
  businessPhoneNumber: string; // Número formatado (ex: 5589981398723)
  displayPhoneNumber?: string; // Número para exibição (ex: (89) 98139-8723)
  
  // Configurações
  apiVersion: string; // Versão da API (ex: v18.0)
  
  // Metadados
  verifiedAt?: Date; // Quando foi verificado pela última vez
  lastTestedAt?: Date; // Último teste de conexão
  testStatus?: 'success' | 'failed'; // Status do último teste
  testMessage?: string; // Mensagem do último teste
  
  // Estatísticas
  messagesSent: number; // Total de mensagens enviadas
  messagesFailed: number; // Total de falhas
  lastMessageAt?: Date; // Última mensagem enviada
  
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppConfigSchema = new Schema<IWhatsAppConfig>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    schoolName: {
      type: String,
      required: true,
    },
    isEnabled: {
      type: Boolean,
      default: false,
    },
    accessToken: {
      type: String,
      required: true,
      select: false, // Não retornar por padrão (segurança)
    },
    phoneNumberId: {
      type: String,
      required: true,
    },
    businessPhoneNumber: {
      type: String,
      required: true,
    },
    displayPhoneNumber: {
      type: String,
    },
    apiVersion: {
      type: String,
      default: 'v18.0',
    },
    verifiedAt: {
      type: Date,
    },
    lastTestedAt: {
      type: Date,
    },
    testStatus: {
      type: String,
      enum: ['success', 'failed'],
    },
    testMessage: {
      type: String,
    },
    messagesSent: {
      type: Number,
      default: 0,
    },
    messagesFailed: {
      type: Number,
      default: 0,
    },
    lastMessageAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index para busca por userId
whatsAppConfigSchema.index({ userId: 1 });

const WhatsAppConfig = mongoose.model<IWhatsAppConfig>('WhatsAppConfig', whatsAppConfigSchema);

export default WhatsAppConfig;
