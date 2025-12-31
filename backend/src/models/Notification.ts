import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  type: 'class_reminder' | 'schedule_change' | 'general_announcement' | 'system' | 'payment' | 'license' | 'invoice' | 'update';
  recipientType: 'teacher' | 'class' | 'all';
  recipientId?: string; // teacherId ou classId
  recipientPhone?: string; // Telefone do destinatário
  recipientName?: string; // Nome do destinatário
  title?: string; // Título da notificação interna
  message: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  read?: boolean; // Marcação de leitura para notificações internas
  priority?: 'low' | 'medium' | 'high' | 'urgent'; // Prioridade
  actionUrl?: string; // URL para ação relacionada
  scheduledFor?: Date; // Quando deve ser enviada
  sentAt?: Date; // Quando foi enviada
  errorMessage?: string; // Mensagem de erro se falhar
  metadata?: {
    classId?: string;
    className?: string;
    subjectId?: string;
    subjectName?: string;
    period?: number;
    day?: string;
    startTime?: string;
    endTime?: string;
    channel?: 'whatsapp' | 'sms' | 'telegram' | 'internal'; // Canal de envio
    priority?: 'low' | 'medium' | 'high' | 'urgent'; // Prioridade
    invoiceId?: string; // ID da nota fiscal
    paymentId?: string; // ID do pagamento
    licenseId?: string; // ID da licença
    amount?: number; // Valor do pagamento
    dueDate?: Date; // Data de vencimento
  };
  schoolId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      enum: ['class_reminder', 'schedule_change', 'general_announcement', 'system', 'payment', 'license', 'invoice', 'update'],
      required: true,
    },
    recipientType: {
      type: String,
      enum: ['teacher', 'class', 'all'],
      required: false,
    },
    recipientId: {
      type: String,
      required: false,
    },
    recipientPhone: {
      type: String,
      required: false,
    },
    recipientName: {
      type: String,
      required: false,
    },
    title: {
      type: String,
      required: false,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'cancelled'],
      default: 'pending',
    },
    read: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    actionUrl: {
      type: String,
      required: false,
    },
    scheduledFor: {
      type: Date,
      required: false,
    },
    sentAt: {
      type: Date,
      required: false,
    },
    errorMessage: {
      type: String,
      required: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: false,
    },
    schoolId: {
      type: String,
      required: false,
    },
    userId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para otimizar consultas
notificationSchema.index({ status: 1, scheduledFor: 1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', notificationSchema);
