import mongoose, { Schema } from 'mongoose';

const medicalCertificateSchema = new Schema({
  schoolId: { type: String, required: true, index: true },
  personType: { type: String, enum: ['employee', 'teacher', 'student'], required: true },
  personId: { type: String, default: '' },
  personName: { type: String, required: true },
  registration: { type: String, default: '' },
  className: { type: String, default: '' },
  deliveredAt: { type: String, required: true },
  issuedAt: { type: String, required: true },
  startDate: { type: String, required: true },
  days: { type: Number, required: true, min: 1, max: 3650 },
  endDate: { type: String, required: true },
  returnDate: { type: String, required: true },
  returnedAt: { type: String, default: '' },
  cids: { type: [String], default: [] },
  doctorName: { type: String, default: '' },
  doctorRegistration: { type: String, default: '' },
  hospital: { type: String, default: '' },
  documentReference: { type: String, default: '' },
  alertDays: { type: Number, default: 2, min: 0, max: 30 },
  makeupDays: { type: Number, default: 0, min: 0 },
  madeUpDays: { type: Number, default: 0, min: 0 },
  makeupReason: { type: String, default: '' },
  notes: { type: String, default: '' },
  createdBy: { type: String, required: true },
  updatedBy: { type: String, required: true },
}, { timestamps: true });

medicalCertificateSchema.index({ schoolId: 1, personType: 1, personId: 1, startDate: 1 });

export default mongoose.model('MedicalCertificate', medicalCertificateSchema);
