import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import Class from '../models/Class';

async function restoreClassSubjects() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-timetable';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB conectado\n');

    // Pegar nome do arquivo do argumento ou usar o mais recente
    const backupDir = path.join(process.cwd(), 'backups');
    let filename = process.argv[2];

    if (!filename) {
      // Buscar backup mais recente
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('class-subjects-backup-') && f.endsWith('.json'))
        .sort()
        .reverse();
      
      if (files.length === 0) {
        console.error('❌ Nenhum backup encontrado em:', backupDir);
        process.exit(1);
      }
      
      filename = files[0];
      console.log(`📂 Usando backup mais recente: ${filename}\n`);
    }

    const filepath = path.join(backupDir, filename);

    if (!fs.existsSync(filepath)) {
      console.error(`❌ Arquivo não encontrado: ${filepath}`);
      process.exit(1);
    }

    // Ler backup
    const backupContent = fs.readFileSync(filepath, 'utf-8');
    const backup = JSON.parse(backupContent);

    console.log(`📦 Restaurando backup de: ${backup.date}`);
    console.log(`📊 Total de turmas: ${backup.totalClasses}\n`);

    // Confirmar
    console.log('⚠️  ATENÇÃO: Esta operação irá sobrescrever os dados atuais!');
    console.log('   Pressione Ctrl+C para cancelar ou aguarde 5 segundos...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    let restoredCount = 0;
    for (const classData of backup.data) {
      const classItem = await Class.findById(classData.id);
      
      if (!classItem) {
        console.log(`⚠️  Turma ${classData.gradeName} - ${classData.name} não encontrada, pulando...`);
        continue;
      }

      classItem.subjectIds = classData.subjectIds as any;
      classItem.subjectWeeklyHours = classData.subjectWeeklyHours;
      await classItem.save();

      restoredCount++;
      console.log(`✅ Restaurado: ${classData.gradeName} - ${classData.name} (${classData.subjectIds.length} componentes)`);
    }

    console.log(`\n✅ Restauração concluída!`);
    console.log(`📊 ${restoredCount} turma(s) restaurada(s)`);

  } catch (error) {
    console.error('❌ Erro ao restaurar backup:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

restoreClassSubjects();
