import mongoose, { Document, Schema } from 'mongoose';

export interface IFerias extends Document {
  schoolId: string;
  employeeId: string;
  // Snapshot dos dados do funcionário no momento do registro
  nomeCompleto: string;
  cpf?: string;
  matricula?: string;
  cargo?: string;
  setor?: string;
  tipoContrato?: string;
  dataAdmissao?: string;
  // Período aquisitivo
  anoReferencia: number;
  periodoAquisitivoInicio: string;
  periodoAquisitivoFim: string;
  // Período de gozo
  dataInicio: string;
  dataFim: string;
  diasFerias: number;       // normalmente 30
  diasAbono: number;        // venda de 1/3 (0 a 10)
  // Aviso de férias
  dataAviso?: string;       // data em que o aviso foi dado (≥ 30 dias antes do gozo)
  // Status
  status: 'agendado' | 'em_gozo' | 'concluido' | 'cancelado';
  observacoes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const feriasSchema = new Schema<IFerias>(
  {
    schoolId: { type: String, required: true, index: true },
    employeeId: { type: String, required: true },
    nomeCompleto: { type: String, required: true },
    cpf: { type: String },
    matricula: { type: String },
    cargo: { type: String },
    setor: { type: String },
    tipoContrato: { type: String },
    dataAdmissao: { type: String },
    anoReferencia: { type: Number, required: true },
    periodoAquisitivoInicio: { type: String, required: true },
    periodoAquisitivoFim: { type: String, required: true },
    dataInicio: { type: String, required: true },
    dataFim: { type: String, required: true },
    diasFerias: { type: Number, required: true, default: 30 },
    diasAbono: { type: Number, default: 0 },
    dataAviso: { type: String },
    status: {
      type: String,
      enum: ['agendado', 'em_gozo', 'concluido', 'cancelado'],
      default: 'agendado',
    },
    observacoes: { type: String },
  },
  { timestamps: true }
);

feriasSchema.index({ schoolId: 1, employeeId: 1, anoReferencia: 1 });

export default mongoose.model<IFerias>('Ferias', feriasSchema);
