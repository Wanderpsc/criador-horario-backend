import mongoose from 'mongoose';

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
  status: {
    type: String,
    enum: ['present', 'absent'],
    required: true
  },
  scheduledClasses: {
    type: Number,
    default: 0
  },
  givenClasses: {
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
  }
}, {
  timestamps: true
});

// Índice composto para evitar duplicatas
teacherAttendanceSchema.index({ schoolId: 1, teacherId: 1, date: 1 }, { unique: true });

export default mongoose.model('TeacherAttendance', teacherAttendanceSchema);
