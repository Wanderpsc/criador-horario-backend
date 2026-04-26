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
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'pending'],
    default: 'pending'
  },
  markedAt: {
    type: Date
  }
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
  }
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
