import mongoose, { Document, Schema } from 'mongoose';

export interface ITeacherSubject extends Document {
  teacherId: string;
  subjectId: string;
  classId?: string;
  weeklyHours?: number; // Carga horária específica deste professor neste componente/turma
  schoolId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const teacherSubjectSchema = new Schema<ITeacherSubject>(
  {
    teacherId: {
      type: String,
      required: true,
    },
    subjectId: {
      type: String,
      required: true,
    },
    classId: {
      type: String,
      required: false,
    },
    weeklyHours: {
      type: Number,
      required: false,
      min: 0,
      max: 40,
      default: undefined, // Undefined = usar carga horária da turma ou do componente
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
  }
);

// Índice único para evitar duplicatas (professor + componente + turma)
teacherSubjectSchema.index({ teacherId: 1, subjectId: 1, classId: 1 }, { unique: true });

// Índice para buscar por usuário
teacherSubjectSchema.index({ userId: 1 });

const TeacherSubject = mongoose.model<ITeacherSubject>('TeacherSubject', teacherSubjectSchema);

export default TeacherSubject;
