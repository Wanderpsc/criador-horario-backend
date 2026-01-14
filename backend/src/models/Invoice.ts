/**
 * Modelo de Nota Fiscal
 * © 2025-2026 Wander Pires Silva Coelho
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice extends Document {
  invoiceNumber: string; // Número da nota fiscal
  serie: string; // Série da nota
  issueDate: Date;
  
  // Prestador de Serviço (Você)
  provider: {
    name: string;
    cpfCnpj: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    email: string;
    phone: string;
    municipalRegistration?: string;
  };
  
  // Tomador de Serviço (Cliente - Escola)
  customer: {
    schoolId: mongoose.Types.ObjectId;
    name: string;
    cpfCnpj: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    email: string;
    phone: string;
  };
  
  // Serviço Prestado
  service: {
    description: string;
    code: string; // Código do serviço conforme tabela municipal
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  };
  
  // Valores
  values: {
    serviceValue: number;
    issRate: number; // Alíquota ISS (%)
    issValue: number; // Valor ISS
    deductions: number;
    netValue: number; // Valor líquido
    taxWithholding: boolean; // Retenção de impostos
  };
  
  // Impostos
  taxes: {
    iss: number;
    cofins?: number;
    pis?: number;
    csll?: number;
    ir?: number;
  };
  
  // Dados do Pagamento
  payment: {
    paymentId: string;
    method: string;
    date: Date;
    plan: string;
  };
  
  // Observações
  observations?: string;
  
  // Status
  status: 'pending' | 'issued' | 'sent' | 'cancelled';
  
  // PDF
  pdfPath?: string;
  pdfUrl?: string;
  
  // Auditoria
  issuedBy: mongoose.Types.ObjectId;
  issuedAt?: Date;
  sentAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  
  copyright: string;
}

const InvoiceSchema = new Schema<IInvoice>({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  serie: {
    type: String,
    default: '001'
  },
  issueDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  provider: {
    name: { type: String, required: true },
    cpfCnpj: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    municipalRegistration: { type: String }
  },
  
  customer: {
    schoolId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    cpfCnpj: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }
  },
  
  service: {
    description: { type: String, required: true },
    code: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
  },
  
  values: {
    serviceValue: { type: Number, required: true },
    issRate: { type: Number, required: true, default: 2.0 },
    issValue: { type: Number, required: true },
    deductions: { type: Number, default: 0 },
    netValue: { type: Number, required: true },
    taxWithholding: { type: Boolean, default: false }
  },
  
  taxes: {
    iss: { type: Number, required: true },
    cofins: { type: Number, default: 0 },
    pis: { type: Number, default: 0 },
    csll: { type: Number, default: 0 },
    ir: { type: Number, default: 0 }
  },
  
  payment: {
    paymentId: { type: String, required: true },
    method: { type: String, required: true },
    date: { type: Date, required: true },
    plan: { type: String, required: true }
  },
  
  observations: { type: String },
  
  status: {
    type: String,
    enum: ['pending', 'issued', 'sent', 'cancelled'],
    default: 'pending'
  },
  
  pdfPath: { type: String },
  pdfUrl: { type: String },
  
  issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  issuedAt: { type: Date },
  sentAt: { type: Date },
  cancelledAt: { type: Date },
  cancelReason: { type: String },
  
  copyright: {
    type: String,
    default: '© 2025-2026 Wander Pires Silva Coelho',
    immutable: true
  }
}, {
  timestamps: true,
  collection: 'invoices'
});

// Índices
InvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ 'customer.schoolId': 1 });
InvoiceSchema.index({ issueDate: -1 });
InvoiceSchema.index({ status: 1 });

// Gerar número sequencial de nota fiscal
InvoiceSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = String(count + 1).padStart(8, '0');
  }
  next();
});

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
