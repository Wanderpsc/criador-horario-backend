/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Modelo de Precificação por Horário Gerado
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IPricing extends Document {
  name: string;
  description: string;
  minClasses: number; // Número mínimo de turmas
  maxClasses: number; // Número máximo de turmas (0 = ilimitado)
  pricePerTimetable: number; // Valor por horário gerado
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPricingModel extends mongoose.Model<IPricing> {
  calculatePrice(numberOfClasses: number): Promise<number>;
}

const pricingSchema = new Schema<IPricing>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    minClasses: {
      type: Number,
      required: true,
      default: 1,
    },
    maxClasses: {
      type: Number,
      required: true,
      default: 0, // 0 significa ilimitado
    },
    pricePerTimetable: {
      type: Number,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Método para calcular preço baseado no número de turmas
pricingSchema.statics.calculatePrice = async function(numberOfClasses: number): Promise<number> {
  const pricing = await this.findOne({
    active: true,
    minClasses: { $lte: numberOfClasses },
    $or: [
      { maxClasses: { $gte: numberOfClasses } },
      { maxClasses: 0 } // ilimitado
    ]
  }).sort({ minClasses: -1 }); // Pega a faixa mais específica

  if (!pricing) {
    // Preço padrão se não encontrar faixa
    return 50.00;
  }

  return pricing.pricePerTimetable;
};

export default mongoose.model<IPricing, IPricingModel>('Pricing', pricingSchema);
