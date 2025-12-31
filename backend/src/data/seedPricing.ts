/**
 * Script de Seed para Faixas de Preço
 * Sistema Criador de Horário de Aula Escolar
 */

import mongoose from 'mongoose';
import Pricing from '../models/Pricing';
import dotenv from 'dotenv';

dotenv.config();

const pricingTiers = [
  {
    name: 'Plano Micro',
    description: 'Ideal para escolas pequenas com até 5 turmas',
    minClasses: 1,
    maxClasses: 5,
    pricePerTimetable: 25.00,
    active: true
  },
  {
    name: 'Plano Pequeno',
    description: 'Para escolas com 6 a 10 turmas',
    minClasses: 6,
    maxClasses: 10,
    pricePerTimetable: 40.00,
    active: true
  },
  {
    name: 'Plano Médio',
    description: 'Para escolas com 11 a 20 turmas',
    minClasses: 11,
    maxClasses: 20,
    pricePerTimetable: 65.00,
    active: true
  },
  {
    name: 'Plano Grande',
    description: 'Para escolas com 21 a 40 turmas',
    minClasses: 21,
    maxClasses: 40,
    pricePerTimetable: 110.00,
    active: true
  },
  {
    name: 'Plano Mega',
    description: 'Para escolas com mais de 40 turmas',
    minClasses: 41,
    maxClasses: 0, // 0 = ilimitado
    pricePerTimetable: 180.00,
    active: true
  }
];

async function seedPricing() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-timetable';
    await mongoose.connect(mongoURI);
    
    console.log('✅ Conectado ao MongoDB');
    
    // Limpar coleção existente
    await Pricing.deleteMany({});
    console.log('🧹 Coleção de preços limpa');
    
    // Inserir faixas de preço
    await Pricing.insertMany(pricingTiers);
    console.log('✅ Faixas de preço inseridas com sucesso!');
    
    // Listar faixas criadas
    const allPricing = await Pricing.find({}).sort({ minClasses: 1 });
    console.log('\n📊 FAIXAS DE PREÇO CRIADAS:\n');
    allPricing.forEach(tier => {
      const maxDisplay = tier.maxClasses === 0 ? 'Ilimitado' : tier.maxClasses;
      console.log(`${tier.name}:`);
      console.log(`  Turmas: ${tier.minClasses} - ${maxDisplay}`);
      console.log(`  Preço: R$ ${tier.pricePerTimetable.toFixed(2)} por horário`);
      console.log(`  Descrição: ${tier.description}\n`);
    });
    
    await mongoose.disconnect();
    console.log('✅ Processo concluído!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

seedPricing();
