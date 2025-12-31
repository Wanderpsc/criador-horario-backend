import mongoose, { Document, Schema } from 'mongoose';

export interface ILicense extends Document {
  key: string;
  userId?: string;
  plan?: string;
  isActive: boolean;
  expiresAt?: Date;
  expirationDate?: Date;
  maxSchools?: number;
  createdAt: Date;
  updatedAt: Date;
}

const licenseSchema = new Schema<ILicense>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: false,
    },
    plan: {
      type: String,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      required: false,
    },
    expirationDate: {
      type: Date,
      required: false,
    },
    maxSchools: {
      type: Number,
      required: false,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ILicense>('License', licenseSchema);
