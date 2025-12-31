import mongoose, { Document, Schema } from 'mongoose';

export interface IMakeupSaturday extends Document {
  date: Date;
  schoolId: string;
  schedule: {
    [classId: string]: Array<{
      period: number;
      startTime: string;
      endTime: string;
      teacherId: string;
      teacherName: string;
      subjectId: string;
      subjectName: string;
      classId: string;
      className: string;
      debtRecordId?: string; // ID do débito sendo pago
    }>;
  };
  attendedTeachers?: string[]; // IDs dos professores que compareceram
  absentTeachers?: string[]; // IDs dos professores que não compareceram (débitos acumulados)
  status?: 'planned' | 'realized' | 'cancelled'; // Status do sábado
  totalScheduledHours?: number; // Total de horas agendadas
  totalRealizedHours?: number; // Total de horas efetivamente realizadas
  teacherDebts?: Array<{ // Débitos que este sábado visa pagar
    teacherId: string;
    teacherName: string;
    totalHours: number;
    details: Array<{
      classId: string;
      className: string;
      subjectId: string;
      subjectName: string;
      hours: number;
    }>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const MakeupSaturdaySchema = new Schema<IMakeupSaturday>(
  {
    date: {
      type: Date,
      required: true
    },
    schoolId: {
      type: String,
      required: true,
      index: true
    },
    schedule: {
      type: Schema.Types.Mixed,
      required: true
    },
    attendedTeachers: {
      type: [String],
      default: []
    },
    absentTeachers: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ['planned', 'realized', 'cancelled'],
      default: 'planned'
    },
    totalScheduledHours: {
      type: Number,
      default: 0
    },
    totalRealizedHours: {
      type: Number,
      default: 0
    },
    teacherDebts: [{
      teacherId: { type: String, required: true },
      teacherName: { type: String, required: true },
      totalHours: { type: Number, required: true },
      details: [{
        classId: String,
        className: String,
        subjectId: String,
        subjectName: String,
        hours: Number
      }]
    }]
  },
  {
    timestamps: true
  }
);

// Índice composto para buscar por escola e data
MakeupSaturdaySchema.index({ schoolId: 1, date: 1 });

export default mongoose.model<IMakeupSaturday>('MakeupSaturday', MakeupSaturdaySchema);
