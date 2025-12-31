import mongoose, { Document, Schema } from 'mongoose';

export interface ISubject extends Document {
  name: string;
  code?: string;
  workload?: number;
  workloadHours?: number;
  hours?: number;
  weeklyHours?: number; // Horas-aula por semana (ex: 2, 3, 4 aulas/semana)
  description?: string;
  scheduleNotes?: string;
  color?: string;
  gradeId?: string;
  gradeIds?: string[]; // Array com todas as séries onde o componente é lecionado
  classIds?: string[]; // Array com todas as turmas onde o componente é lecionado
  isActive?: boolean;
  userId: string;
  schoolId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: false,
    },
    workload: {
      type: Number,
      required: false,
    },
    workloadHours: {
      type: Number,
      required: false,
    },
    hours: {
      type: Number,
      required: false,
    },
    weeklyHours: {
      type: Number,
      required: false,
      default: 2, // Padrão: 2 aulas por semana
    },
    description: {
      type: String,
      required: false,
    },
    scheduleNotes: {
      type: String,
      required: false,
    },
    color: {
      type: String,
      required: false,
    },
    gradeId: {
      type: String,
      required: false,
    },
    gradeIds: {
      type: [String],
      required: false,
      default: [],
    },
    classIds: {
      type: [String],
      required: false,
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    userId: {
      type: String,
      required: true,
    },
    schoolId: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISubject>('Subject', subjectSchema);
