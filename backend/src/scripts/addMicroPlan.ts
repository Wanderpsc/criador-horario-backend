/**
 * Script para adicionar plano Micro (Pay-per-use)
 * © 2025 Wander Pires Silva Coelho
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Plan from '../models/Plan';

dotenv.config();

const microPlan = {
  name: 'Micro - Pagamento por Horário',
  description: 'Pague apenas pelo horário que criar, sem mensalidade',
  monthlyPrice: 0, // Sem mensalidade
  yearlyPrice: 0,
  maxUsers: 1,
  maxSchools: 1,
  features: [
    '💰 Sem mensalidade fixa',
    '📅 Pague apenas pelos horários criados',
    '🎯 Preço varia por quantidade de turmas:',
    '   • 1-5 turmas: R$ 25,00',
    '   • 6-10 turmas: R$ 40,00',
    '   • 11-20 turmas: R$ 65,00',
    '   • 21-40 turmas: R$ 110,00',
    '   • 41+ turmas: R$ 180,00',
    '✅ Suporte por email',
    '📄 Exportação em PDF'
  ],
  isActive: true
};

const addMicroPlan = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('📦 Conectado ao MongoDB');

    // Verificar se já existe
    const existing = await Plan.findOne({ name: /Micro/i });
    if (existing) {
      console.log('⚠️  Plano Micro já existe, atualizando...');
      await Plan.findByIdAndUpdate(existing._id, microPlan);
      console.log('✅ Plano Micro atualizado!');
    } else {
      const created = await Plan.create(microPlan);
      console.log('✅ Plano Micro criado com sucesso!');
      console.log(`   📌 ${created.name}`);
      console.log(`   💰 Sem mensalidade - Pague por uso`);
    }

    // Listar todos os planos
    const allPlans = await Plan.find().sort({ monthlyPrice: 1 });
    console.log('\n📋 Planos disponíveis:');
    allPlans.forEach((plan, index) => {
      const price = plan.monthlyPrice > 0 
        ? `R$ ${plan.monthlyPrice.toFixed(2)}/mês` 
        : 'Pague por uso';
      console.log(`   ${index + 1}. ${plan.name}: ${price}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
};

addMicroPlan();
