import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IPermissions {
  dashboard: { access: boolean };
  teachers: { create: boolean; read: boolean; update: boolean; delete: boolean };
  subjects: { create: boolean; read: boolean; update: boolean; delete: boolean };
  grades: { create: boolean; read: boolean; update: boolean; delete: boolean };
  classes: { create: boolean; read: boolean; update: boolean; delete: boolean };
  classSubjects: { create: boolean; read: boolean; update: boolean; delete: boolean };
  teacherSubjects: { create: boolean; read: boolean; update: boolean; delete: boolean };
  schedules: { create: boolean; read: boolean; update: boolean; delete: boolean };
  timetableGenerator: { access: boolean; generate: boolean };
  calendar: { create: boolean; read: boolean; update: boolean; delete: boolean };
  notifications: { create: boolean; read: boolean; update: boolean; delete: boolean };
  whatsappSettings: { access: boolean };
  liveMessaging: { access: boolean; send: boolean };
  emergencySchedule: { create: boolean; read: boolean };
  teacherAttendance: { create: boolean; read: boolean; update: boolean; delete: boolean };
  frequencyReports: { read: boolean };
  displayPanel: { access: boolean };
  settings: { access: boolean };
  users: { manage: boolean };
  auditLogs: { read: boolean };
}

export interface ISchoolUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  permissions: IPermissions;
  isActive: boolean;
  schoolId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  lastLogin?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export const defaultUserPermissions: IPermissions = {
  dashboard: { access: true },
  teachers: { create: false, read: true, update: false, delete: false },
  subjects: { create: false, read: true, update: false, delete: false },
  grades: { create: false, read: true, update: false, delete: false },
  classes: { create: false, read: true, update: false, delete: false },
  classSubjects: { create: false, read: true, update: false, delete: false },
  teacherSubjects: { create: false, read: true, update: false, delete: false },
  schedules: { create: false, read: true, update: false, delete: false },
  timetableGenerator: { access: true, generate: false },
  calendar: { create: false, read: true, update: false, delete: false },
  notifications: { create: false, read: true, update: false, delete: false },
  whatsappSettings: { access: false },
  liveMessaging: { access: false, send: false },
  emergencySchedule: { create: false, read: true },
  teacherAttendance: { create: false, read: true, update: false, delete: false },
  frequencyReports: { read: true },
  displayPanel: { access: true },
  settings: { access: false },
  users: { manage: false },
  auditLogs: { read: false }
};

export const defaultAdminPermissions: IPermissions = {
  dashboard: { access: true },
  teachers: { create: true, read: true, update: true, delete: true },
  subjects: { create: true, read: true, update: true, delete: true },
  grades: { create: true, read: true, update: true, delete: true },
  classes: { create: true, read: true, update: true, delete: true },
  classSubjects: { create: true, read: true, update: true, delete: true },
  teacherSubjects: { create: true, read: true, update: true, delete: true },
  schedules: { create: true, read: true, update: true, delete: true },
  timetableGenerator: { access: true, generate: true },
  calendar: { create: true, read: true, update: true, delete: true },
  notifications: { create: true, read: true, update: true, delete: true },
  whatsappSettings: { access: true },
  liveMessaging: { access: true, send: true },
  emergencySchedule: { create: true, read: true },
  teacherAttendance: { create: true, read: true, update: true, delete: true },
  frequencyReports: { read: true },
  displayPanel: { access: true },
  settings: { access: true },
  users: { manage: true },
  auditLogs: { read: true }
};

const PermissionsSchema = new Schema({
  dashboard: {
    access: { type: Boolean, default: true }
  },
  teachers: {
    create: { type: Boolean, default: false },
    read: { type: Boolean, default: true },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
  },
  subjects: {
    create: { type: Boolean, default: false },
    read: { type: Boolean, default: true },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
  },
  grades: {
    create: { type: Boolean, default: false },
    read: { type: Boolean, default: true },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
  },
  classes: {
    create: { type: Boolean, default: false },
    read: { type: Boolean, default: true },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
  },
  classSubjects: {
    create: { type: Boolean, default: false },
    read: { type: Boolean, default: true },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
  },
  teacherSubjects: {
    create: { type: Boolean, default: false },
    read: { type: Boolean, default: true },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
  },
  schedules: {
    create: { type: Boolean, default: false },
    read: { type: Boolean, default: true },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
  },
  timetableGenerator: {
    access: { type: Boolean, default: true },
    generate: { type: Boolean, default: false }
  },
  calendar: {
    create: { type: Boolean, default: false },
    read: { type: Boolean, default: true },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
  },
  notifications: {
    create: { type: Boolean, default: false },
    read: { type: Boolean, default: true },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
  },
  whatsappSettings: {
    access: { type: Boolean, default: false }
  },
  liveMessaging: {
    access: { type: Boolean, default: false },
    send: { type: Boolean, default: false }
  },
  emergencySchedule: {
    create: { type: Boolean, default: false },
    read: { type: Boolean, default: true }
  },
  teacherAttendance: {
    create: { type: Boolean, default: false },
    read: { type: Boolean, default: true },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
  },
  frequencyReports: {
    read: { type: Boolean, default: true }
  },
  displayPanel: {
    access: { type: Boolean, default: true }
  },
  settings: {
    access: { type: Boolean, default: false }
  },
  users: {
    manage: { type: Boolean, default: false }
  },
  auditLogs: {
    read: { type: Boolean, default: false }
  }
}, { _id: false });

const SchoolUserSchema = new Schema<ISchoolUser>({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome não pode ter mais de 100 caracteres']
  },
  email: {
    type: String,
    required: [true, 'E-mail é obrigatório'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'E-mail inválido']
  },
  password: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'Senha deve ter no mínimo 6 caracteres']
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  permissions: {
    type: PermissionsSchema,
    default: () => defaultUserPermissions
  },
  isActive: {
    type: Boolean,
    default: true
  },
  schoolId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'SchoolUser'
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Índice composto para garantir email único por escola
SchoolUserSchema.index({ email: 1, schoolId: 1 }, { unique: true });

// Hash password antes de salvar
SchoolUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Método para comparar senha
SchoolUserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Definir permissões padrão baseado no role
SchoolUserSchema.pre('save', function(next) {
  if (this.isNew && this.role === 'admin' && !this.permissions) {
    this.permissions = defaultAdminPermissions;
  } else if (this.isNew && this.role === 'user' && !this.permissions) {
    this.permissions = defaultUserPermissions;
  }
  next();
});

export default mongoose.model<ISchoolUser>('SchoolUser', SchoolUserSchema);
