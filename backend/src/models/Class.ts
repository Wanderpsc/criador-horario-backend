/**
 * Modelo de Turma/Classe
 * © 2025 Wander Pires Silva Coelho
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IClass extends Document {
  userId: mongoose.Types.ObjectId;
  gradeId: mongoose.Types.ObjectId;
  name: string;
  shift: 'morning' | 'afternoon' | 'evening' | 'full';
  capacity?: number;
  subjectIds?: mongoose.Types.ObjectId[];
  subjectWeeklyHours?: { [key: string]: number };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClassSchema = new Schema<IClass>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gradeId: {
    type: Schema.Types.ObjectId,
    ref: 'Grade',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  shift: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'full'],
    required: true
  },
  capacity: {
    type: Number
  },
  subjectIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  subjectWeeklyHours: {
    type: Map,
    of: Number,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índice único apenas para turmas ativas
ClassSchema.index(
  { userId: 1, gradeId: 1, name: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { isActive: true }
  }
);

export default mongoose.model<IClass>('Class', ClassSchema);
