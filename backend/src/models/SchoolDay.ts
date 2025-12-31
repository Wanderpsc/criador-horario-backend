/**
 * Modelo de Dia Letivo
 * © 2025 Wander Pires Silva Coelho
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface ISchoolDay extends Document {
  schoolId: string;
  date: Date;
  dayType: 'regular' | 'saturday' | 'holiday' | 'recess';
  scheduleId?: string;
  isCompleted: boolean;
  notes?: string;
  followWeekday?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  createdAt: Date;
  updatedAt: Date;
}

const SchoolDaySchema = new Schema<ISchoolDay>(
  {
    schoolId: {
      type: String,
      required: true,
      index: true
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    dayType: {
      type: String,
      enum: ['regular', 'saturday', 'holiday', 'recess'],
      required: true,
      default: 'regular'
    },
    scheduleId: {
      type: String,
      required: false
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      required: false
    },
    followWeekday: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      required: false
    }
  },
  {
    timestamps: true
  }
);

// Índice composto único para garantir um dia por data
SchoolDaySchema.index({ schoolId: 1, date: 1 }, { unique: true });

export default mongoose.model<ISchoolDay>('SchoolDay', SchoolDaySchema);
