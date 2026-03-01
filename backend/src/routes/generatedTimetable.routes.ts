import { Router } from 'express';
import GeneratedTimetable from '../models/GeneratedTimetable';
import TeacherSubject from '../models/TeacherSubject';
import Class from '../models/Class';
import Subject from '../models/Subject';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();

const toPositiveInteger = (value: unknown): number => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }
  return Math.max(0, Math.floor(numericValue));
};

const getClassSubjectHours = (classItem: any, subjectId: string): number | undefined => {
  if (!classItem?.subjectWeeklyHours) {
    return undefined;
  }

  const subjectWeeklyHours = classItem.subjectWeeklyHours;
  if (subjectWeeklyHours instanceof Map) {
    return subjectWeeklyHours.get(subjectId);
  }

  if (typeof subjectWeeklyHours.get === 'function') {
    return subjectWeeklyHours.get(subjectId);
  }

  return subjectWeeklyHours[subjectId];
};

// Salvar ou atualizar horários
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    // ✅ ISOLAMENTO DE DADOS POR ESCOLA
    const schoolId = req.user?.schoolId || req.user?.id;
    const userId = req.user?.id;
    
    console.log('📥 POST /generated-timetables recebido');
    console.log('📥 req.body:', JSON.stringify(req.body, null, 2).substring(0, 500));
    
    const { scheduleId, timetables, title } = req.body;

    console.log('📝 Salvando horários:', { 
      schoolId,
      scheduleId, 
      title, 
      numClasses: Object.keys(timetables || {}).length,
      hasScheduleId: !!scheduleId,
      hasTimetables: !!timetables,
      hasTitle: !!title
    });

    if (!scheduleId || !timetables || !title) {
      console.log('❌ Validação falhou!');
      return res.status(400).json({ 
        success: false, 
        message: 'scheduleId, timetables e title são obrigatórios' 
      });
    }

    const classIds = Object.keys(timetables || {});
    if (classIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma turma foi enviada para salvar'
      });
    }

    const teacherSubjects = await TeacherSubject.find({
      userId,
      classId: { $in: classIds }
    }).lean();

    const classDocs = await Class.find({ _id: { $in: classIds } }).lean();
    const classById = new Map(classDocs.map((classItem: any) => [String(classItem._id), classItem]));

    const subjectIds = Array.from(
      new Set(
        teacherSubjects
          .map((association: any) => String(association.subjectId || ''))
          .filter(Boolean)
      )
    );
    const subjectDocs = subjectIds.length > 0
      ? await Subject.find({ _id: { $in: subjectIds } }).lean()
      : [];
    const subjectById = new Map(subjectDocs.map((subjectItem: any) => [String(subjectItem._id), subjectItem]));

    const expectedAllocation = new Map<string, number>();
    for (const association of teacherSubjects as any[]) {
      if (!association.classId || !association.subjectId || !association.teacherId) {
        continue;
      }

      const classId = String(association.classId);
      const subjectId = String(association.subjectId);
      const teacherId = String(association.teacherId);

      const classItem = classById.get(classId);
      const subjectItem = subjectById.get(subjectId);
      if (!classItem || !subjectItem) {
        continue;
      }

      let expectedHours: number | undefined =
        association.weeklyHours !== undefined && association.weeklyHours !== null
          ? Number(association.weeklyHours)
          : undefined;

      if (expectedHours === undefined || Number.isNaN(expectedHours)) {
        const classHours = getClassSubjectHours(classItem, subjectId);
        if (classHours !== undefined && classHours !== null) {
          expectedHours = Number(classHours);
        } else if (subjectItem.weeklyHours !== undefined && subjectItem.weeklyHours !== null) {
          expectedHours = Number(subjectItem.weeklyHours);
        } else {
          expectedHours = 2;
        }
      }

      const normalizedExpected = toPositiveInteger(expectedHours);
      const key = `${classId}|${subjectId}|${teacherId}`;
      expectedAllocation.set(key, (expectedAllocation.get(key) || 0) + normalizedExpected);
    }

    const generatedAllocation = new Map<string, number>();
    for (const [classId, slots] of Object.entries(timetables as Record<string, any[]>)) {
      const classSlots = Array.isArray(slots) ? slots : [];
      for (const slot of classSlots) {
        if (!slot?.subjectId || !slot?.teacherId) {
          continue;
        }
        const key = `${classId}|${String(slot.subjectId)}|${String(slot.teacherId)}`;
        generatedAllocation.set(key, (generatedAllocation.get(key) || 0) + 1);
      }
    }

    const deficits: any[] = [];
    for (const [key, expected] of expectedAllocation.entries()) {
      const generated = generatedAllocation.get(key) || 0;
      if (generated >= expected) {
        continue;
      }

      const [classId, subjectId, teacherId] = key.split('|');
      const classItem = classById.get(classId);
      const subjectItem = subjectById.get(subjectId);

      deficits.push({
        classId,
        className: classItem?.name || classId,
        subjectId,
        subjectName: subjectItem?.name || subjectId,
        teacherId,
        expected,
        generated,
        missing: expected - generated
      });
    }

    if (deficits.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Horário incompleto: existem lotações com déficit de aulas. Gere novamente antes de salvar.',
        deficits,
        summary: {
          totalDeficits: deficits.length,
          totalMissingLessons: deficits.reduce((sum, item) => sum + item.missing, 0)
        }
      });
    }

    // ✅ Deletar apenas horários da mesma escola
    const deleted = await GeneratedTimetable.deleteMany({ 
      scheduleId, 
      title,
      school: schoolId 
    });
    console.log(`🗑️  Deletados ${deleted.deletedCount} registros antigos com título "${title}"`);

    const savedTimetables = [];

    // Salvar cada horário de turma
    for (const [classId, slots] of Object.entries(timetables)) {
      console.log(`💾 Salvando turma ${classId} com ${(slots as any).length} slots`);
      const timetable = new GeneratedTimetable({
        scheduleId,
        classId,
        slots,
        title,
        school: schoolId,  // ✅ Associar à escola
        userId
      });
      await timetable.save();
      savedTimetables.push(timetable);
    }

    console.log(`✅ ${savedTimetables.length} horários salvos com sucesso!`);

    res.json({ 
      success: true, 
      data: savedTimetables,
      message: 'Horários salvos com sucesso'
    });
  } catch (error: any) {
    console.error('❌ ERRO ao salvar horários:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao salvar horários',
      error: error.message 
    });
  }
});

