/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Modelo: Controle de EPIs
 */
import mongoose, { Document, Schema } from 'mongoose';

export interface IEpiControl extends Document {
  schoolId: string;
  employeeId: string;
  employeeName: string;
  cargo?: string;
  setor?: string;
  // EPI
  epiType: string; // 'Capacete', 'Luva', 'Bota de Segurança', etc.
  epiDescription?: string;
  quantity: number;
  caNumber?: string;       // Certificado de Aprovação (CA)
  brand?: string;          // Marca/Fabricante
  // Datas
  deliveryDate: string;    // YYYY-MM-DD
  expirationDate?: string; // YYYY-MM-DD
  nextInspectionDate?: string; // YYYY-MM-DD
  returnDate?: string;     // YYYY-MM-DD
  // Estado
  condition: 'novo' | 'bom' | 'desgastado' | 'danificado' | 'vencido' | 'devolvido';
  // Controle
  signedReceipt: boolean;  // Assinatura de recebimento
  observations?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const epiControlSchema = new Schema<IEpiControl>(
  {
    schoolId: { type: String, required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, required: true },
    cargo: { type: String },
    setor: { type: String },
    epiType: { type: String, required: true },
    epiDescription: { type: String },
    quantity: { type: Number, required: true, default: 1 },
    caNumber: { type: String },
    brand: { type: String },
    deliveryDate: { type: String, required: true },
    expirationDate: { type: String },
    nextInspectionDate: { type: String },
    returnDate: { type: String },
    condition: {
      type: String,
      enum: ['novo', 'bom', 'desgastado', 'danificado', 'vencido', 'devolvido'],
      default: 'novo',
    },
    signedReceipt: { type: Boolean, default: false },
    observations: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IEpiControl>('EpiControl', epiControlSchema);
