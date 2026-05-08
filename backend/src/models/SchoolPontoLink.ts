/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Model: Link Geral de Ponto Eletrônico da Escola
 */
import mongoose, { Document, Schema } from 'mongoose';

export interface ISchoolPontoLink extends Document {
  schoolId: string;
  schoolName: string;
  token: string;
  isActive: boolean;
  createdBy: string;
  // Configurações de geolocalização
  requireGeolocation: boolean;
  latitude?: number;
  longitude?: number;
  areaM2: number;           // área em m² para cálculo do raio (padrão 1000)
  // Configuração de foto
  requirePhoto: boolean;
  graceMinutes: number;
  createdAt: Date;
}

const SchoolPontoLinkSchema = new Schema<ISchoolPontoLink>(
  {
    schoolId:   { type: String, required: true },
    schoolName: { type: String, default: '' },
    token:      { type: String, required: true, unique: true },
    isActive:   { type: Boolean, default: true },
    createdBy:  { type: String, required: true },
    requireGeolocation: { type: Boolean, default: false },
    latitude:           { type: Number },
    longitude:          { type: Number },
    areaM2:             { type: Number, default: 1000 },
    requirePhoto:       { type: Boolean, default: false },
    graceMinutes:       { type: Number, default: 10 },
  },
  { timestamps: true }
);

SchoolPontoLinkSchema.index({ schoolId: 1 });

export default mongoose.model<ISchoolPontoLink>('SchoolPontoLink', SchoolPontoLinkSchema);