// Listar todos os horários salvos agrupados por título
router.get('/list/:scheduleId', auth, async (req: AuthRequest, res) => {
  try {
    // ✅ ISOLAMENTO DE DADOS POR ESCOLA
    const schoolId = req.user?.schoolId || req.user?.id;
    const { scheduleId } = req.params;

    const timetables = await GeneratedTimetable.find({ scheduleId, school: schoolId })
      .sort({ createdAt: -1 });

    // Agrupar por título (cada título representa um conjunto de horários)
    const grouped = timetables.reduce((acc: any, item: any) => {
      if (!acc[item.title]) {
        acc[item.title] = {
          title: item.title,
          scheduleId: item.scheduleId,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          timetables: {}
        };
      }
      acc[item.title].timetables[item.classId] = item.slots;
      return acc;
    }, {});

    res.json({ 
      success: true, 
      data: Object.values(grouped) 
    });
  } catch (error: any) {
    console.error('Erro ao listar horários:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao listar horários',
      error: error.message 
    });
  }
});

// Listar grades geradas do usuário autenticado
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    console.log('📊 GET /generated-timetables - req.user.id:', req.user!.id);
    const schoolId = req.user?.schoolId || req.user?.id;
    
    // Buscar apenas horários do usuário/escola autenticada
    const timetables = await GeneratedTimetable.find({
      $or: [
        { school: schoolId },
        { userId: req.user!.id },
        { userId: req.user!.id.toString() }
      ]
    }).sort({ createdAt: -1 });
    
    console.log('📊 Grades geradas encontradas:', timetables.length);
    
    // Filtrar apenas documentos com título válido
    const validTimetables = timetables.filter((t: any) => t.title && t.title.trim() !== '');
    
    console.log('📊 Com título válido:', validTimetables.length);
    
    // Agrupar por título para remover duplicatas
    const groupedByTitle = validTimetables.reduce((acc: any, timetable: any) => {
      const titleKey = timetable.title;
      if (!acc[titleKey]) {
        acc[titleKey] = {
          title: timetable.title,
          scheduleId: timetable.scheduleId,
          createdAt: timetable.createdAt,
          updatedAt: timetable.updatedAt
        };
      }
      return acc;
    }, {});
    
    // Converter para array
    const uniqueTimetables = Object.values(groupedByTitle);
    
    console.log('📊 Títulos únicos:', uniqueTimetables.length);
    if (uniqueTimetables.length > 0) {
      console.log('📊 Exemplo:', uniqueTimetables[0]);
    }
    
    res.json(uniqueTimetables);
  } catch (error: any) {
    console.error('❌ Erro em GET /generated-timetables:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Buscar TODOS os horários salvos (para uso no EmergencySchedule com "Todas as Turmas")
router.get('/all', auth, async (req: AuthRequest, res) => {
  try {
    // ✅ ISOLAMENTO DE DADOS POR ESCOLA
    const schoolId = req.user?.schoolId || req.user?.id;
    console.log('🔍 Buscando horários salvos da escola:', schoolId);

    // Buscar apenas horários da escola do usuário
    const timetables = await GeneratedTimetable.find({ school: schoolId })
      .sort({ createdAt: -1 })
      .limit(50); // Limitar aos 50 mais recentes

    console.log(`📚 Encontrados ${timetables.length} horários no total`);

    // Importar models necessários
    const Subject = require('../models/Subject').default;
    const Teacher = require('../models/Teacher').default;
    const Class = require('../models/Class').default;
    const Grade = require('../models/Grade').default;

    // Agrupar por título (cada título representa um conjunto completo de horários)
    const groupedByTitle: any = {};
    
    for (const tt of timetables) {
      const title = tt.title || 'Sem título';
      if (!groupedByTitle[title]) {
        groupedByTitle[title] = {
          _id: tt._id.toString(),
          title: title,
          scheduleId: tt.scheduleId,
          createdAt: tt.createdAt,
          timetable: {},
          ids: [tt._id.toString()]
        };
      } else {
        groupedByTitle[title].ids.push(tt._id.toString());
      }
      
      // Popular os slots desta turma
      const populatedSlots = [];
      for (const slot of tt.slots) {
        try {
          const [subject, teacher, classDoc] = await Promise.all([
            Subject.findById(slot.subjectId),
            Teacher.findById(slot.teacherId),
            Class.findById(slot.classId)
          ]);
          
          let grade = null;
          if (classDoc && classDoc.gradeId) {
            grade = await Grade.findById(classDoc.gradeId);
          }
          
          populatedSlots.push({
            ...((slot as any).toObject ? (slot as any).toObject() : slot),
            subjectName: subject?.name || 'Disciplina',
            teacherName: teacher?.name || 'Professor',
            className: classDoc?.name || 'Turma',
            gradeName: grade?.name || '',
            subjectColor: subject?.color || '#3B82F6'
          });
        } catch (err) {
          console.error('Erro ao popular slot:', err);
          populatedSlots.push({
            ...slot,
            subjectName: 'Erro',
            teacherName: 'Erro',
            className: 'Erro',
            gradeName: '',
            subjectColor: '#EF4444'
          });
        }
      }
      
      groupedByTitle[title].timetable[tt.classId] = populatedSlots;
    }

    console.log('📦 Grupos criados:', Object.keys(groupedByTitle));
    Object.keys(groupedByTitle).forEach(title => {
      console.log(`   ${title}: _id=${groupedByTitle[title]._id}, turmas=${Object.keys(groupedByTitle[title].timetable).length}`);
    });

    // Converter para array e formatar
    const formattedTimetables = Object.values(groupedByTitle).map((group: any) => {
      const formatted = {
        _id: String(group._id),
        name: String(group.title),
        createdAt: group.createdAt ? new Date(group.createdAt).toISOString() : new Date().toISOString(),
        timetable: group.timetable,
        classCount: Object.keys(group.timetable).length
      };
      console.log('🔧 Formatado:', { _id: formatted._id, name: formatted.name, classCount: formatted.classCount });
      return formatted;
    });

    console.log('📤 Retornando:', formattedTimetables.length, 'horários agrupados');
    if (formattedTimetables.length > 0) {
      console.log('   Exemplo:', {
        _id: formattedTimetables[0]._id,
        name: formattedTimetables[0].name,
        createdAt: formattedTimetables[0].createdAt,
        classCount: formattedTimetables[0].classCount
      });
      console.log('   JSON stringified:', JSON.stringify(formattedTimetables[0]).substring(0, 300));
    }

    res.json({ 
      success: true, 
      data: formattedTimetables
    });
  } catch (error: any) {
    console.error('Erro ao buscar todos os horários:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar horários',
      error: error.message 
    });
  }
});

// Buscar horários por classId (para uso no EmergencySchedule)
router.get('/by-class/:classId', auth, async (req: AuthRequest, res) => {
  try {
    // ✅ ISOLAMENTO DE DADOS POR ESCOLA
    const schoolId = req.user?.schoolId || req.user?.id;
    const { classId } = req.params;
    
    console.log('🔍 Buscando horários para classId:', classId, 'escola:', schoolId);

    // Buscar apenas horários da escola do usuário
    const timetables = await GeneratedTimetable.find({ classId, school: schoolId })
      .sort({ createdAt: -1 })
      .limit(10); // Limitar aos 10 mais recentes

    console.log(`📚 Encontrados ${timetables.length} horários para a turma`);

    // Formatar para o frontend - incluir o objeto timetable como está
    const formattedTimetables = timetables.map((tt: any) => ({
      _id: tt._id.toString(),
      classId: tt.classId,
      name: tt.title || `Horário de ${new Date(tt.createdAt).toLocaleDateString()}`,
      createdAt: tt.createdAt,
      timetable: { [tt.classId]: tt.slots } // Estrutura compatível com TimetableGenerator
    }));

    console.log('📤 Retornando:', formattedTimetables.length, 'horários');
    if (formattedTimetables.length > 0) {
      const firstTimetable = formattedTimetables[0];
      const firstClassId = firstTimetable.classId;
      console.log('   Exemplo:', {
        _id: firstTimetable._id,
        name: firstTimetable.name,
        classId: firstClassId,
        slotsCount: firstTimetable.timetable[firstClassId]?.length || 0
      });
    }

    res.json({ 
      success: true, 
      data: formattedTimetables
    });
  } catch (error: any) {
    console.error('Erro ao buscar horários por turma:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar horários',
      error: error.message 
    });
  }
});

