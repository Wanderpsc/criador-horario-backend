/**
 * Rotas de Importação de PDF/Excel de Lotação
 * © 2025 Wander Pires Silva Coelho
 */

import express from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth';
import Teacher from '../models/Teacher';
import Subject from '../models/Subject';
import Class from '../models/Class';
import Grade from '../models/Grade';
import * as XLSX from 'xlsx';

// Import dinâmico para pdf-parse
const { PDFParse } = require('pdf-parse');
const pdfParse = PDFParse;

const router = express.Router();

// Configuração do multer para upload em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF ou Excel (.xlsx, .xls) são permitidos'));
    }
  }
});

// Função para normalizar texto (remover acentos, lowercase, etc.)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
};

// Função melhorada para encontrar match - muito mais tolerante
const findBestMatch = (search: string, options: any[], field: string = 'name'): any => {
  if (!search || options.length === 0) return null;
  
  const normalizedSearch = normalizeText(search);
  const searchWords = normalizedSearch.split(' ').filter(w => w.length > 2); // Palavras com 3+ letras
  
  // 1. Match exato
  const exactMatch = options.find(opt => normalizeText(opt[field]) === normalizedSearch);
  if (exactMatch) return exactMatch;
  
  // 2. Match contém (qualquer direção)
  const containsMatch = options.find(opt => {
    const normalized = normalizeText(opt[field]);
    return normalized.includes(normalizedSearch) || normalizedSearch.includes(normalized);
  });
  if (containsMatch) return containsMatch;
  
  // 3. Match por palavras-chave (pelo menos 70% das palavras coincidem)
  let bestMatch: any = null;
  let bestScore = 0;
  
  for (const opt of options) {
    const optWords = normalizeText(opt[field]).split(' ').filter(w => w.length > 2);
    let matches = 0;
    
    for (const searchWord of searchWords) {
      if (optWords.some(optWord => 
        optWord.includes(searchWord) || searchWord.includes(optWord) ||
        optWord.startsWith(searchWord.substring(0, 3)) // Primeiras 3 letras iguais
      )) {
        matches++;
      }
    }
    
    const score = matches / Math.max(searchWords.length, optWords.length);
    if (score > bestScore && score >= 0.5) { // Pelo menos 50% de match
      bestScore = score;
      bestMatch = opt;
    }
  }
  
  return bestMatch;
};

