import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  schoolId: mongoose.Types.ObjectId;
  schoolName: string;
  schoolEmail: string;
  plan: 'trial' | 'micro' | 'basico' | 'profissional' | 'personalizado' | 'enterprise';
  durationMonths: number;
  amount: number;
  paymentMethod: 'pix' | 'credit_card' | 'boleto';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  mercadoPagoId?: string;
  mercadoPagoStatus?: string;
  preferenceId?: string;
  externalReference: string;
  pixQRCode?: string;
  pixQRCodeBase64?: string;
  pixCopyPaste?: string;
  paymentLink?: string;
  approvedAt?: Date;
  rejectedReason?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    schoolName: {
      type: String,
      required: true
    },
    schoolEmail: {
      type: String,
      required: true
    },
    plan: {
      type: String,
      enum: ['trial', 'micro', 'basico', 'profissional', 'personalizado', 'enterprise'],
      required: true
    },
    durationMonths: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: ['pix', 'credit_card', 'boleto'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled', 'refunded'],
      default: 'pending',
      index: true
    },
    mercadoPagoId: {
      type: String,
      index: true
    },
    mercadoPagoStatus: String,
    preferenceId: String,
    externalReference: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    pixQRCode: String,
    pixQRCodeBase64: String,
    pixCopyPaste: String,
    paymentLink: String,
    approvedAt: Date,
    rejectedReason: String,
    metadata: Schema.Types.Mixed
  },
  {
    timestamps: true
  }
);

// Índices compostos para buscas eficientes
PaymentSchema.index({ schoolId: 1, status: 1 });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ externalReference: 1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