// ⚠️ ROTAS ESPECÍFICAS DEVEM VIR ANTES DE ROTAS COM PARÂMETROS ⚠️

// Rota otimizada: buscar apenas metadados dos horários (sem popular slots)
router.get('/metadata', auth, async (req: AuthRequest, res) => {
  console.log('🎯 ROTA /metadata CHAMADA!');
  try {
    // ✅ ISOLAMENTO DE DADOS POR ESCOLA
    const schoolId = req.user?.schoolId || req.user?.id;
    console.log('📋 Buscando metadados dos horários da escola:', schoolId);

    // Buscar apenas campos necessários, sem os slots completos, da escola do usuário
    const timetables = await GeneratedTimetable.find({ school: schoolId })
      .select('_id title scheduleId classId createdAt')
      .sort({ createdAt: -1 })
      .lean(); // lean() para documentos mais leves

    console.log(`📚 Encontrados ${timetables.length} registros`);

    // Agrupar por título
    const groupedByTitle: any = {};
    
    for (const tt of timetables) {
      const title = tt.title || 'Sem título';
      console.log(`📦 Processando: title="${title}", _id=${tt._id}`);
      if (!groupedByTitle[title]) {
        groupedByTitle[title] = {
          _id: tt._id.toString(),
          title: title,
          scheduleId: tt.scheduleId,
          createdAt: tt.createdAt,
          classIds: [tt.classId]
        };
      } else {
        groupedByTitle[title].classIds.push(tt.classId);
      }
    }

    console.log('📦 groupedByTitle keys:', Object.keys(groupedByTitle));
    console.log('📦 groupedByTitle values count:', Object.values(groupedByTitle).length);
    if (Object.values(groupedByTitle).length > 0) {
      console.log('📦 Primeiro grupo:', Object.values(groupedByTitle)[0]);
    }

    // Converter para array e formatar para compatibilidade com frontend
    const formattedTimetables = Object.values(groupedByTitle).map((group: any) => {
      const formatted = {
        _id: String(group._id),
        id: String(group._id), // Para compatibilidade
        name: String(group.title),
        title: String(group.title), // Para compatibilidade
        scheduleId: group.scheduleId,
        createdAt: group.createdAt ? new Date(group.createdAt).toISOString() : new Date().toISOString(),
        classCount: group.classIds.length,
        // Criar estrutura vazia de timetable para compatibilidade com código existente
        timetable: group.classIds.reduce((acc: any, classId: string) => {
          acc[classId] = [];
          return acc;
        }, {})
      };
      console.log('🔍 Formatted timetable:', {
        _id: formatted._id,
        id: formatted.id,
        name: formatted.name,
        title: formatted.title,
        classCount: formatted.classCount
      });
      return formatted;
    });

    console.log(`📤 Retornando ${formattedTimetables.length} horários (metadados apenas)`);
    if (formattedTimetables.length > 0) {
      console.log('📤 Primeiro horário sendo retornado:', {
        _id: formattedTimetables[0]._id,
        id: formattedTimetables[0].id,
        name: formattedTimetables[0].name,
        title: formattedTimetables[0].title
      });
    }

    res.json({ 
      success: true, 
      data: formattedTimetables 
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar metadados:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar metadados',
      error: error.message 
    });
  }
});

