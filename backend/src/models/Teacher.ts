import mongoose, { Document, Schema } from 'mongoose';

export interface ITeacher extends Document {
  cpf: string;
  registration?: string;
  name: string;
  academicBackground: string;
  email?: string;
  phone?: string;
  specialization?: string;
  availabilityNotes?: string;
  contractType?: '20h' | '40h';
  weeklyWorkload?: number; // Horas-aula por semana (13 para 20h, 26 para 40h)
  isActive: boolean;
  schoolId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const teacherSchema = new Schema<ITeacher>(
  {
    cpf: {
      type: String,
      required: true,
    },
    registration: {
      type: String,
      required: false,
    },
    name: {
      type: String,
      required: true,
    },
    academicBackground: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: false,
    },
    specialization: {
      type: String,
      required: false,
    },
    availabilityNotes: {
      type: String,
      required: false,
    },
    contractType: {
      type: String,
      enum: ['20h', '40h'],
      required: false,
      default: '40h',
    },
    weeklyWorkload: {
      type: Number,
      required: false,
      default: 26, // 26 aulas para 40h, 13 para 20h
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
    schoolId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id.toString();
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id.toString();
        return ret;
      }
    }
  }
);

export default mongoose.model<ITeacher>('Teacher', teacherSchema);
