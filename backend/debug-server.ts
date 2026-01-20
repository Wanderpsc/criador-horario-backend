import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import Teacher from './src/models/Teacher.js';
import TeacherSubject from './src/models/TeacherSubject.js';
import Subject from './src/models/Subject.js';
import Class from './src/models/Class.js';
import Grade from './src/models/Grade.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch((err) => console.error('❌ Erro:', err));

app.get('/api/debug-claudia', async (req, res) => {
  try {
    const claudia = await Teacher.findOne({ name: /Claudia/i, isActive: true });
    
    if (!claudia) {
      return res.json({ error: 'Professora Claudia não encontrada' });
    }

    const teacherSubjects = await TeacherSubject.find({ teacherId: claudia._id });
    
    const detalhes = [];
    let totalCalculado = 0;
    const cargas = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      outros: 0
    };
    
    for (const ts of teacherSubjects) {
      const subject = await Subject.findById(ts.subjectId);
      const classInfo = ts.classId ? await Class.findById(ts.classId).populate('gradeId') : null;
      
      if (subject) {
        const weeklyHours = subject.weeklyHours || 0;
        let className = 'SEM TURMA';
        
        if (classInfo) {
          const grade: any = classInfo.gradeId;
          const gradeName = grade?.title || grade?.name || 'Sem Série';
          className = `${gradeName}-${classInfo.name}`;
        }
        
        detalhes.push({
          id: ts._id.toString(),
          componente: subject.name,
          componenteId: subject._id.toString(),
          turma: className,
          turmaId: ts.classId ? ts.classId.toString() : null,
          weeklyHours: weeklyHours,
          weeklyHoursOriginal: subject.weeklyHours
        });
        
        totalCalculado += weeklyHours;
        
        if (weeklyHours === 1) cargas[1]++;
        else if (weeklyHours === 2) cargas[2]++;
        else if (weeklyHours === 3) cargas[3]++;
        else if (weeklyHours === 4) cargas[4]++;
        else cargas.outros++;
      }
    }
    
    // Valores esperados
    const esperado = {
      1: 4,  // 4 componentes de 1h
      2: 6,  // 6 componentes de 2h
      3: 4,  // 4 componentes de 3h
      total: 26
    };
    
    const diferencas = {
      1: cargas[1] - esperado[1],
      2: cargas[2] - esperado[2],
      3: cargas[3] - esperado[3],
      4: cargas[4],
      outros: cargas.outros,
      total: totalCalculado - esperado.total
    };
    
    res.json({
      success: true,
      professora: claudia.name,
      totalRegistros: teacherSubjects.length,
      totalCalculado: totalCalculado,
      totalEsperado: esperado.total,
      diferenca: diferencas.total,
      distribuicaoCargas: {
        encontrado: cargas,
        esperado: esperado,
        diferencas: diferencas
      },
      detalhes: detalhes.sort((a, b) => b.weeklyHours - a.weeklyHours)
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor debug rodando em http://localhost:${PORT}`);
  console.log(`📊 Acesse: http://localhost:${PORT}/api/debug-claudia\n`);
});
