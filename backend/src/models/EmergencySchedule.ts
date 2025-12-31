import mongoose from 'mongoose';

export interface IEmergencySlot {
  period: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  subjectName?: string; // Nome da disciplina
  subjectColor?: string; // Cor da disciplina
  teacherId: string;
  teacherName?: string; // Nome do professor
  originalTeacherId?: string; // Professor original (se houver substituição)
  isModified: boolean; // Foi modificado do original?
  isAffected?: boolean; // Slot foi afetado pela ausência
  isVacant?: boolean; // Slot ficou vago (JANELA)
  day: string;
  classId?: string; // ID da turma
  className?: string; // Nome da turma (ex: "A", "B")
  gradeName?: string; // Nome da série (ex: "1ª Série", "8º Ano")
  substituteOrigin?: { // De onde veio o substituto
    className?: string;
    gradeName?: string;
  };
}

export interface ITeacherDebt {
  teacherId: string;
  classId: string;
  subjectId: string;
  hoursOwed: number; // Horas devidas
  absenceDate: Date;
  reason?: string;
}

export interface IMakeupClass {
  originalTeacherId: string;
  originalTeacherName: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  gradeName: string;
  period: number;
  originalDay: string;
  makeupDay: string;
  reason: string;
}

export interface IEmergencySchedule extends mongoose.Document {
  date: Date;
  dayOfWeek: string;
  classId: string;
  baseScheduleId: string; // ID do horário base usado
  absentTeacherId?: string; // Mantido para compatibilidade
  absentTeacherIds?: string[]; // Múltiplos professores
  absentTeacherNames?: string[]; // Nomes dos professores
  classNames?: string[]; // Nomes das turmas afetadas
  reason?: string;
  originalSlots: IEmergencySlot[];
  emergencySlots: IEmergencySlot[];
  makeupClasses?: IMakeupClass[]; // Aulas para reposição no sábado
  affectedSlotsCount: number;
  teacherDebts: ITeacherDebt[]; // Débitos gerados
  createdAt: Date;
  updatedAt: Date;
}

const emergencySlotSchema = new mongoose.Schema({
  period: { type: Number, required: true },
  startTime: { type: String, required: false }, // Opcional para slots vazios
  endTime: { type: String, required: false }, // Opcional para slots vazios
  subjectId: { type: String, required: true },
  subjectName: { type: String }, // Nome da disciplina
  subjectColor: { type: String }, // Cor da disciplina
  teacherId: { type: String, required: true },
  teacherName: { type: String }, // Nome do professor
  originalTeacherId: { type: String },
  isModified: { type: Boolean, default: false },
  isAffected: { type: Boolean, default: false }, // Slot foi afetado pela ausência
  isVacant: { type: Boolean, default: false }, // Slot ficou vago (JANELA)
  day: { type: String, required: true },
  classId: { type: String }, // ID da turma
  className: { type: String }, // Nome da turma (ex: "A", "B")
  gradeName: { type: String }, // Nome da série (ex: "1ª Série", "8º Ano")
  substituteOrigin: { 
    type: {
      className: { type: String },
      gradeName: { type: String }
    },
    required: false
  } // De onde veio o substituto
}, { _id: false });

const teacherDebtSchema = new mongoose.Schema({
  teacherId: { type: String, required: true },
  classId: { type: String, required: true },
  subjectId: { type: String, required: true },
  hoursOwed: { type: Number, required: true },
  absenceDate: { type: Date, required: true },
  reason: { type: String }
}, { _id: false });

const makeupClassSchema = new mongoose.Schema({
  originalTeacherId: { type: String, required: true },
  originalTeacherName: { type: String, required: true },
  subjectId: { type: String, required: true },
  subjectName: { type: String, required: true },
  classId: { type: String, required: true },
  className: { type: String, required: true },
  gradeName: { type: String, required: true },
  period: { type: Number, required: true },
  originalDay: { type: String, required: true },
  makeupDay: { type: String, required: true },
  reason: { type: String, required: true }
}, { _id: false });

const emergencyScheduleSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  dayOfWeek: { type: String, required: true },
  classId: { type: String, required: true },
  baseScheduleId: { type: String, required: true },
  absentTeacherId: { type: String }, // Compatibilidade com código antigo
  absentTeacherIds: [{ type: String }], // Múltiplos professores
  absentTeacherNames: [{ type: String }], // Nomes dos professores
  classNames: [{ type: String }], // Nomes das turmas afetadas
  reason: { type: String },
  originalSlots: [emergencySlotSchema],
  emergencySlots: [emergencySlotSchema],
  affectedSlotsCount: { type: Number, required: true },
  teacherDebts: [teacherDebtSchema],
  makeupClasses: [makeupClassSchema] // Aulas para reposição no sábado
}, {
  timestamps: true
});

// Índices para buscas eficientes
emergencyScheduleSchema.index({ date: 1, classId: 1 });
emergencyScheduleSchema.index({ absentTeacherId: 1 });
emergencyScheduleSchema.index({ absentTeacherIds: 1 });
emergencyScheduleSchema.index({ 'teacherDebts.teacherId': 1 });

export default mongoose.model<IEmergencySchedule>('EmergencySchedule', emergencyScheduleSchema);
