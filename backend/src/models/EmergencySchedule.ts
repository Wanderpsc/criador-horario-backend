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
  subjectId?: string; // Opcional - pode estar vazio se professor não tinha aula
  subjectName: string;
  classId?: string; // Opcional - pode estar vazio se professor não tinha aula
  className: string;
  gradeName: string;
  period: number;
  originalDay: string;
  makeupDay: string;
  reason: string;
  isRepaid?: boolean;    // marcado true quando o sábado de reposição é confirmado
  repaidAt?: Date;       // data em que foi abatido
}

export interface IEmergencySchedule extends mongoose.Document {
  school: mongoose.Types.ObjectId; // Escola que criou o horário
  name?: string; // Nome/título do horário emergencial
  date: string; // Formato: YYYY-MM-DD - dia do horário emergencial
  dayOfWeek: string;
  searchStartDate?: string; // Data inicial da busca de professores faltosos (formato YYYY-MM-DD)
  searchEndDate?: string; // Data final da busca de professores faltosos (formato YYYY-MM-DD)
  classId: string;
  baseScheduleId: string; // ID do horário base usado
  absentTeacherId?: string; // Mantido para compatibilidade
  absentTeacherIds?: string[]; // Múltiplos professores
  absentTeacherNames?: string | string[]; // Nomes dos professores (string ou array)
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
  teacherId: { type: String, required: false }, // Opcional para JANELA (slots vagos)
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
}, { _id: false, suppressReservedKeysWarning: true });

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
  subjectId: { type: String, required: false }, // Opcional - pode estar vazio se professor não tinha aula
  subjectName: { type: String, required: true },
  classId: { type: String, required: false }, // Opcional - pode estar vazio se professor não tinha aula
  className: { type: String, required: true },
  gradeName: { type: String, required: true },
  period: { type: Number, required: true },
  originalDay: { type: String, required: true },
  makeupDay: { type: String, required: false }, // Opcional - será definido ao criar sábado
  reason: { type: String, required: false }, // Opcional
  isRepaid: { type: Boolean, default: false }, // true quando o sábado de reposição confirma a aula
  repaidAt: { type: Date }
}, { _id: false });

const emergencyScheduleSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Escola
  name: { type: String }, // Nome/título do horário emergencial
  date: { type: String, required: true }, // Formato: YYYY-MM-DD - dia do horário emergencial
  dayOfWeek: { type: String, required: true },
  searchStartDate: { type: String }, // Data inicial da busca de professores faltosos (formato YYYY-MM-DD)
  searchEndDate: { type: String }, // Data final da busca de professores faltosos (formato YYYY-MM-DD)
  classId: { type: String, required: true },
  baseScheduleId: { type: String, required: true },
  absentTeacherId: { type: String }, // Compatibilidade com código antigo
  absentTeacherIds: [{ type: String }], // Múltiplos professores
  absentTeacherNames: { type: mongoose.Schema.Types.Mixed }, // String ou Array de strings
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
emergencyScheduleSchema.index({ school: 1 }); // Buscar por escola
emergencyScheduleSchema.index({ date: 1, classId: 1 });
emergencyScheduleSchema.index({ absentTeacherId: 1 });
emergencyScheduleSchema.index({ absentTeacherIds: 1 });
emergencyScheduleSchema.index({ 'teacherDebts.teacherId': 1 });

export default mongoose.model<IEmergencySchedule>('EmergencySchedule', emergencyScheduleSchema);
