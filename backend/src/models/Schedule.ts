import mongoose, { Document, Schema } from 'mongoose';

export interface ISchedule extends Document {
  name: string;
  userId: string;
  periods?: Array<{
    period: number;
    startTime: string;
    endTime: string;
  }>;
  slots: Array<{
    day: string;
    period: number;
    subject: string;
    teacher: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema<ISchedule>(
  {
    name: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    periods: [{
      period: Number,
      startTime: String,
      endTime: String,
    }],
    slots: [{
      day: String,
      period: Number,
      subject: String,
      teacher: String,
    }],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISchedule>('Schedule', scheduleSchema);
