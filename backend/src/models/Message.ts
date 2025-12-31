import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  from: mongoose.Types.ObjectId;
  to: mongoose.Types.ObjectId;
  subject?: string;
  message: string;
  internalNotes: string[];
  isRead: boolean;
  conversationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    from: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    to: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    subject: {
      type: String
    },
    message: {
      type: String,
      required: true
    },
    internalNotes: [{
      type: String
    }],
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    conversationId: {
      type: String,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Índices compostos
MessageSchema.index({ from: 1, to: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, createdAt: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