// Função para processar arquivo Excel
const processExcelFile = async (buffer: Buffer, userId: string) => {
  const debugLogs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    debugLogs.push(msg);
  };
  
  log('📊 Processando arquivo Excel...');
  
  // Ler arquivo Excel
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0]; // Primeira aba
  const worksheet = workbook.Sheets[sheetName];
  
  log(`📋 Aba lida: ${sheetName}`);
  
  // Converter para JSON (array de arrays)
  const data: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  log(`📊 Total de linhas no Excel: ${data.length}`);
  log('📄 Primeiras 5 linhas do Excel:');
  for (let i = 0; i < Math.min(5, data.length); i++) {
    log(`  Linha ${i + 1}: [${data[i].join(' | ')}]`);
  }
  
  // Buscar dados do banco
  const [teachers, subjects, classes] = await Promise.all([
    Teacher.find({ userId, isActive: true }),
    Subject.find({ userId }),
    Class.find({ userId, isActive: true }).populate('gradeId')
  ]);
  
  log(`📊 Dados disponíveis no banco:`);
  log(`  👨‍🏫 ${teachers.length} professores: ${teachers.map(t => t.name).slice(0, 10).join(', ')}${teachers.length > 10 ? '...' : ''}`);
  log(`  📚 ${subjects.length} disciplinas: ${subjects.map(s => s.name).slice(0, 10).join(', ')}${subjects.length > 10 ? '...' : ''}`);
  log(`  🏫 ${classes.length} turmas: ${classes.map(c => c.name).slice(0, 10).join(', ')}${classes.length > 10 ? '...' : ''}`);
  
  console.log(`📊 Dados disponíveis no banco:`);
  console.log(`  👨‍🏫 ${teachers.length} professores: ${teachers.map(t => t.name).join(', ')}`);
  console.log(`  📚 ${subjects.length} disciplinas: ${subjects.map(s => s.name).join(', ')}`);
  console.log(`  🏫 ${classes.length} turmas: ${classes.map(c => c.name).join(', ')}`);
  
  const associations: any[] = [];
  let headerRowIndex = -1;
  
  // Encontrar linha de cabeçalho (mais flexível)
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;
    
    const rowText = row.join(' ').toLowerCase();
    
    // Busca por palavras-chave do cabeçalho
    if (rowText.includes('professor') || rowText.includes('docente') ||
        rowText.includes('disciplina') || rowText.includes('componente') ||
        rowText.includes('turma') || rowText.includes('classe')) {
      headerRowIndex = i;
      console.log(`📋 Cabeçalho detectado na linha ${i + 1}: [${row.join(' | ')}]`);
      break;
    }
  }
  
  // Se não encontrou cabeçalho, assume que começa na linha 0
  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  console.log(`🔍 Iniciando processamento a partir da linha ${startRow + 1}`);
  
  // Processar linhas de dados
  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    
    // Pula linhas vazias
    if (!row || row.length === 0) {
      console.log(`⏭️ Linha ${i + 1}: vazia, pulando...`);
      continue;
    }
    
    // Precisa ter pelo menos 3 colunas
    if (row.length < 3) {
      console.log(`⏭️ Linha ${i + 1}: apenas ${row.length} colunas, pulando...`);
      continue;
    }
    
    const teacherName = String(row[0] || '').trim();
    const subjectName = String(row[1] || '').trim();
    const classFullName = String(row[2] || '').trim();
    
    // Pula se alguma célula importante estiver vazia
    if (!teacherName || !subjectName || !classFullName) {
      console.log(`⏭️ Linha ${i + 1}: dados incompletos [${teacherName}] [${subjectName}] [${classFullName}]`);
      continue;
    }
    
    console.log(`\n🔍 Linha ${i + 1}: [${teacherName}] [${subjectName}] [${classFullName}]`);
    
    // Busca professor
    const teacher = findBestMatch(teacherName, teachers);
    if (!teacher) {
      console.log(`❌ Professor não encontrado: "${teacherName}"`);
      console.log(`   Disponíveis: ${teachers.slice(0, 5).map(t => t.name).join(', ')}...`);
      continue;
    }
    console.log(`✅ Professor encontrado: ${teacher.name}`);
    
    // Busca disciplina (remove códigos/anos para melhor match)
    const cleanSubjectName = subjectName.replace(/\s*(EMI-INT|EMI|INT|ENS MED)\s*\d{4}.*$/i, '').trim();
    const subject = findBestMatch(cleanSubjectName, subjects);
    if (!subject) {
      console.log(`❌ Disciplina não encontrada: "${cleanSubjectName}" (original: "${subjectName}")`);
      console.log(`   Disponíveis: ${subjects.slice(0, 5).map(s => s.name).join(', ')}...`);
      continue;
    }
    console.log(`✅ Disciplina encontrada: ${subject.name}`);
    
    // Busca turma - tenta várias estratégias
    let classItem: any = null;
    
    // Estratégia 1: Match direto com nome completo
    classItem = classes.find((c: any) => 
      normalizeText(c.name) === normalizeText(classFullName)
    );
    
    if (!classItem) {
      // Estratégia 2: Extrai último identificador (A, B, C, etc)
      const classMatch = classFullName.match(/[IVX]*-([A-Z0-9]+)$/i);
      let classIdentifier = '';
      
      if (classMatch) {
        classIdentifier = classMatch[1];
      } else {
        const parts = classFullName.split(/[\s-]+/);
        classIdentifier = parts[parts.length - 1];
      }
      
      console.log(`🔍 Procurando turma: "${classIdentifier}" (extraído de: "${classFullName}")`);
      
      classItem = classes.find((c: any) => 
        normalizeText(c.name) === normalizeText(classIdentifier) ||
        normalizeText(c.name).includes(normalizeText(classIdentifier)) ||
        normalizeText(classIdentifier).includes(normalizeText(c.name))
      );
      
      // Estratégia 3: Se não encontrou, CRIA a turma automaticamente
      if (!classItem) {
        log(`⚠️ Turma "${classIdentifier}" não existe. Criando automaticamente...`);
        
        // Busca ou cria o ano/série padrão
        let grade = await Grade.findOne({ userId, name: '2ª Série' }); // Padrão
        if (!grade) {
          grade = await Grade.create({
            userId,
            name: '2ª Série',
            description: 'Criado automaticamente na importação'
          });
          log(`  ✅ Ano/Série "2ª Série" criado`);
        }
        
        classItem = await Class.create({
          userId,
          name: classIdentifier,
          gradeId: grade._id,
          shift: 'Manhã', // Padrão
          capacity: 40, // Padrão
          isActive: true
        });
        
        // Adiciona à lista para próximas iterações
        classes.push(classItem);
        
        log(`  ✅ Turma "${classIdentifier}" criada com sucesso!`);
      }
    }
    
    if (!classItem) {
      log(`❌ Erro ao processar turma: "${classFullName}"`);
      continue;
    }
    log(`✅ Turma confirmada: ${classItem.name}`);
    
    // Adiciona a associação
    associations.push({
      teacher: teacher.name,
      teacherId: teacher._id.toString(),
      subject: subject.name,
      subjectId: subject._id.toString(),
      class: `${(classItem as any).gradeId?.name || ''} ${classItem.name}`.trim(),
      classId: classItem._id.toString(),
    });
    
    log(`🎯 Lotação adicionada: ${teacher.name} → ${subject.name} → ${classItem.name}`);
  }
  
  return { associations, debugLogs };
};

