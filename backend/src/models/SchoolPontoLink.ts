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
  createdAt: Date;
}

const SchoolPontoLinkSchema = new Schema<ISchoolPontoLink>(
  {
    schoolId:   { type: String, required: true },
    schoolName: { type: String, default: '' },
    token:      { type: String, required: true, unique: true },
    isActive:   { type: Boolean, default: true },
    createdBy:  { type: String, required: true },
  },
  { timestamps: true }
);

SchoolPontoLinkSchema.index({ schoolId: 1 });

export default mongoose.model<ISchoolPontoLink>('SchoolPontoLink', SchoolPontoLinkSchema);
