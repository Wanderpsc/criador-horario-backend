import mongoose from 'mongoose';

/**
 * Registro de aula paga — substituto cobriu ausência de um professor
 */
const classPaymentSchema = new mongoose.Schema({
  schoolId: { type: String, required: true, index: true },

  // Data da aula (YYYY-MM-DD)
  date: { type: String, required: true, index: true },

  // Período/horário
  period: { type: Number, required: true },
  startTime: { type: String, default: '' },
  endTime: { type: String, default: '' },

  // Professor ausente (quem gerou a lacuna)
  absentTeacherId: { type: String, required: true, index: true },
  absentTeacherName: { type: String, required: true },

  // Professor substituto (quem cobriu)
  substituteTeacherId: { type: String, default: '' },
  substituteTeacherName: { type: String, default: '' },

  // Turma e disciplina
  classId: { type: String, required: true },
  className: { type: String, required: true },
  subjectId: { type: String, default: '' },
  subjectName: { type: String, default: '' },

  // Como foi preenchido
  filledViaLink: { type: Boolean, default: false },
  substituteToken: { type: String, default: '' }, // token do link usado

  status: {
    type: String,
    enum: ['pending', 'filled', 'paid'],
    default: 'pending',
  },

  notes: { type: String, default: '' },
  createdBy: { type: String, default: '' },

  filledAt: { type: Date },
}, { timestamps: true });

classPaymentSchema.index({ schoolId: 1, date: 1 });
classPaymentSchema.index({ schoolId: 1, absentTeacherId: 1, date: 1 });
classPaymentSchema.index({ schoolId: 1, substituteTeacherId: 1, date: 1 });

export default mongoose.model('ClassPayment', classPaymentSchema);
