/**
 * Modelo de Planos de Assinatura
 * © 2025 Wander Pires Silva Coelho
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IPlan extends Document {
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice?: number;
  maxUsers?: number;
  maxSchools?: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new Schema<IPlan>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    monthlyPrice: {
      type: Number,
      required: true,
    },
    yearlyPrice: {
      type: Number,
      required: false,
    },
    maxUsers: {
      type: Number,
      required: false,
    },
    maxSchools: {
      type: Number,
      required: false,
    },
    features: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id.toString();
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id.toString();
        return ret;
      }
    }
  }
);

export default mongoose.model<IPlan>('Plan', planSchema);
