import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  // Dados básicos
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'school';
  
  // Dados da instituição
  schoolName?: string;
  cnpj?: string;
  phone?: string;
  website?: string;
  
  // Endereço
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  
  // Dados do responsável
  responsibleName?: string;
  responsibleCPF?: string;
  responsiblePhone?: string;
  responsibleEmail?: string;
  
  // Dados institucionais
  schoolType?: 'public' | 'private' | 'cooperative';
  numberOfStudents?: number;
  numberOfTeachers?: number;
  educationLevels?: string[]; // Ensino Fundamental, Médio, etc
  
  // Licenciamento
  licenseKey?: string;
  selectedPlan?: string; // ID do plano selecionado
  paymentStatus: 'pending' | 'paid' | 'expired' | 'cancelled';
  approvedByAdmin: boolean;
  licenseExpiryDate?: Date;
  maxUsers?: number;
  
  // Modelo de pagamento por uso (créditos)
  paymentModel: 'subscription' | 'pay-per-use';
  credits: number;
  totalTimetablesGenerated: number;
  
  // Termos e condições
  acceptedTerms: boolean;
  acceptedTermsDate?: Date;
  
  // Recuperação de senha
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  
  // Observações administrativas
  adminNotes?: string;
  registrationStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  
  comparePassword(candidatePassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    // Dados básicos
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'school'], default: 'school' },
    
    // Dados da instituição
    schoolName: { type: String },
    cnpj: { type: String },
    phone: { type: String },
    website: { type: String },
    
    // Endereço
    address: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String, default: 'Brasil' },
    
    // Dados do responsável
    responsibleName: { type: String },
    responsibleCPF: { type: String },
    responsiblePhone: { type: String },
    responsibleEmail: { type: String },
    
    // Dados institucionais
    schoolType: { type: String, enum: ['public', 'private', 'cooperative'] },
    numberOfStudents: { type: Number },
    numberOfTeachers: { type: Number },
    educationLevels: [{ type: String }],
    
    // Licenciamento
    licenseKey: { type: String },
    selectedPlan: { type: String },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'expired', 'cancelled'], default: 'pending' },
    approvedByAdmin: { type: Boolean, default: false },
    licenseExpiryDate: { type: Date },
    maxUsers: { type: Number, default: 1 },
    
    // Modelo de pagamento
    paymentModel: { type: String, enum: ['subscription', 'pay-per-use'], default: 'subscription' },
    credits: { type: Number, default: 0 },
    totalTimetablesGenerated: { type: Number, default: 0 },
    
    // Termos e condições
    acceptedTerms: { type: Boolean, default: false },
    acceptedTermsDate: { type: Date },
    
    // Recuperação de senha
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
    
    // Administração
    adminNotes: { type: String },
    registrationStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', userSchema);