// Buscar horário completo por ID (com todos os dados populados)
router.get('/full/:id', auth, async (req: AuthRequest, res) => {
  try {
    // ✅ ISOLAMENTO DE DADOS POR ESCOLA
    const schoolId = req.user?.schoolId || req.user?.id;
    const { id } = req.params;
    console.log('🔍 Buscando horário completo para ID:', id, 'escola:', schoolId);

    // Buscar primeiro registro para pegar o título e validar propriedade
    const firstTimetable = await GeneratedTimetable.findOne({ _id: id, school: schoolId });
    
    if (!firstTimetable) {
      return res.status(404).json({ 
        success: false, 
        message: 'Horário não encontrado' 
      });
    }

    const title = firstTimetable.title;
    console.log(`📖 Título encontrado: "${title}"`);

    // Buscar TODOS os horários com mesmo título da mesma escola (todas as turmas)
    const timetables = await GeneratedTimetable.find({ title, school: schoolId });
    console.log(`📚 Encontrados ${timetables.length} horários com título "${title}"`);

    // Importar models necessários
    const Subject = require('../models/Subject').default;
    const Teacher = require('../models/Teacher').default;
    const Class = require('../models/Class').default;
    const Grade = require('../models/Grade').default;

    // Montar estrutura completa com dados populados
    const fullTimetable: any = {
      _id: firstTimetable._id.toString(),
      title: title,
      scheduleId: firstTimetable.scheduleId,
      createdAt: firstTimetable.createdAt,
      timetable: {}
    };

    // Popular cada turma
    for (const tt of timetables) {
      const populatedSlots = [];
      
      for (const slot of tt.slots) {
        try {
          const [subject, teacher, classDoc] = await Promise.all([
            Subject.findById(slot.subjectId),
            Teacher.findById(slot.teacherId),
            Class.findById(slot.classId)
          ]);

          let gradeName = '';
          if (classDoc && classDoc.gradeId) {
            const grade = await Grade.findById(classDoc.gradeId);
            gradeName = grade ? grade.name : '';
          }

          populatedSlots.push({
            ...((slot as any).toObject ? (slot as any).toObject() : slot),
            subject: subject ? {
              _id: subject._id,
              name: subject.name,
              color: subject.color
            } : null,
            teacher: teacher ? {
              _id: teacher._id,
              name: teacher.name
            } : null,
            class: classDoc ? {
              _id: classDoc._id,
              name: classDoc.name,
              gradeName: gradeName
            } : null
          });
        } catch (slotError) {
          console.error('Erro ao popular slot:', slotError);
          populatedSlots.push((slot as any).toObject ? (slot as any).toObject() : slot);
        }
      }

      fullTimetable.timetable[tt.classId] = populatedSlots;
    }

    console.log(`✅ Horário completo montado com ${Object.keys(fullTimetable.timetable).length} turmas`);

    res.json({ 
      success: true, 
      data: fullTimetable 
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar horário completo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar horário completo',
      error: error.message 
    });
  }
});

