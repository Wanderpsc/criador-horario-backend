const mongoose = require('mongoose');
const readline = require('readline');

const uri = 'mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  try {
    await mongoose.connect(uri);
    console.log('✅ Conectado ao MongoDB\n');

    const db = mongoose.connection.db;
    const payments = await db.collection('payments').find({}).sort({ createdAt: -1 }).toArray();

    console.log('════════════════════════════════════════');
    console.log('💰 PAGAMENTOS NO BANCO DE DADOS');
    console.log('════════════════════════════════════════\n');

    payments.forEach((p, index) => {
      const date = new Date(p.createdAt).toLocaleString('pt-BR');
      console.log(`[${index + 1}] ${p.schoolEmail}`);
      console.log(`    R$ ${p.amount.toFixed(2)} - ${p.status} - ${p.paymentMethod}`);
      console.log(`    Data: ${date}`);
      console.log(`    ID: ${p._id}`);
      console.log('');
    });

    console.log('════════════════════════════════════════\n');

    // Perguntar qual aprovar
    const approveIndex = await question('Digite o número do pagamento para APROVAR (1-' + payments.length + '): ');
    const indexToApprove = parseInt(approveIndex) - 1;

    if (indexToApprove < 0 || indexToApprove >= payments.length) {
      console.log('❌ Número inválido!');
      process.exit(1);
    }

    const paymentToApprove = payments[indexToApprove];
    console.log(`\n✅ Selecionado para APROVAR: ${paymentToApprove.schoolEmail} - R$ ${paymentToApprove.amount}`);

    const confirm = await question('\nTem certeza? Digite "sim" para confirmar: ');
    
    if (confirm.toLowerCase() !== 'sim') {
      console.log('❌ Operação cancelada');
      process.exit(0);
    }

    // Aprovar o pagamento selecionado
    await db.collection('payments').updateOne(
      { _id: paymentToApprove._id },
      { 
        $set: { 
          status: 'approved',
          approvedAt: new Date()
        }
      }
    );

    // Ativar licença da escola
    const school = await db.collection('users').findOne({ email: paymentToApprove.schoolEmail });
    
    if (school) {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + paymentToApprove.durationMonths);

      await db.collection('users').updateOne(
        { email: paymentToApprove.schoolEmail },
        {
          $set: {
            approvedByAdmin: true,
            registrationStatus: 'approved',
            licenseActive: true,
            licenseExpiryDate: expiryDate,
            plan: paymentToApprove.plan,
            paymentStatus: 'paid'
          }
        }
      );

      console.log(`\n✅ Pagamento aprovado!`);
      console.log(`✅ Licença ativada para: ${school.email}`);
      console.log(`📅 Válida até: ${expiryDate.toLocaleDateString('pt-BR')}`);
      console.log(`📦 Plano: ${paymentToApprove.plan}`);
    } else {
      console.log(`\n⚠️  Pagamento aprovado mas escola não encontrada: ${paymentToApprove.schoolEmail}`);
    }

    // Excluir todos os outros pagamentos
    const idsToDelete = payments
      .filter(p => p._id.toString() !== paymentToApprove._id.toString())
      .map(p => p._id);

    if (idsToDelete.length > 0) {
      const deleteResult = await db.collection('payments').deleteMany({
        _id: { $in: idsToDelete }
      });

      console.log(`\n🗑️  ${deleteResult.deletedCount} pagamentos de teste excluídos`);
    }

    console.log('\n════════════════════════════════════════');
    console.log('✅ OPERAÇÃO CONCLUÍDA!');
    console.log('════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();
