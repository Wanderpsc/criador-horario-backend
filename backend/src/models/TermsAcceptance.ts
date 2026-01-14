/**
 * Modelo de Aceite de Termos
 * © 2025-2026 Wander Pires Silva Coelho
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ITermsAcceptance extends Document {
  userId: mongoose.Types.ObjectId;
  schoolId?: mongoose.Types.ObjectId;
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: Date;
  ipAddress: string;
  userAgent: string;
  digitalSignature: string; // Hash único do aceite
  copyright: string;
}

const TermsAcceptanceSchema = new Schema<ITermsAcceptance>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  schoolId: {
    type: Schema.Types.ObjectId,
    ref: 'School'
  },
  termsVersion: {
    type: String,
    required: true,
    default: '1.0'
  },
  privacyVersion: {
    type: String,
    required: true,
    default: '1.0'
  },
  acceptedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  digitalSignature: {
    type: String,
    required: true,
    unique: true
  },
  copyright: {
    type: String,
    default: '© 2025-2026 Wander Pires Silva Coelho',
    immutable: true
  }
}, {
  timestamps: true,
  collection: 'terms_acceptances'
});

// Índices para performance
TermsAcceptanceSchema.index({ userId: 1, termsVersion: 1 });
TermsAcceptanceSchema.index({ digitalSignature: 1 }, { unique: true });
TermsAcceptanceSchema.index({ acceptedAt: -1 });

export default mongoose.model<ITermsAcceptance>('TermsAcceptance', TermsAcceptanceSchema);
