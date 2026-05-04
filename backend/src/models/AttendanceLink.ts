/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Modelo: Link de Ponto Eletrônico (AttendanceLink)
 *
 * Link permanente e único por pessoa (professor ou funcionário).
 * Usado para registro de presença via QR Code ou URL direta.
 */
import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export interface IAttendanceLink extends Document {
  token: string;
  schoolId: string;
  schoolName: string;
  personType: 'teacher' | 'employee';
  personId: string;
  personName: string;
  cargo?: string;   // somente para employee
  setor?: string;   // somente para employee
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceLinkSchema = new Schema<IAttendanceLink>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(24).toString('hex'),
    },
    schoolId: { type: String, required: true, index: true },
    schoolName: { type: String, default: '' },
    personType: {
      type: String,
      enum: ['teacher', 'employee'],
      required: true,
    },
    personId: { type: String, required: true },
    personName: { type: String, required: true },
    cargo: { type: String, default: '' },
    setor: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, default: '' },
  },
  { timestamps: true }
);

attendanceLinkSchema.index({ token: 1 }, { unique: true });
attendanceLinkSchema.index({ schoolId: 1, personType: 1, personId: 1 });

export default mongoose.model<IAttendanceLink>('AttendanceLink', attendanceLinkSchema);
