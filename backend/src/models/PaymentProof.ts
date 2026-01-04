/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * E-mail: wanderpsc@gmail.com
 * Todos os direitos reservados.
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentProof extends Document {
  schoolId: mongoose.Types.ObjectId;
  schoolName: string;
  schoolEmail: string;
  amount: number;
  paymentMethod: string; // PIX, TED, Boleto, Cartão
  paymentDate: Date;
  proofImage?: string; // Base64 ou URL
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  planName?: string;
  planDuration?: number; // meses
  createdAt: Date;
  updatedAt: Date;
}

const PaymentProofSchema = new Schema<IPaymentProof>({
  schoolId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  schoolName: { type: String, required: true },
  schoolEmail: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  paymentDate: { type: Date, required: true },
  proofImage: { type: String },
  notes: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewNotes: { type: String },
  planName: { type: String },
  planDuration: { type: Number, default: 1 }
}, {
  timestamps: true
});

export default mongoose.model<IPaymentProof>('PaymentProof', PaymentProofSchema);
