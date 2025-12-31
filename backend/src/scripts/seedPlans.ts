/**
 * Script para popular planos iniciais
 * © 2025 Wander Pires Silva Coelho
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Plan from '../models/Plan';

dotenv.config();

const plans = [
  {
    name: 'Básico',
    description: 'Ideal para escolas pequenas',
    monthlyPrice: 99.90,
    yearlyPrice: 999.00,
    maxUsers: 5,
    maxSchools: 1,
    features: [
      'Até 5 usuários',
      '1 escola',
      'Geração ilimitada de horários',
      'Suporte por email',
      'Exportação em PDF'
    ],
    isActive: true
  },
  {
    name: 'Profissional',
    description: 'Para escolas de médio porte',
    monthlyPrice: 199.90,
    yearlyPrice: 1999.00,
    maxUsers: 15,
    maxSchools: 3,
    features: [
      'Até 15 usuários',
      'Até 3 escolas',
      'Geração ilimitada de horários',
      'Suporte prioritário',
      'Exportação em PDF e Excel',
      'Relatórios avançados'
    ],
    isActive: true
  },
  {
    name: 'Enterprise',
    description: 'Para redes de ensino',
    monthlyPrice: 399.90,
    yearlyPrice: 3999.00,
    maxUsers: 50,
    maxSchools: 10,
    features: [
      'Até 50 usuários',
      'Até 10 escolas',
      'Geração ilimitada de horários',
      'Suporte 24/7',
      'Exportação em múltiplos formatos',
      'Relatórios personalizados',
      'API de integração',
      'Treinamento incluído'
    ],
    isActive: true
  },
  {
    name: 'Trial',
    description: 'Teste grátis por 30 dias',
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxUsers: 2,
    maxSchools: 1,
    features: [
      'Até 2 usuários',
      '1 escola',
      'Até 10 horários',
      'Suporte básico',
      'Válido por 30 dias'
    ],
    isActive: true
  }
];

const seedPlans = async () => {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('📦 Conectado ao MongoDB');

    // Limpar planos existentes
    await Plan.deleteMany({});
    console.log('🗑️  Planos anteriores removidos');

    // Inserir novos planos
    const createdPlans = await Plan.insertMany(plans);
    console.log(`✅ ${createdPlans.length} planos criados com sucesso!`);

    createdPlans.forEach(plan => {
      console.log(`   - ${plan.name}: R$ ${plan.monthlyPrice.toFixed(2)}/mês`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao popular planos:', error);
    process.exit(1);
  }
};

seedPlans();
