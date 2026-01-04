const mongoose = require('mongoose');

const uri = 'mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable';

async function main() {
  try {
    await mongoose.connect(uri);
    console.log('✅ Conectado ao MongoDB\n');

    const db = mongoose.connection.db;
    const payments = await db.collection('payments').find({}).sort({ createdAt: -1 }).toArray();

    console.log('════════════════════════════════════════');
    console.log('💰 PAGAMENTOS ENCONTRADOS: ' + payments.length);
    console.log('════════════════════════════════════════\n');

    // Encontrar o mais recente do wanderpsc2006@yahoo.com.br
    const myPayment = payments.find(p => p.schoolEmail === 'wanderpsc2006@yahoo.com.br');

    if (!myPayment) {
      console.log('❌ Nenhum pagamento encontrado para wanderpsc2006@yahoo.com.br');
      process.exit(1);
    }

    console.log('✅ PAGAMENTO SELECIONADO PARA APROVAÇÃO:');
    console.log(`   Email: ${myPayment.schoolEmail}`);
    console.log(`   Valor: R$ ${myPayment.amount.toFixed(2)}`);
    console.log(`   Plano: ${myPayment.plan}`);
    console.log(`   Duração: ${myPayment.durationMonths} meses`);
    console.log(`   Data: ${new Date(myPayment.createdAt).toLocaleString('pt-BR')}`);
    console.log('');

    // Aprovar o pagamento
    await db.collection('payments').updateOne(
      { _id: myPayment._id },
      { 
        $set: { 
          status: 'approved',
          approvedAt: new Date()
        }
      }
    );

    // Ativar licença da escola
    const school = await db.collection('users').findOne({ email: myPayment.schoolEmail });
    
    if (school) {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + myPayment.durationMonths);

      await db.collection('users').updateOne(
        { email: myPayment.schoolEmail },
        {
          $set: {
            approvedByAdmin: true,
            registrationStatus: 'approved',
            licenseActive: true,
            licenseExpiryDate: expiryDate,
            plan: myPayment.plan,
            paymentStatus: 'paid'
          }
        }
      );

      console.log(`✅ Pagamento aprovado!`);
      console.log(`✅ Licença ativada para: ${school.schoolName || school.email}`);
      console.log(`📅 Válida até: ${expiryDate.toLocaleDateString('pt-BR')}`);
      console.log(`📦 Plano: ${myPayment.plan.toUpperCase()}`);
      console.log('');
    }

    // Excluir todos os outros pagamentos
    const idsToDelete = payments
      .filter(p => p._id.toString() !== myPayment._id.toString())
      .map(p => p._id);

    if (idsToDelete.length > 0) {
      const deleteResult = await db.collection('payments').deleteMany({
        _id: { $in: idsToDelete }
      });

      console.log(`🗑️  ${deleteResult.deletedCount} pagamentos de teste excluídos`);
    }

    console.log('\n════════════════════════════════════════');
    console.log('✅ OPERAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('════════════════════════════════════════');
    console.log('');
    console.log('📊 Resumo:');
    console.log('   ✅ 1 pagamento aprovado');
    console.log(`   🗑️  ${idsToDelete.length} pagamentos excluídos`);
    console.log('   🏫 Licença ativada');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();
