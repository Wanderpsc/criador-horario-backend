/**
 * Script para criar credencial de acesso para o dono da escola CETI
 * Email diferente: cliente@ceti.com
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User';
import dotenv from 'dotenv';

dotenv.config();

async function createClienteCeti() {
  try {
    console.log('🔍 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Conectado ao MongoDB\n');

    const CLIENT_EMAIL = 'cliente@ceti.com';
    const CLIENT_PASSWORD = 'Ceti@2026';
    const SCHOOL_ID = '6948aa5c54a857ec2cf21a84'; // ID do dono original

    // Verificar se já existe
    const existing = await User.findOne({ email: CLIENT_EMAIL });
    if (existing) {
      console.log('⚠️  Usuário cliente@ceti.com já existe!');
      console.log(`   ID: ${existing._id}`);
      console.log(`   Role: ${existing.role}`);
      console.log(`   Escola: ${existing.schoolName}`);
      
      // Resetar senha
      const hashedPassword = await bcrypt.hash(CLIENT_PASSWORD, 10);
      existing.password = hashedPassword;
      existing.approvedByAdmin = true;
      existing.paymentStatus = 'paid';
      existing.registrationStatus = 'approved';
      await existing.save();
      
      console.log('\n✅ Senha atualizada para: Ceti@2026');
    } else {
      // Criar novo usuário
      const hashedPassword = await bcrypt.hash(CLIENT_PASSWORD, 10);
      
      const newUser = new User({
        name: 'CETI Desembargador Amaral',
        email: CLIENT_EMAIL,
        password: hashedPassword,
        role: 'school',
        schoolName: 'CETI - Centro de Educação',
        approvedByAdmin: true,
        paymentStatus: 'paid',
        registrationStatus: 'approved',
        licenseExpiryDate: new Date('2026-12-31')
      });

      await newUser.save();
      console.log('✅ Usuário criado com sucesso!');
      console.log(`   ID: ${newUser._id}`);
    }

    console.log('\n════════════════════════════════════════');
    console.log('🏫 CREDENCIAIS PARA ACESSO COMO ESCOLA:');
    console.log('════════════════════════════════════════');
    console.log(`📧 Email:    ${CLIENT_EMAIL}`);
    console.log(`🔑 Senha:    ${CLIENT_PASSWORD}`);
    console.log(`🎯 Destino:  Dashboard da Escola`);
    console.log(`📱 URL:      https://criador-horario-aula.surge.sh/#/login`);
    console.log('\n');

    console.log('════════════════════════════════════════');
    console.log('👨‍💼 CREDENCIAIS PARA ACESSO COMO ADMIN:');
    console.log('════════════════════════════════════════');
    console.log('📧 Email:    escola@ceti.com');
    console.log('🔑 Senha:    Ceti@2026');
    console.log('🎯 Destino:  Painel Administrativo');
    console.log('📱 URL:      https://criador-horario-aula.surge.sh/#/login');
    console.log('\n');

    await mongoose.connection.close();
    console.log('✅ Conexão fechada');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

createClienteCeti();