// Rota para processar PDF/Excel de lotação
router.post('/parse-pdf', auth, upload.single('pdf'), async (req: any, res: any) => {
  try {
    console.log('🔵 Iniciando processamento de arquivo...');
    
    if (!req.file) {
      console.log('⚠️ Nenhum arquivo enviado');
      return res.status(400).json({ message: 'Nenhum arquivo foi enviado' });
    }

    console.log('📄 Arquivo recebido:', req.file.originalname, '- Tamanho:', req.file.size, 'bytes');
    console.log('📄 Tipo MIME:', req.file.mimetype);
    
    let associations: any[] = [];
    let debugLogs: string[] = [];
    
    // Verifica se é Excel ou PDF
    if (req.file.mimetype.includes('spreadsheet') || req.file.mimetype.includes('excel')) {
      // Processar Excel
      const result = await processExcelFile(req.file.buffer, req.user.id);
      associations = result.associations;
      debugLogs = result.debugLogs;
    } else {
      // Processar PDF (mantém lógica existente)
      console.log('🔄 Criando parser PDF...');
      const parser = new pdfParse({ data: req.file.buffer });
      
      console.log('🔄 Extraindo texto...');
      const result = await parser.getText();
      const text = result.text;
      
      console.log('🔄 Destruindo parser...');
      await parser.destroy();
      
      console.log('📝 Texto extraído do PDF - Tamanho:', text.length, 'caracteres');
      
      // Log das primeiras 1000 caracteres para debug
      console.log('📄 Primeiras linhas do PDF:');
      console.log('─'.repeat(50));
      console.log(text.substring(0, 1000));
      console.log('─'.repeat(50));
      
      // Buscar dados do banco
      const [teachers, subjects, classes] = await Promise.all([
        Teacher.find({ userId: req.user.id, isActive: true }),
        Subject.find({ userId: req.user.id }),
        Class.find({ userId: req.user.id, isActive: true }).populate('gradeId')
      ]);
      
      console.log(`📊 Dados disponíveis: ${teachers.length} professores, ${subjects.length} disciplinas, ${classes.length} turmas`);
      
      // Processar texto linha por linha
      const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
      
      // Formato específico: Professor [TAB] Componente Curricular [TAB] Turma Completa
      console.log('🔍 Iniciando extração de lotações...');
      
      for (const line of lines) {
        // Pula a linha de cabeçalho
        if (line.includes('Professor') && line.includes('Componente Curricular') && line.includes('Turma Completa')) {
          console.log('📋 Cabeçalho detectado, pulando...');
          continue;
        }
        
        // Divide a linha por TAB
        const columns = line.split('\t').map((col: string) => col.trim()).filter((col: string) => col.length > 0);
        
        // Precisa ter 3 colunas: Professor, Disciplina, Turma
        if (columns.length >= 3) {
          const teacherName = columns[0];
          const subjectName = columns[1];
          const classFullName = columns[2];
          
          console.log(`\n🔍 Linha detectada: [${teacherName}] [${subjectName}] [${classFullName}]`);
          
          // Busca professor
          const teacher = findBestMatch(teacherName, teachers);
          if (!teacher) {
            console.log(`❌ Professor não encontrado: ${teacherName}`);
            continue;
          }
          console.log(`✅ Professor encontrado: ${teacher.name}`);
          
          // Busca disciplina (pode incluir código como "EMI-INT 2024")
          // Remove códigos/anos da disciplina para melhor match
          const cleanSubjectName = subjectName.replace(/\s*(EMI-INT|EMI|INT|ENS MED)\s*\d{4}.*$/i, '').trim();
          const subject = findBestMatch(cleanSubjectName, subjects);
          if (!subject) {
            console.log(`❌ Disciplina não encontrada: ${cleanSubjectName} (original: ${subjectName})`);
            continue;
          }
          console.log(`✅ Disciplina encontrada: ${subject.name}`);
          
          // Busca turma - extrai o identificador da turma do nome completo
          // Exemplo: "CT DES SIST-2ªSÉRIE-I-A" → buscar turma "A"
          // ou "CT DES SIST-2ªSÉRIE-I-B" → buscar turma "B"
          const classMatch = classFullName.match(/[IVX]*-([A-Z0-9]+)$/i);
          let classIdentifier = '';
          
          if (classMatch) {
            classIdentifier = classMatch[1]; // Último identificador (A, B, C, etc)
          } else {
            // Tenta pegar o último pedaço separado por espaço ou hífen
            const parts = classFullName.split(/[\s-]+/);
            classIdentifier = parts[parts.length - 1];
          }
          
          console.log(`🔍 Procurando turma: ${classIdentifier} (de: ${classFullName})`);
          
          const classItem = classes.find((c: any) => 
            normalizeText(c.name) === normalizeText(classIdentifier) ||
            normalizeText(c.name).includes(normalizeText(classIdentifier)) ||
            normalizeText(classIdentifier).includes(normalizeText(c.name))
          );
          
          if (!classItem) {
            console.log(`❌ Turma não encontrada: ${classIdentifier}`);
            continue;
          }
          console.log(`✅ Turma encontrada: ${classItem.name}`);
          
          // Adiciona a associação
          associations.push({
            teacher: teacher.name,
            teacherId: teacher._id.toString(),
            subject: subject.name,
            subjectId: subject._id.toString(),
            class: `${(classItem as any).gradeId?.name || ''} ${classItem.name}`.trim(),
            classId: classItem._id.toString(),
          });
          
          console.log(`🎯 Lotação adicionada: ${teacher.name} → ${subject.name} → ${classItem.name}`);
        }
      }
    }
    
    console.log(`🎯 Total de lotações identificadas: ${associations.length}`);
    
    res.json({
      success: true,
      data: {
        totalLines: associations.length,
        textSample: associations.length > 0 ? 'Excel/PDF processado com sucesso' : 'Nenhuma lotação encontrada',
        associations: associations,
        debugLogs: debugLogs, // Adiciona logs para debug
        stats: {
          teachers: new Set(associations.map(a => a.teacherId)).size,
          subjects: new Set(associations.map(a => a.subjectId)).size,
          classes: new Set(associations.map(a => a.classId)).size
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao processar arquivo:', error);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Mensagem:', error.message);
    res.status(500).json({ 
      message: 'Erro ao processar arquivo', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Endpoint de debug - retorna dados cadastrados
router.get('/debug-data', auth, async (req: any, res: any) => {
  try {
    const [teachers, subjects, classes] = await Promise.all([
      Teacher.find({ userId: req.user.id, isActive: true }),
      Subject.find({ userId: req.user.id }),
      Class.find({ userId: req.user.id, isActive: true }).populate('gradeId')
    ]);
    
    res.json({
      success: true,
      data: {
        teachers: teachers.map(t => ({ id: t._id, name: t.name })),
        subjects: subjects.map(s => ({ id: s._id, name: s.name })),
        classes: classes.map(c => ({ id: c._id, name: c.name, grade: (c as any).gradeId?.name }))
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao buscar dados', error: error.message });
  }
});

export default router;
