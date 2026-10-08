import mongoose from 'mongoose';

// Schema para cada aula individual
const classAttendanceSchema = new mongoose.Schema({
  period: {
    type: Number,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  subjectId: {
    type: String,
    required: true
  },
  subjectName: {
    type: String,
    required: true
  },
  classId: {
    type: String,
    required: true
  },
  className: {
    type: String,
    required: true
  },
  grade: {
    type: String,
    required: false,
    default: ''
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'pending'],
    default: 'pending'
  },
  markedAt: {
    type: Date
  },
  // Campos de pagamento: marcados quando a ausência foi paga/abatida
  paidAt: {
    type: Date
  },
  classPaymentId: {
    type: String,
    default: ''
  },
  // Campos do ponto eletrônico de professor
  entryTime: { type: String },          // HH:mm quando professor bateu entrada
  exitTime:  { type: String },          // HH:mm quando professor bateu saída
  locationValid: { type: Boolean },
  latitude: { type: Number },
  longitude: { type: Number },
  locationDistanceMeters: { type: Number },
  isPedagogical: { type: Boolean, default: false }, // true = Horário Pedagógico (sem turma)
  photoData: { type: String },          // base64 foto capturada ao marcar
  markedByElectronicPoint: { type: Boolean, default: false },
  punctualityStatus: {
    type: String,
    enum: ['on_time', 'late', 'early', 'outside_schedule'],
  },
  lateMinutes: { type: Number, default: 0 },
  requiresReview: { type: Boolean, default: false },
  exceptionReason: { type: String, default: '' },
  justification: { type: String, default: '' },
  isRejected: { type: Boolean, default: false },
  rejectionReason: { type: String, default: '' },
  rejectedAt: { type: Date },
  rejectedById: { type: String },
  rejectedByName: { type: String },
  rejectionHistory: [{
    rejectedById: { type: String, required: true },
    rejectedByName: { type: String, required: true },
    rejectedAt: { type: Date, required: true },
    reason: { type: String, required: true },
    originalStatus: { type: String, required: true },
    originalEntryTime: { type: String },
    originalPunctualityStatus: { type: String },
    originalJustification: { type: String },
  }],
}, { _id: true });

const teacherAttendanceSchema = new mongoose.Schema({
  teacherId: {
    type: String,
    required: true,
    index: true
  },
  teacherName: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true,
    index: true
  },
  dayOfWeek: {
    type: String,
    required: true
  },
  // Array de aulas do professor neste dia
  classes: [classAttendanceSchema],
  // Estatísticas calculadas
  totalScheduledClasses: {
    type: Number,
    default: 0
  },
  totalPresentClasses: {
    type: Number,
    default: 0
  },
  totalAbsentClasses: {
    type: Number,
    default: 0
  },
  totalPendingClasses: {
    type: Number,
    default: 0
  },
  attendanceRate: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  schoolId: {
    type: String,
    required: true,
    index: true
  },
  schoolYear: {
    type: Number,
    index: true
  },
  schoolEntryTime: { type: String },
  schoolExitTime: { type: String },
  schoolEntryAt: { type: Date },
  schoolExitAt: { type: Date },
  expectedFirstStartTime: { type: String },
  expectedLastEndTime: { type: String },
  schoolArrivalDelayMinutes: { type: Number, default: 0 },
  schoolEarlyDepartureMinutes: { type: Number, default: 0 },
  schoolPresenceComplete: { type: Boolean, default: false },
  schoolEntryLocationValid: { type: Boolean },
  schoolExitLocationValid: { type: Boolean },
  schoolEntryPhotoData: { type: String },
  schoolExitPhotoData: { type: String },
  schoolPresenceMarkedById: { type: String },
  schoolPresenceMarkedByName: { type: String },
  schoolPresenceManualReason: { type: String, default: '' },
  schoolPresenceRejected: { type: Boolean, default: false },
  schoolPresenceRejectionReason: { type: String, default: '' },
  schoolPresenceRejectedAt: { type: Date },
  schoolPresenceRejectedById: { type: String },
  schoolPresenceRejectedByName: { type: String },
  schoolPresenceRejectionHistory: [{
    rejectedById: { type: String, required: true },
    rejectedByName: { type: String, required: true },
    rejectedAt: { type: Date, required: true },
    reason: { type: String, required: true },
    originalEntryTime: { type: String },
    originalExitTime: { type: String },
  }],
}, {
  timestamps: true
});

// Atualizar estatísticas antes de salvar
teacherAttendanceSchema.pre('save', function(next) {
  if (this.classes && this.classes.length > 0) {
    this.totalScheduledClasses = this.classes.length;
    this.totalPresentClasses = this.classes.filter((c: any) => c.status === 'present').length;
    this.totalAbsentClasses = this.classes.filter((c: any) => c.status === 'absent').length;
    this.totalPendingClasses = this.classes.filter((c: any) => c.status === 'pending').length;
    
    if (this.totalScheduledClasses > 0) {
      this.attendanceRate = (this.totalPresentClasses / this.totalScheduledClasses) * 100;
    }
  }
  next();
});

// Índice composto para evitar duplicatas
teacherAttendanceSchema.index({ schoolId: 1, teacherId: 1, date: 1 }, { unique: true });
teacherAttendanceSchema.index({ schoolId: 1, date: 1 });
teacherAttendanceSchema.index({ schoolId: 1, teacherId: 1, date: 1, 'classes.status': 1 });

export default mongoose.model('TeacherAttendance', teacherAttendanceSchema);
