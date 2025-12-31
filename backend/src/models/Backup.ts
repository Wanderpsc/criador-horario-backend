/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com
 * Modelo de Backup Automático
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IBackup extends Document {
  userId: mongoose.Types.ObjectId;
  schoolId?: mongoose.Types.ObjectId;
  schoolName: string;
  fileName: string;
  filePath: string;
  size: number; // bytes
  sizeFormatted: string; // "10.5 MB"
  type: 'automatic' | 'manual';
  status: 'pending' | 'completed' | 'failed' | 'restored';
  createdAt: Date;
  restoredAt?: Date;
  restoredBy?: mongoose.Types.ObjectId;
  error?: string;
  metadata: {
    loginCount?: number;
    collections?: string[];
    documentsCount?: number;
    databaseVersion?: string;
  };
}

const BackupSchema = new Schema<IBackup>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      index: true,
    },
    schoolName: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      default: 0,
    },
    sizeFormatted: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['automatic', 'manual'],
      default: 'automatic',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'restored'],
      default: 'pending',
    },
    restoredAt: {
      type: Date,
    },
    restoredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    error: {
      type: String,
    },
    metadata: {
      loginCount: Number,
      collections: [String],
      documentsCount: Number,
      databaseVersion: String,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para consultas rápidas
BackupSchema.index({ userId: 1, createdAt: -1 });
BackupSchema.index({ status: 1, createdAt: -1 });
BackupSchema.index({ schoolId: 1, createdAt: -1 });

export default mongoose.model<IBackup>('Backup', BackupSchema);
