import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import Class from '../models/Class';

async function backupClassSubjects() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-timetable';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB conectado\n');

    console.log('📦 Criando backup de Turmas & Componentes...\n');

    // Buscar todas as turmas com seus componentes
    const classes = await Class.find({})
      .populate('gradeId')
      .lean();

    // Criar estrutura de backup
    const backup = {
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString('pt-BR'),
      totalClasses: classes.length,
      data: classes.map(c => ({
        id: c._id.toString(),
        name: c.name,
        gradeName: (c.gradeId as any)?.name || 'Sem série',
        shift: c.shift,
        capacity: c.capacity,
        subjectIds: c.subjectIds || [],
        subjectWeeklyHours: c.subjectWeeklyHours || {},
        isActive: c.isActive !== false
      }))
    };

    // Criar pasta de backups se não existir
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Nome do arquivo com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `class-subjects-backup-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);

    // Salvar backup
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');

    console.log(`✅ Backup criado com sucesso!`);
    console.log(`📁 Arquivo: ${filepath}`);
    console.log(`📊 ${backup.totalClasses} turma(s) salvas`);
    console.log(`\n📋 Resumo por turma:`);
    
    backup.data.forEach(c => {
      const componentsCount = c.subjectIds.length;
      console.log(`   - ${c.gradeName} - ${c.name}: ${componentsCount} componentes`);
    });

    console.log(`\n💡 Para restaurar este backup, execute:`);
    console.log(`   npx ts-node src/scripts/restoreClassSubjects.ts ${filename}`);

  } catch (error) {
    console.error('❌ Erro ao criar backup:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

backupClassSubjects();
