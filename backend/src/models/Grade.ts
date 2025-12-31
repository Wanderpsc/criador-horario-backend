/**
 * Modelo de Grade/Série
 * © 2025 Wander Pires Silva Coelho
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IGrade extends Document {
  userId: mongoose.Types.ObjectId;
  schoolId?: string;
  name: string;
  level: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GradeSchema = new Schema<IGrade>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  schoolId: {
    type: String
  },
  name: {
    type: String,
    required: true
  },
  level: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices
GradeSchema.index({ userId: 1, name: 1 }, { unique: true });
GradeSchema.index({ userId: 1, order: 1 });

export default mongoose.model<IGrade>('Grade', GradeSchema);
