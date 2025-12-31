import mongoose from 'mongoose';

export interface ISaturdaySlot {
  period: number;
  startTime: string;
  endTime: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  debtRecordId: string; // ID do débito sendo pago
  hoursCount: number; // Quantas horas/aulas esta slot paga
}

export interface ISaturdayMakeup extends mongoose.Document {
  date: Date;
  slots: ISaturdaySlot[];
  teachersInvolved: string[]; // IDs dos professores
  classesInvolved: string[]; // IDs das turmas
  totalDebtsBeingPaid: number;
  status: 'planned' | 'confirmed' | 'completed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const saturdaySlotSchema = new mongoose.Schema({
  period: { type: Number, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  classId: { type: String, required: true },
  subjectId: { type: String, required: true },
  teacherId: { type: String, required: true },
  debtRecordId: { type: String, required: true },
  hoursCount: { type: Number, default: 1 }
}, { _id: false });

const saturdayMakeupSchema = new mongoose.Schema({
  date: { 
    type: Date, 
    required: true,
    index: true 
  },
  slots: [saturdaySlotSchema],
  teachersInvolved: [{ type: String }],
  classesInvolved: [{ type: String }],
  totalDebtsBeingPaid: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['planned', 'confirmed', 'completed'],
    default: 'planned'
  },
  notes: { type: String }
}, {
  timestamps: true
});

export default mongoose.model<ISaturdayMakeup>('SaturdayMakeup', saturdayMakeupSchema);
