import mongoose from 'mongoose';

const teacherPaymentSchema = new mongoose.Schema({
  schoolId: {
    type: String,
    required: true,
    index: true
  },
  teacherId: {
    type: String,
    required: true,
    index: true
  },
  teacherName: {
    type: String,
    required: true
  },
  paymentDate: {
    type: String, // Data em que o pagamento foi realizado
    required: true
  },
  referenceDate: {
    type: String, // Data das aulas a que o pagamento se refere
    required: true,
    index: true
  },
  absentClasses: {
    type: Number, // Quantidade de aulas ausentes pagas
    required: true
  },
  amount: {
    type: Number, // Valor pago (opcional, para futuro)
    default: 0
  },
  status: {
    type: String,
    enum: ['paid', 'pending', 'cancelled'],
    default: 'paid'
  },
  notes: {
    type: String // Observações sobre o pagamento
  },
  createdBy: {
    type: String // Quem registrou o pagamento
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para consultas rápidas
teacherPaymentSchema.index({ schoolId: 1, teacherId: 1, referenceDate: 1 });
teacherPaymentSchema.index({ schoolId: 1, paymentDate: 1 });
teacherPaymentSchema.index({ schoolId: 1, teacherId: 1, paymentDate: 1 });

export default mongoose.model('TeacherPayment', teacherPaymentSchema);
