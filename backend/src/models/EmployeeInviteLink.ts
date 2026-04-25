import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export interface IEmployeeInviteLink extends Document {
  token: string;
  schoolId: string;
  schoolName: string;
  // originalEmployeeId: ID definido no momento da CRIAçãO do link.
  // Se vazio → link genérico (vários funcionários).
  // Se preenchido → link pessoal para atualizar um funcionário específico.
  originalEmployeeId?: string;
  // employeeId pode ser alterado internamente; não usar para decidir segurança.
  employeeId?: string;
  employeeName?: string;
  isActive: boolean;
  expiresAt: Date;
  createdBy: string;
  submittedAt?: Date;
  submittedData?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const employeeInviteLinkSchema = new Schema<IEmployeeInviteLink>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(24).toString('hex'),
    },
    schoolId: { type: String, required: true, index: true },
    schoolName: { type: String, default: '' },
    // Imutável: ID do funcionário definido na criação do link (vazio = link genérico)
    originalEmployeeId: { type: String, default: '' },
    employeeId: { type: String, default: '' },
    employeeName: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
    },
    createdBy: { type: String, default: '' },
    submittedAt: { type: Date },
    submittedData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

employeeInviteLinkSchema.index({ token: 1 }, { unique: true });
employeeInviteLinkSchema.index({ schoolId: 1, createdAt: -1 });

export default mongoose.model<IEmployeeInviteLink>('EmployeeInviteLink', employeeInviteLinkSchema);