// Buscar horários por scheduleId
router.get('/:scheduleId', auth, async (req: AuthRequest, res) => {
  try {
    // ✅ ISOLAMENTO DE DADOS POR ESCOLA
    const schoolId = req.user?.schoolId || req.user?.id;
    const { scheduleId } = req.params;
    
    console.log('🔍 Buscando horários para scheduleId:', scheduleId, 'escola:', schoolId);

    const timetables = await GeneratedTimetable.find({ scheduleId, school: schoolId });
    
    console.log(`📚 Encontrados ${timetables.length} timetables`);

    // Importar models necessários
    const Subject = require('../models/Subject').default;
    const Teacher = require('../models/Teacher').default;
    const Class = require('../models/Class').default;
    const Grade = require('../models/Grade').default;

    // Converter para formato usado no frontend com populate
    const formattedTimetables: any = {};
    
    for (const timetable of timetables) {
      const populatedSlots = [];
      
      for (const slot of timetable.slots) {
        try {
          const [subject, teacher, classDoc] = await Promise.all([
            Subject.findById(slot.subjectId),
            Teacher.findById(slot.teacherId),
            Class.findById(slot.classId)
          ]);
          
          let grade = null;
          if (classDoc && classDoc.gradeId) {
            grade = await Grade.findById(classDoc.gradeId);
          }
          
          populatedSlots.push({
            ...((slot as any).toObject ? (slot as any).toObject() : slot),
            subjectName: subject?.name || 'Disciplina',
            teacherName: teacher?.name || 'Professor',
            className: classDoc?.name || 'Turma',
            gradeName: grade?.name || '',
            subjectColor: subject?.color || '#3B82F6'
          });
        } catch (err) {
          console.error('Erro ao popular slot:', err);
          populatedSlots.push({
            ...slot,
            subjectName: 'Erro',
            teacherName: 'Erro',
            className: 'Erro',
            gradeName: '',
            subjectColor: '#EF4444'
          });
        }
      }
      
      formattedTimetables[timetable.classId] = populatedSlots;
    }
    
    console.log('✅ Horários formatados e populados');

    res.json({ 
      success: true, 
      data: formattedTimetables 
    });
  } catch (error: any) {
    console.error('Erro ao buscar horários:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar horários',
      error: error.message 
    });
  }
});

