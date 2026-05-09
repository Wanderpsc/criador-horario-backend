/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Model: Link de Ponto Eletrônico para Professores
 */
import mongoose, { Document, Schema } from 'mongoose';

export interface ITeacherPontoLink extends Document {
  schoolId: string;
  schoolName: string;
  token: string;
  isActive: boolean;
  isEnabled: boolean;   // liga/desliga o ponto sem apagar dados
  createdBy: string;
  requireGeolocation: boolean;
  latitude?: number;
  longitude?: number;
  areaM2: number;
  requirePhoto: boolean;
  graceMinutes: number;
  activeTimetableId?: string;
  createdAt: Date;
}

const TeacherPontoLinkSchema = new Schema<ITeacherPontoLink>(
  {
    schoolId:   { type: String, required: true },
    schoolName: { type: String, default: '' },
    token:      { type: String, required: true, unique: true },
    isActive:   { type: Boolean, default: true },
    isEnabled:  { type: Boolean, default: true },   // liga/desliga o ponto sem apagar dados
    createdBy:  { type: String, required: true },
    requireGeolocation: { type: Boolean, default: false },
    latitude:           { type: Number },
    longitude:          { type: Number },
    areaM2:             { type: Number, default: 1000 },
    requirePhoto:       { type: Boolean, default: false },
    graceMinutes:       { type: Number, default: 10 },
    activeTimetableId:  { type: String, default: '' }, // scheduleId do timetable ativo para o ponto
  },
  { timestamps: true }
);

TeacherPontoLinkSchema.index({ schoolId: 1 });

export default mongoose.model<ITeacherPontoLink>('TeacherPontoLink', TeacherPontoLinkSchema);
