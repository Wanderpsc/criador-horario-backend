/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Modelo: Ponto / Frequência de Funcionários
 */
import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployeeAttendance extends Document {
  schoolId: string;
  employeeId: string;
  employeeName: string;
  cargo?: string;
  setor?: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  // Turno
  shift: 'manha' | 'tarde' | 'noturno' | 'integral' | 'plantao';
  // Status
  status: 'present' | 'absent' | 'partial' | 'medical_leave' | 'vacation' | 'justified' | 'holiday' | 'remote' | 'overtime_only';
  // Horários
  expectedEntryTime?: string;  // HH:mm
  expectedExitTime?: string;   // HH:mm
  entryTime?: string;          // HH:mm
  exitTime?: string;           // HH:mm
  // Cálculos
  workedMinutes?: number;
  expectedMinutes?: number;
  overtimeMinutes?: number;
  earlyDepartureMinutes?: number;
  lateArrivalMinutes?: number;
  // Plantão
  isPlantao?: boolean;
  plantaoStart?: string;
  plantaoEnd?: string;
  // Justificativa
  justification?: string;
  observations?: string;
  // Notificação
  notificationGenerated?: boolean;
  notificationDate?: Date;
  // Controle
  markedById?: string;
  markedByName?: string;
  // Foto e geolocalização (marcação pelo link público)
  photoData?: string;       // base64 comprimido
  latitude?: number;
  longitude?: number;
  locationValid?: boolean;
  // Retificações feitas pelo administrador
  rectifications?: {
    rectifiedBy: string;
    rectifiedByName: string;
    rectifiedAt: Date;
    reason: string;
    originalEntryTime?: string;
    originalExitTime?: string;
    originalStatus?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const employeeAttendanceSchema = new Schema<IEmployeeAttendance>(
  {
    schoolId: { type: String, required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, required: true },
    cargo: { type: String },
    setor: { type: String },
    date: { type: String, required: true, index: true },
    dayOfWeek: { type: String, required: true },
    shift: {
      type: String,
      enum: ['manha', 'tarde', 'noturno', 'integral', 'plantao'],
      default: 'integral',
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'partial', 'medical_leave', 'vacation', 'justified', 'holiday', 'remote', 'overtime_only'],
      default: 'absent',
    },
    expectedEntryTime: { type: String },
    expectedExitTime: { type: String },
    entryTime: { type: String },
    exitTime: { type: String },
    workedMinutes: { type: Number, default: 0 },
    expectedMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },
    earlyDepartureMinutes: { type: Number, default: 0 },
    lateArrivalMinutes: { type: Number, default: 0 },
    isPlantao: { type: Boolean, default: false },
    plantaoStart: { type: String },
    plantaoEnd: { type: String },
    justification: { type: String },
    observations: { type: String },
    notificationGenerated: { type: Boolean, default: false },
    notificationDate: { type: Date },
    markedById: { type: String },
    markedByName: { type: String },
    photoData:     { type: String },
    latitude:      { type: Number },
    longitude:     { type: Number },
    locationValid: { type: Boolean },
    rectifications: [{
      rectifiedBy:     { type: String, required: true },
      rectifiedByName: { type: String, required: true },
      rectifiedAt:     { type: Date,   required: true },
      reason:          { type: String, required: true },
      originalEntryTime: { type: String },
      originalExitTime:  { type: String },
      originalStatus:    { type: String },
    }],
  },
  { timestamps: true }
);

// Índice composto para evitar duplicatas por funcionário/data
employeeAttendanceSchema.index({ schoolId: 1, employeeId: 1, date: 1 }, { unique: true });

export default mongoose.model<IEmployeeAttendance>('EmployeeAttendance', employeeAttendanceSchema);