// Atualizar um slot específico
router.put('/:scheduleId/:classId', auth, async (req: AuthRequest, res) => {
  try {
    // ✅ ISOLAMENTO DE DADOS POR ESCOLA
    const schoolId = req.user?.schoolId || req.user?.id;
    const { scheduleId, classId } = req.params;
    const { day, period, subjectId, teacherId } = req.body;

    const timetable = await GeneratedTimetable.findOne({ scheduleId, classId, school: schoolId });

    if (!timetable) {
      return res.status(404).json({ 
        success: false, 
        message: 'Horário não encontrado' 
      });
    }

    // Encontrar e atualizar o slot
    const slotIndex = timetable.slots.findIndex(
      slot => slot.day === day && slot.period === period
    );

    if (slotIndex !== -1) {
      timetable.slots[slotIndex].subjectId = subjectId;
      timetable.slots[slotIndex].teacherId = teacherId;
    } else {
      // Se não existe, adicionar novo slot
      timetable.slots.push({ day, period, subjectId, teacherId, classId });
    }

    await timetable.save();

    res.json({ 
      success: true, 
      data: timetable,
      message: 'Horário atualizado com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao atualizar horário:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao atualizar horário',
      error: error.message 
    });
  }
});

// Deletar horários de um schedule
router.delete('/:scheduleId', auth, async (req: AuthRequest, res) => {
  try {
    // ✅ ISOLAMENTO DE DADOS POR ESCOLA
    const schoolId = req.user?.schoolId || req.user?.id;
    const { scheduleId } = req.params;

    await GeneratedTimetable.deleteMany({ scheduleId, school: schoolId });

    res.json({ 
      success: true, 
      message: 'Horários deletados com sucesso' 
    });
  } catch (error: any) {
    console.error('Erro ao deletar horários:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao deletar horários',
      error: error.message 
    });
  }
});

