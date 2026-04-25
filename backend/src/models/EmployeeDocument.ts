import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployeeDocument extends Document {
  schoolId: string;
  employeeId: string;
  /** Tipo do documento: RG, CPF, CTPS, CNH, Foto, etc. */
  type: string;
  description?: string;
  filename: string;
  mimeType: string;
  /** Tamanho original em bytes */
  size: number;
  /** Conteúdo do arquivo codificado em base64 */
  data: string;
  createdAt: Date;
  updatedAt: Date;
}

const employeeDocumentSchema = new Schema<IEmployeeDocument>(
  {
    schoolId:    { type: String, required: true, index: true },
    employeeId:  { type: String, required: true, index: true },
    type:        { type: String, required: true },
    description: { type: String },
    filename:    { type: String, required: true },
    mimeType:    { type: String, required: true },
    size:        { type: Number, required: true },
    data:        { type: String, required: true, select: false }, // excluído por padrão das listagens
  },
  { timestamps: true }
);

employeeDocumentSchema.index({ schoolId: 1, employeeId: 1 });

export default mongoose.model<IEmployeeDocument>('EmployeeDocument', employeeDocumentSchema);
