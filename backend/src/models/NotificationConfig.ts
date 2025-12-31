import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationConfig extends Document {
  reminderEnabled: boolean;
  reminderMinutesBefore: number; // Minutos de antecedência
  messageTemplate: string;
  sendToWhatsApp: boolean;
  sendToSMS: boolean;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  whatsappEnabled: boolean;
  schoolId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationConfigSchema = new Schema<INotificationConfig>(
  {
    reminderEnabled: {
      type: Boolean,
      default: true,
    },
    reminderMinutesBefore: {
      type: Number,
      default: 15, // 15 minutos antes
    },
    messageTemplate: {
      type: String,
      default: 'Olá {{teacherName}}! Lembrete: Sua aula de {{subjectName}} na turma {{className}} começa em {{minutes}} minutos ({{startTime}}). Sala: {{period}}º horário.',
    },
    sendToWhatsApp: {
      type: Boolean,
      default: true,
    },
    sendToSMS: {
      type: Boolean,
      default: false,
    },
    twilioAccountSid: {
      type: String,
      required: false,
    },
    twilioAuthToken: {
      type: String,
      required: false,
    },
    twilioPhoneNumber: {
      type: String,
      required: false,
    },
    whatsappEnabled: {
      type: Boolean,
      default: false,
    },
    schoolId: {
      type: String,
      required: true,
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

notificationConfigSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model<INotificationConfig>('NotificationConfig', notificationConfigSchema);
