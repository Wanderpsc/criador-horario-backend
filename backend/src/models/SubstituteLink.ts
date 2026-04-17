import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Um slot de lacuna: aula sem professor (ausência registrada no sistema)
 */
const gapSlotSchema = new mongoose.Schema({
  period: { type: Number, required: true },
  startTime: { type: String, default: '' },
  endTime: { type: String, default: '' },
  absentTeacherId: { type: String, required: true },
  absentTeacherName: { type: String, required: true },
  classId: { type: String, required: true },
  className: { type: String, required: true },
  subjectId: { type: String, default: '' },
  subjectName: { type: String, default: '' },
  // Preenchimento pelo substituto
  isFilled: { type: Boolean, default: false },
  filledBy: { type: String, default: '' },       // nome do substituto
  filledTeacherId: { type: String, default: '' }, // id se for professor cadastrado
  filledAt: { type: Date },
}, { _id: true });

const substituteLinkSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(20).toString('hex'),
  },
  schoolId: { type: String, required: true, index: true },
  schoolName: { type: String, default: '' },

  // Data para a qual o link foi gerado (YYYY-MM-DD)
  date: { type: String, required: true, index: true },
  dateLabel: { type: String, default: '' }, // ex: "Sexta-feira, 18/04/2025"

  slots: [gapSlotSchema],

  isActive: { type: Boolean, default: true },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
  },

  createdBy: { type: String, default: '' },
}, { timestamps: true });

substituteLinkSchema.index({ token: 1 }, { unique: true });
substituteLinkSchema.index({ schoolId: 1, date: 1 });

export default mongoose.model('SubstituteLink', substituteLinkSchema);
