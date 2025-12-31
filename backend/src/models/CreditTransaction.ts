/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Modelo de Transações de Créditos
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface ICreditTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'purchase' | 'usage' | 'refund' | 'bonus';
  amount: number; // Positivo para compra/bônus, negativo para uso
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  timetableId?: mongoose.Types.ObjectId; // Se foi usado para gerar horário
  numberOfClasses?: number; // Quantas turmas no horário gerado
  paymentMethod?: string;
  transactionId?: string; // ID da transação bancária
  createdAt: Date;
}

const creditTransactionSchema = new Schema<ICreditTransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['purchase', 'usage', 'refund', 'bonus'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    timetableId: {
      type: Schema.Types.ObjectId,
      ref: 'Timetable',
      required: false,
    },
    numberOfClasses: {
      type: Number,
      required: false,
    },
    paymentMethod: {
      type: String,
      required: false,
    },
    transactionId: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Índice para consultas rápidas por usuário
creditTransactionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<ICreditTransaction>('CreditTransaction', creditTransactionSchema);
