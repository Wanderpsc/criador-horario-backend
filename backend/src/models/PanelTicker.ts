import mongoose, { Document, Schema } from 'mongoose';

export interface IPanelTicker extends Document {
  schoolId: string;
  message: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PanelTickerSchema = new Schema<IPanelTicker>(
  {
    schoolId: { type: String, required: true, index: true },
    message: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IPanelTicker>('PanelTicker', PanelTickerSchema);
