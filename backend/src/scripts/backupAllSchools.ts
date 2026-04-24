/**
 * ============================================================
 * BACKUP COMPLETO POR ESCOLA — EduSync PRO
 * © 2025 Wander Pires Silva Coelho
 * ============================================================
 *
 * Uso:
 *   npx ts-node src/scripts/backupAllSchools.ts
 *   (ou via npm run backup:escolas)
 *
 * Saída:
 *   E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO 2\CRIADOR DE HORÁRIO DE AULA\
 *   backups-escolas\
 *     ├── ESCOLA_NOME_SEGURO\
 *     │   ├── 2026-04-23_22-30-00\
 *     │   │   ├── _escola.json         ← dados cadastrais da escola
 *     │   │   ├── professores.json
 *     │   │   ├── disciplinas.json
 *     │   │   ├── series.json
 *     │   │   ├── turmas.json
 *     │   │   ├── horarios_gerados.json
 *     │   │   ├── horario_emergencial.json
 *     │   │   ├── calendario.json
 *     │   │   ├── funcionarios.json
 *     │   │   ├── carga_horaria.json
 *     │   │   ├── frequencia.json
 *     │   │   ├── letreiro.json
 *     │   │   └── _resumo.json         ← sumário de contagens
 *     │   └── (backups anteriores)
 *     └── _ultimo_backup.json          ← log geral
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// ─── Carregar variáveis de ambiente ────────────────────────────────────────
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ─── Modelos ────────────────────────────────────────────────────────────────
import User from '../models/User';
import Teacher from '../models/Teacher';
import Subject from '../models/Subject';
import Grade from '../models/Grade';
import Class from '../models/Class';
import Timetable from '../models/Timetable';
import GeneratedTimetable from '../models/GeneratedTimetable';
import EmergencySchedule from '../models/EmergencySchedule';
import SchoolDay from '../models/SchoolDay';
import Employee from '../models/Employee';
import TeacherSubject from '../models/TeacherSubject';
import MakeupSaturday from '../models/MakeupSaturday';
import PanelTicker from '../models/PanelTicker';

// ─── Pasta raiz de saída ────────────────────────────────────────────────────
const BACKUP_ROOT = path.resolve(
  'E:\\1. Nova pasta\\MEUS PROJETOS DE PROGRAMAÇÃO 2\\CRIADOR DE HORÁRIO DE AULA',
  'backups-escolas'
);

// ─── Utilitários ────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');

const timestampNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
};

const safeFolderName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase()
    .slice(0, 60);

const writeJSON = (filePath: string, data: unknown) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const countOrEmpty = (arr: unknown[]) => arr.length;

// ─── Função principal ────────────────────────────────────────────────────────
async function backupAllSchools() {
  const MONGO_URI = process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.error('❌  MONGODB_URI não encontrada no .env');
    process.exit(1);
  }

  console.log('\n🔗 Conectando ao MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Conectado!\n');

  // Garantir pasta raiz
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });

  const timestamp = timestampNow();
  const logGeral: Record<string, unknown>[] = [];

  // ─── Listar todas as escolas cadastradas ───────────────────────────────
  const schools = await User.find({ role: 'school' }).lean();
  console.log(`🏫 Total de escolas encontradas: ${schools.length}\n`);

  if (schools.length === 0) {
    console.log('⚠️  Nenhuma escola com role "school" encontrada.');
    await mongoose.disconnect();
    return;
  }

  for (const school of schools) {
    const schoolId = String(school._id);
    const schoolName = (school as any).schoolName || (school as any).name || schoolId;
    const folderName = safeFolderName(schoolName);
    const schoolDir = path.join(BACKUP_ROOT, folderName);
    const snapDir  = path.join(schoolDir, timestamp);

    fs.mkdirSync(snapDir, { recursive: true });

    console.log(`📦 Fazendo backup: ${schoolName}`);
    console.log(`   📁 Pasta: ${snapDir}`);

    // ── Coletar dados ──────────────────────────────────────────────────
    const [
      professores,
      disciplinas,
      series,
      turmas,
      timetables,
      horarios_gerados,
      horario_emergencial,
      calendario,
      funcionarios,
      carga_horaria,
      frequencia,
      letreiro,
      sabados_reposicao,
    ] = await Promise.all([
      Teacher.find({ schoolId }).lean(),
      Subject.find({ schoolId }).lean(),
      Grade.find({ schoolId }).lean(),
      // Class e Timetable usam userId em vez de schoolId
      Class.find({ userId: schoolId }).lean(),
      Timetable.find({ userId: schoolId }).lean(),
      // GeneratedTimetable usa campo "school"
      GeneratedTimetable.find({ school: schoolId }).lean(),
      EmergencySchedule.find({ schoolId }).lean(),
      SchoolDay.find({ schoolId }).lean(),
      Employee.find({ schoolId }).lean(),
      TeacherSubject.find({ schoolId }).lean(),
      // TeacherAttendance pode não estar importada — buscar via mongoose direto
      mongoose.connection.collection('teacherattendances').find({ schoolId }).toArray(),
      PanelTicker.find({ schoolId }).lean(),
      MakeupSaturday.find({ schoolId }).lean(),
    ]);

    // ── Dados cadastrais da escola (sem senha) ─────────────────────────
    const { password: _pw, ...schoolSafe } = school as any;

    // ── Gravar arquivos ────────────────────────────────────────────────
    writeJSON(path.join(snapDir, '_escola.json'),            schoolSafe);
    writeJSON(path.join(snapDir, 'professores.json'),        professores);
    writeJSON(path.join(snapDir, 'disciplinas.json'),        disciplinas);
    writeJSON(path.join(snapDir, 'series.json'),             series);
    writeJSON(path.join(snapDir, 'turmas.json'),             turmas);
    writeJSON(path.join(snapDir, 'grades_horario.json'),     timetables);
    writeJSON(path.join(snapDir, 'horarios_gerados.json'),   horarios_gerados);
    writeJSON(path.join(snapDir, 'horario_emergencial.json'),horario_emergencial);
    writeJSON(path.join(snapDir, 'calendario.json'),         calendario);
    writeJSON(path.join(snapDir, 'funcionarios.json'),       funcionarios);
    writeJSON(path.join(snapDir, 'carga_horaria.json'),      carga_horaria);
    writeJSON(path.join(snapDir, 'frequencia.json'),         frequencia);
    writeJSON(path.join(snapDir, 'letreiro.json'),           letreiro);
    writeJSON(path.join(snapDir, 'sabados_reposicao.json'),  sabados_reposicao);

    // ── Resumo da escola ───────────────────────────────────────────────
    const resumo = {
      escola: schoolName,
      schoolId,
      dataBackup: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      timestamp,
      contagens: {
        professores:         countOrEmpty(professores),
        disciplinas:         countOrEmpty(disciplinas),
        series:              countOrEmpty(series),
        turmas:              countOrEmpty(turmas),
        grades_horario:      countOrEmpty(timetables),
        horarios_gerados:    countOrEmpty(horarios_gerados),
        horario_emergencial: countOrEmpty(horario_emergencial),
        dias_calendario:     countOrEmpty(calendario),
        funcionarios:        countOrEmpty(funcionarios),
        carga_horaria:       countOrEmpty(carga_horaria),
        registros_frequencia:countOrEmpty(frequencia),
        sabados_reposicao:   countOrEmpty(sabados_reposicao),
      },
    };

    writeJSON(path.join(snapDir, '_resumo.json'), resumo);

    // Log no console
    console.log(`   ✅ Professores: ${resumo.contagens.professores}`);
    console.log(`   ✅ Disciplinas: ${resumo.contagens.disciplinas}`);
    console.log(`   ✅ Turmas: ${resumo.contagens.turmas}`);
    console.log(`   ✅ Horários gerados: ${resumo.contagens.horarios_gerados}`);
    console.log(`   ✅ Funcionários: ${resumo.contagens.funcionarios}`);
    console.log('');

    logGeral.push(resumo);

    // ── Manter apenas os 10 backups mais recentes por escola ──────────
    try {
      const snaps = fs.readdirSync(schoolDir)
        .filter(f => fs.statSync(path.join(schoolDir, f)).isDirectory())
        .sort()
        .reverse();

      const KEEP = 10;
      if (snaps.length > KEEP) {
        for (const old of snaps.slice(KEEP)) {
          const oldPath = path.join(schoolDir, old);
          fs.rmSync(oldPath, { recursive: true, force: true });
          console.log(`   🗑️  Backup antigo removido: ${old}`);
        }
      }
    } catch (_) {
      // ignora erros de limpeza
    }
  }

  // ─── Log geral ──────────────────────────────────────────────────────────
  writeJSON(path.join(BACKUP_ROOT, '_ultimo_backup.json'), {
    realizadoEm: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    timestamp,
    totalEscolas: schools.length,
    escolas: logGeral,
  });

  await mongoose.disconnect();

  console.log('══════════════════════════════════════════════════════════');
  console.log(`✅ BACKUP CONCLUÍDO — ${schools.length} escola(s)`);
  console.log(`📁 Local: ${BACKUP_ROOT}`);
  console.log('══════════════════════════════════════════════════════════\n');
}

// ─── Execução ────────────────────────────────────────────────────────────────
backupAllSchools().catch(err => {
  console.error('❌ Erro fatal no backup:', err);
  mongoose.disconnect();
  process.exit(1);
});
