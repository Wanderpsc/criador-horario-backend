import mongoose from 'mongoose';

export interface ITeacherDebtRecord extends mongoose.Document {
  teacherId: string;
  classId: string;
  subjectId: string;
  hoursOwed: number;
  hoursPaid: number; // Horas já pagas
  absenceDate: Date;
  emergencyScheduleId: string;
  reason?: string;
  isPaid: boolean;
  paidDates: Date[]; // Datas em que pagou parcialmente
  makeupSaturdayIds: string[]; // IDs dos sábados onde foi agendado
  accumulatedFromSaturdayId?: string; // Se este débito foi acumulado de não comparecimento em sábado
  isAccumulated: boolean; // Se é um débito acumulado de não comparecimento
  createdAt: Date;
  updatedAt: Date;
}

const teacherDebtRecordSchema = new mongoose.Schema({
  teacherId: { 
    type: String, 
    required: true,
    index: true 
  },
  classId: { 
    type: String, 
    required: true,
    index: true 
  },
  subjectId: { 
    type: String, 
    required: true 
  },
  hoursOwed: { 
    type: Number, 
    required: true 
  },
  hoursPaid: { 
    type: Number, 
    default: 0 
  },
  absenceDate: { 
    type: Date, 
    required: true,
    index: true 
  },
  emergencyScheduleId: { 
    type: String, 
    required: true 
  },
  reason: { type: String },
  isPaid: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  paidDates: [{ type: Date }],
  makeupSaturdayIds: [{ type: String }],
  accumulatedFromSaturdayId: { type: String },
  isAccumulated: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índice composto para buscar débitos pendentes de um professor em uma turma
teacherDebtRecordSchema.index({ teacherId: 1, classId: 1, isPaid: 1 });

export default mongoose.model<ITeacherDebtRecord>('TeacherDebtRecord', teacherDebtRecordSchema);