// Deletar conjunto de horários por título
// Deletar por título (sem precisar de scheduleId)
router.delete('/by-title/:title', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId || req.user?.id;
    const { title } = req.params;
    console.log('🗑️ Excluindo horários:', { title, schoolId, userId: req.user!.id });

    // Deletar apenas horários da escola autenticada
    const result = await GeneratedTimetable.deleteMany({ 
      title,
      school: schoolId
    });

    console.log('✅ Deletados:', result.deletedCount);

    res.json({ 
      success: true, 
      message: 'Conjunto de horários deletado com sucesso',
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    console.error('Erro ao deletar horários:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao deletar horários',
      error: error.message 
    });
  }
});

router.delete('/:scheduleId/by-title/:title', auth, async (req: AuthRequest, res) => {
  try {
    // ✅ ISOLAMENTO DE DADOS POR ESCOLA
    const schoolId = req.user?.schoolId || req.user?.id;
    const { scheduleId, title } = req.params;

    await GeneratedTimetable.deleteMany({ scheduleId, title, school: schoolId });

    res.json({ 
      success: true, 
      message: 'Conjunto de horários deletado com sucesso' 
    });
  } catch (error: any) {
    console.error('Erro ao deletar horários:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao deletar horários',
      error: error.message 
    });
  }
});

// Carregar horários por título
router.get('/:scheduleId/by-title/:title', auth, async (req: AuthRequest, res) => {
  try {
    // ✅ ISOLAMENTO DE DADOS POR ESCOLA
    const schoolId = req.user?.schoolId || req.user?.id;
    const { scheduleId, title } = req.params;

    console.log('📖 Carregando horários:', { scheduleId, title, schoolId });

    const timetables = await GeneratedTimetable.find({ scheduleId, title, school: schoolId });

    console.log(`📦 Encontrados ${timetables.length} registros`);

    // Converter para formato usado no frontend
    const formattedTimetables: any = {};
    timetables.forEach((timetable: any) => {
      console.log(`  ➜ Turma ${timetable.classId}: ${timetable.slots.length} slots`);
      formattedTimetables[timetable.classId] = timetable.slots;
    });

    console.log('✅ Retornando:', Object.keys(formattedTimetables).length, 'turmas');

    res.json({ 
      success: true, 
      data: formattedTimetables 
    });
  } catch (error: any) {
    console.error('Erro ao buscar horários:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar horários',
      error: error.message 
    });
  }
});

export default router;
