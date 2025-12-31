import mongoose from 'mongoose';

export interface ITimetableSlot {
  day: string;
  period: number;
  subjectId: string;
  teacherId: string;
  classId: string;
  startTime?: string;
  endTime?: string;
}

export interface IGeneratedTimetable extends mongoose.Document {
  scheduleId: string;
  classId: string;
  slots: ITimetableSlot[];
  title: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const timetableSlotSchema = new mongoose.Schema({
  day: { type: String, required: true },
  period: { type: Number, required: true },
  subjectId: { type: String, required: true },
  teacherId: { type: String, required: true },
  classId: { type: String, required: true },
  startTime: { type: String, required: false },
  endTime: { type: String, required: false }
}, { _id: false });

const generatedTimetableSchema = new mongoose.Schema({
  scheduleId: { 
    type: String, 
    required: true 
  },
  classId: { 
    type: String, 
    required: true 
  },
  slots: [timetableSlotSchema],
  title: { type: String, required: true },
  userId: { type: String, required: false }
}, {
  timestamps: true
});

// Índice único removido para permitir múltiplos horários por turma
generatedTimetableSchema.index({ scheduleId: 1, classId: 1, createdAt: -1 });

export default mongoose.model<IGeneratedTimetable>('GeneratedTimetable', generatedTimetableSchema);
