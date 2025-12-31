import mongoose, { Document, Schema } from 'mongoose';

export interface ITimetable extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  year: number;
  semester: string;
  daysOfWeek: number;
  periodsPerDay: number;
  saturdayEquivalent?: number;
  scheduleId: mongoose.Types.ObjectId;
  grid: {
    day: number;
    period: number;
    teacherId?: mongoose.Types.ObjectId;
    subjectId?: mongoose.Types.ObjectId;
  }[];
  logo?: string;
  header?: string;
  createdAt: Date;
  updatedAt: Date;
}

const timetableSchema = new Schema<ITimetable>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  year: { type: Number, required: true },
  semester: { type: String, required: true },
  daysOfWeek: { type: Number, required: true, default: 5 },
  periodsPerDay: { type: Number, required: true, default: 8 },
  saturdayEquivalent: { type: Number },
  scheduleId: { type: Schema.Types.ObjectId, ref: 'Schedule', required: true },
  grid: [{
    day: { type: Number, required: true },
    period: { type: Number, required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher' },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' }
  }],
  logo: { type: String },
  header: { type: String }
}, { timestamps: true });

export default mongoose.model<ITimetable>('Timetable', timetableSchema);
