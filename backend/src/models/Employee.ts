import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployee extends Document {
  schoolId: string;
  // Dados Pessoais
  name: string;
  matricula?: string;
  cpf?: string;
  rg?: string;
  rgOrgao?: string;
  rgDataEmissao?: string;
  dataNascimento?: string;
  naturalidade?: string;
  nacionalidade?: string;
  sexo?: 'M' | 'F' | 'Outro';
  estadoCivil?: 'Solteiro(a)' | 'Casado(a)' | 'Divorciado(a)' | 'Viúvo(a)' | 'União Estável' | 'Outro';
  nomeMae?: string;
  nomePai?: string;
  tipoSanguineo?: string;
  // Contato
  email?: string;
  celular?: string;
  telefoneFixo?: string;
  // Endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  // Dados Funcionais
  cargo?: string;
  setor?: string;
  tipoContrato?: 'CLT' | 'Estatutário' | 'Temporário' | 'Terceirizado' | 'Contrato' | 'Outro';
  dataAdmissao?: string;
  dataInicioInstituicao?: string;
  dataDemissao?: string;
  jornadaTrabalho?: string;
  cargaHorariaSemanal?: number;
  salario?: number;
  // Documentos
  ctpsNumero?: string;
  ctpsSerie?: string;
  pisPasep?: string;
  tituloEleitor?: string;
  zonaEleitoral?: string;
  secaoEleitoral?: string;
  certificadoMilitar?: string;
  cnhNumero?: string;
  cnhCategoria?: string;
  cnhValidade?: string;
  reservista?: string;
  // Escala de trabalho (horário fixo)
  workSchedule?: {
    entryTime: string;         // HH:mm — 1º turno entrada
    exitTime: string;          // HH:mm — 1º turno saída
    workDays: string[];        // ['monday','tuesday','wednesday','thursday','friday']
    toleranceMinutes: number;  // minutos de tolerância (padrão 10)
    shiftType: 'single' | 'split2' | 'split3'; // turno direto | 2 turnos | 3 turnos
    shift2EntryTime?: string;  // HH:mm — 2º turno entrada
    shift2ExitTime?: string;   // HH:mm — 2º turno saída
    shift3EntryTime?: string;  // HH:mm — 3º turno entrada
    shift3ExitTime?: string;   // HH:mm — 3º turno saída
  };
  // Outros
  observacoes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>(
  {
    schoolId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    matricula: { type: String },
    cpf: { type: String },
    rg: { type: String },
    rgOrgao: { type: String },
    rgDataEmissao: { type: String },
    dataNascimento: { type: String },
    naturalidade: { type: String },
    nacionalidade: { type: String, default: 'Brasileira' },
    sexo: { type: String, enum: ['M', 'F', 'Outro'] },
    estadoCivil: { type: String, enum: ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável', 'Outro'] },
    nomeMae: { type: String },
    nomePai: { type: String },
    tipoSanguineo: { type: String },
    email: { type: String },
    celular: { type: String },
    telefoneFixo: { type: String },
    cep: { type: String },
    logradouro: { type: String },
    numero: { type: String },
    complemento: { type: String },
    bairro: { type: String },
    cidade: { type: String },
    estado: { type: String },
    cargo: { type: String },
    setor: { type: String },
    tipoContrato: { type: String, enum: ['CLT', 'Estatutário', 'Temporário', 'Terceirizado', 'Contrato', 'Outro'] },
    dataAdmissao: { type: String },
    dataInicioInstituicao: { type: String },
    dataDemissao: { type: String },
    jornadaTrabalho: { type: String },
    cargaHorariaSemanal: { type: Number },
    salario: { type: Number },
    ctpsNumero: { type: String },
    ctpsSerie: { type: String },
    pisPasep: { type: String },
    tituloEleitor: { type: String },
    zonaEleitoral: { type: String },
    secaoEleitoral: { type: String },
    certificadoMilitar: { type: String },
    cnhNumero: { type: String },
    cnhCategoria: { type: String },
    cnhValidade: { type: String },
    reservista: { type: String },
    workSchedule: {
      entryTime:         { type: String, default: '' },
      exitTime:          { type: String, default: '' },
      workDays:          { type: [String], default: ['monday','tuesday','wednesday','thursday','friday'] },
      toleranceMinutes:  { type: Number, default: 10 },
      shiftType:         { type: String, enum: ['single','split2','split3'], default: 'single' },
      shift2EntryTime:   { type: String, default: '' },
      shift2ExitTime:    { type: String, default: '' },
      shift3EntryTime:   { type: String, default: '' },
      shift3ExitTime:    { type: String, default: '' },
    },
    observacoes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

employeeSchema.index({ schoolId: 1, name: 1 });

export default mongoose.model<IEmployee>('Employee', employeeSchema);
