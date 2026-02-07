import { Router } from 'express';
import EmergencySchedule from '../models/EmergencySchedule';
import TeacherDebtRecord from '../models/TeacherDebtRecord';
import { auth } from '../middleware/auth';

const router = Router();

// GET /api/emergency-schedules - Buscar todos os horários emergenciais
router.get('/', auth, async (req, res) => {
  try {
    // Extrair schoolId do usuário autenticado
    const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
    console.log('🔍 GET emergency-schedules - schoolId:', schoolId);
    
    const schedules = await EmergencySchedule.find({ school: schoolId }).sort({ date: -1 });
    console.log('📋 Encontrados', schedules.length, 'horários emergenciais');
    
    res.json({
      success: true,
      data: schedules
    });
  } catch (error: any) {
    console.error('Erro ao buscar horários emergenciais:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar horários emergenciais',
      error: error.message
    });
  }
});

// Gerar horário emergencial
router.post('/', auth, async (req, res) => {
  try {
    // Extrair schoolId do usuário autenticado
    const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
    console.log('🏫 schoolId do usuário:', schoolId);
    console.log('👤 Usuário completo:', (req as any).user);
    
    if (!schoolId) {
      console.error('❌ schoolId não encontrado no token');
      return res.status(400).json({
        success: false,
        error: 'schoolId não encontrado. Faça login novamente.'
      });
    }
    
    console.log('📥 Requisição recebida - Body:', JSON.stringify(req.body, null, 2).substring(0, 500));
    
    const { 
      name, // Nome do horário emergencial
      date, 
      dayOfWeek, 
      searchStartDate, // Data inicial da busca de professores faltosos (opcional)
      searchEndDate, // Data final da busca de professores faltosos (opcional)
      classId, 
      baseScheduleId, 
      absentTeacherIds,
      absentTeacherId, // Manter compatibilidade com código antigo
      absentTeachersNames, // Nomes dos professores ausentes (do frontend)
      reason,
      originalSlots,
      emergencySlots,
      affectedSlotsCount,
      makeupClasses // Campo para aulas de reposição no sábado
    } = req.body;

    console.log('📥 Campos extraídos:', {
      name,
      date,
      dayOfWeek,
      classId,
      baseScheduleId,
      absentTeacherIds,
      absentTeachersNames: typeof absentTeachersNames,
      reason,
      originalSlotsLength: originalSlots?.length,
      emergencySlotsLength: emergencySlots?.length,
      makeupClassesLength: makeupClasses?.length
    });

    // Validar e limpar slots antes de processar
    if (!originalSlots || !Array.isArray(originalSlots)) {
      throw new Error('originalSlots deve ser um array');
    }
    
    if (!emergencySlots || !Array.isArray(emergencySlots)) {
      throw new Error('emergencySlots deve ser um array');
    }

    // Limpar valores undefined dos slots
    const cleanedOriginalSlots = originalSlots.map((slot: any) => {
      const cleaned: any = {};
      Object.keys(slot).forEach(key => {
        if (slot[key] !== undefined && slot[key] !== null) {
          cleaned[key] = slot[key];
        }
      });
      // Garantir valores padrão para campos booleanos
      cleaned.isModified = cleaned.isModified || false;
      cleaned.isAffected = cleaned.isAffected || false;
      cleaned.isVacant = cleaned.isVacant || false;
      return cleaned;
    });

    const cleanedEmergencySlots = emergencySlots.map((slot: any) => {
      const cleaned: any = {};
      Object.keys(slot).forEach(key => {
        if (slot[key] !== undefined && slot[key] !== null) {
          cleaned[key] = slot[key];
        }
      });
      // Garantir valores padrão para campos booleanos
      cleaned.isModified = cleaned.isModified || false;
      cleaned.isAffected = cleaned.isAffected || false;
      cleaned.isVacant = cleaned.isVacant || false;
      return cleaned;
    });

    console.log('🧹 Slots limpos - originalSlots:', cleanedOriginalSlots.length, 'emergencySlots:', cleanedEmergencySlots.length);

    // Suportar tanto array quanto string única
    const teacherIds = absentTeacherIds || (absentTeacherId ? [absentTeacherId] : []);

    // Normalizar data para formato YYYY-MM-DD
    let normalizedDate: string;
    if (typeof date === 'string') {
      // Se vier como "2026-01-02", manter
      // Se vier como "Fri Jan 02 2026...", converter
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        normalizedDate = date;
      } else {
        normalizedDate = new Date(date).toISOString().split('T')[0];
      }
    } else {
      normalizedDate = new Date(date).toISOString().split('T')[0];
    }

    console.log('📥 Criando horário emergencial:', {
      dateOriginal: date,
      dateNormalized: normalizedDate,
      classId,
      absentTeacherIds: teacherIds,
      affectedSlotsCount,
      makeupClasses: makeupClasses?.length || 0
    });

    // Criar débitos para cada professor ausente
    const teacherDebts = [];
    const affectedSlots = cleanedOriginalSlots.filter((slot: any) => slot.isAffected);

    for (const teacherId of teacherIds) {
      for (const slot of affectedSlots) {
        // Apenas criar débito se o slot for deste professor
        if (slot.teacherId === teacherId) {
          teacherDebts.push({
            teacherId,
            classId: slot.classId || classId,
            subjectId: slot.subjectId,
            hoursOwed: 1, // 1 aula
            absenceDate: new Date(date),
            reason
          });
        }
      }
    }

    // Extrair nomes das turmas afetadas
    const classNames = [...new Set(cleanedOriginalSlots.map((s: any) => s.className).filter(Boolean))];
    
    // Usar nomes dos professores ausentes do frontend, ou extrair dos slots como fallback
    let absentTeacherNames = absentTeachersNames;
    
    if (!absentTeacherNames || (Array.isArray(absentTeacherNames) && absentTeacherNames.length === 0)) {
      // Fallback: extrair dos slots
      absentTeacherNames = [...new Set(
        affectedSlots
          .filter((s: any) => teacherIds.includes(s.teacherId))
          .map((s: any) => s.teacherName)
          .filter(Boolean)
      )];
    }
    
    // Converter array para string se necessário
    const absentTeacherNamesStr = Array.isArray(absentTeacherNames) 
      ? absentTeacherNames.join(', ')
      : absentTeacherNames || '';

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('👥 PROFESSORES AUSENTES - VERIFICAÇÃO DETALHADA');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📥 IDs recebidos do frontend:', teacherIds);
    console.log('📝 Nomes recebidos do frontend:', absentTeachersNames);
    console.log('🔍 Nomes extraídos como fallback:', 
      Array.isArray(absentTeacherNames) ? absentTeacherNames : [absentTeacherNames]);
    console.log('💾 Nomes finais para salvar (string):', absentTeacherNamesStr);
    console.log('🎯 Total de professores ausentes:', teacherIds.length);
    console.log('');
    
    // Verificar se todos os professores estão representados nos slots emergenciais
    const emergencyTeacherIds = new Set(cleanedEmergencySlots.map((s: any) => s.absentTeacherId).filter(Boolean));
    const missingTeachers = teacherIds.filter((id: string) => !emergencyTeacherIds.has(id));
    
    if (missingTeachers.length > 0) {
      console.warn('⚠️ ATENÇÃO: Professores ausentes NÃO encontrados nos slots emergenciais:');
      missingTeachers.forEach((id: string) => {
        const teacherName = absentTeacherNames && Array.isArray(absentTeacherNames) 
          ? absentTeacherNames.find((name: string) => affectedSlots.some((s: any) => s.teacherId === id && s.teacherName === name))
          : 'Nome não encontrado';
        console.warn(`   → ID: ${id}, Nome: ${teacherName || 'Desconhecido'}`);
      });
      console.warn('   Isso pode indicar que esses professores não tinham aulas no dia.');
    } else {
      console.log('✅ Todos os professores ausentes estão representados nos slots emergenciais.');
    }
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    console.log('📝 Preparando dados para salvar:', {
      name,
      date: normalizedDate,
      dayOfWeek,
      classId,
      baseScheduleId,
      teacherIdsLength: teacherIds.length,
      classNamesLength: classNames.length,
      originalSlotsLength: originalSlots?.length || 0,
      emergencySlotsLength: emergencySlots?.length || 0,
      teacherDebtsLength: teacherDebts.length,
      makeupClassesLength: makeupClasses?.length || 0
    });

    // Salvar horário emergencial
    // Usar data normalizada no formato YYYY-MM-DD
    const emergencySchedule = new EmergencySchedule({
      school: schoolId, // Adicionar escola do usuário
      name, // Nome do horário emergencial
      date: normalizedDate, // String no formato YYYY-MM-DD - dia do horário emergencial
      dayOfWeek,
      searchStartDate: searchStartDate || null, // Data inicial da busca (opcional)
      searchEndDate: searchEndDate || null, // Data final da busca (opcional)
      classId,
      baseScheduleId,
      absentTeacherIds: teacherIds,
      absentTeachersNames: absentTeachersNames || absentTeacherNamesStr, // Aceitar string ou array
      classNames,
      reason,
      originalSlots: cleanedOriginalSlots, // Usar slots limpos
      emergencySlots: cleanedEmergencySlots, // Usar slots limpos
      affectedSlotsCount,
      teacherDebts,
      makeupClasses: makeupClasses || [] // Adicionar aulas de reposição
    });

    console.log('💾 Tentando salvar no banco...');
    console.log('🔍 Validando dados antes de salvar...');
    
    // Log detalhado dos campos
    console.log('📋 Dados a serem salvos:', {
      school: schoolId,
      name: name || 'N/A',
      date: normalizedDate,
      dayOfWeek,
      classId,
      baseScheduleId,
      absentTeacherIdsCount: teacherIds.length,
      originalSlotsCount: cleanedOriginalSlots.length,
      emergencySlotsCount: cleanedEmergencySlots.length,
      affectedSlotsCount,
      teacherDebtsCount: teacherDebts.length,
      makeupClassesCount: makeupClasses?.length || 0
    });
    
    try {
      // Validar antes de salvar
      const validationError = emergencySchedule.validateSync();
      if (validationError) {
        console.error('❌ Erro de validação:', validationError);
        throw validationError;
      }
      
      await emergencySchedule.save();
      console.log('✅ Salvo no banco com sucesso! ID:', emergencySchedule._id);
    } catch (saveError: any) {
      console.error('❌ Erro ao salvar no MongoDB:', saveError);
      console.error('❌ Nome do erro:', saveError.name);
      console.error('❌ Mensagem:', saveError.message);
      console.error('❌ Código:', saveError.code);
      if (saveError.errors) {
        console.error('❌ Erros de validação específicos:');
        Object.keys(saveError.errors).forEach(key => {
          console.error(`   - ${key}: ${saveError.errors[key].message}`);
        });
      }
      throw saveError;
    }

    console.log('✅ Horário emergencial criado:', {
      debts: teacherDebts.length,
      makeupClasses: makeupClasses?.length || 0
    });

    // Criar registros de débito
    for (const debt of teacherDebts) {
      const debtRecord = new TeacherDebtRecord({
        ...debt,
        emergencyScheduleId: emergencySchedule._id.toString()
      });
      await debtRecord.save();
    }

    console.log('✅ Horário emergencial criado com', teacherDebts.length, 'débitos e', makeupClasses?.length || 0, 'aulas de reposição');

    res.json({
      success: true,
      data: emergencySchedule,
      message: `Horário emergencial criado. ${teacherDebts.length} aula(s) a repor.`
    });
  } catch (error: any) {
    console.error('❌ Erro ao criar horário emergencial:', error);
    console.error('❌ Stack:', error.stack);
    console.error('❌ Nome do erro:', error.name);
    console.error('❌ Mensagem:', error.message);
    
    // Escrever log detalhado em arquivo  
    try {
      const fs = require('fs');
      const logPath = './emergency-save-error.log';
      const errorLog = `
========================================
Data: ${new Date().toISOString()}
Erro: ${error.message}
Stack: ${error.stack || 'N/A'}
Nome: ${error.name || 'N/A'}
Código: ${error.code || 'N/A'}
Errors: ${error.errors ? JSON.stringify(error.errors, null, 2) : 'N/A'}
========================================
`;
      fs.appendFileSync(logPath, errorLog);
      console.error('📝 Log salvo em:', logPath);
    } catch (logError) {
      console.error('⚠️ Não foi possível salvar log:', logError);
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro ao criar horário emergencial',
      error: error.message,
      details: error.stack
    });
  }
});

// Buscar horários emergenciais por data e turma
router.get('/by-date', auth, async (req, res) => {
  try {
    // ✅ ISOLAMENTO DE DADOS POR ESCOLA
    const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
    const { date, classId } = req.query;

    const query: any = { school: schoolId }; // ✅ Filtrar por escola
    if (date) query.date = new Date(date as string);
    if (classId) query.classId = classId;

    const schedules = await EmergencySchedule.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: schedules
    });
  } catch (error: any) {
    console.error('Erro ao buscar horários emergenciais:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar horários emergenciais',
      error: error.message
    });
  }
});

// Buscar débitos de um professor
router.get('/debts/:teacherId', auth, async (req, res) => {
  try {
    // ✅ ISOLAMENTO DE DADOS POR ESCOLA
    const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
    const { teacherId } = req.params;
    const { isPaid } = req.query;

    // ✅ Verificar se o professor pertence à mesma escola
    const Teacher = require('../models/Teacher').default;
    const teacher = await Teacher.findOne({ _id: teacherId, school: schoolId });
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Professor não encontrado ou não pertence a esta escola'
      });
    }

    const query: any = { teacherId };
    if (isPaid !== undefined) {
      query.isPaid = isPaid === 'true';
    }

    const debts = await TeacherDebtRecord.find(query).sort({ absenceDate: 1 });

    const totalOwed = debts.reduce((sum, d) => sum + (d.hoursOwed - d.hoursPaid), 0);

    res.json({
      success: true,
      data: {
        debts,
        totalOwed,
        totalDebts: debts.length
      }
    });
  } catch (error: any) {
    console.error('Erro ao buscar débitos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar débitos',
      error: error.message
    });
  }
});

// Marcar horas como pagas
router.patch('/debts/:debtId/pay', auth, async (req, res) => {
  try {
    // ✅ ISOLAMENTO DE DADOS POR ESCOLA
    const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
    const { debtId } = req.params;
    const { hoursPaid } = req.body;

    const debt = await TeacherDebtRecord.findById(debtId);
    if (!debt) {
      return res.status(404).json({
        success: false,
        message: 'Débito não encontrado'
      });
    }

    // ✅ Verificar se o professor do débito pertence à mesma escola
    const Teacher = require('../models/Teacher').default;
    const teacher = await Teacher.findOne({ _id: debt.teacherId, school: schoolId });
    
    if (!teacher) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado: professor não pertence a esta escola'
      });
    }

    debt.hoursPaid += hoursPaid;
    debt.paidDates.push(new Date());

    if (debt.hoursPaid >= debt.hoursOwed) {
      debt.isPaid = true;
    }

    await debt.save();

    res.json({
      success: true,
      data: debt,
      message: 'Débito atualizado'
    });
  } catch (error: any) {
    console.error('Erro ao atualizar débito:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar débito',
      error: error.message
    });
  }
});

// Excluir horário emergencial
router.delete('/:id', auth, async (req, res) => {
  try {
    // ✅ ISOLAMENTO DE DADOS POR ESCOLA
    const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
    const { id } = req.params;
    console.log('🗑️ Tentando excluir horário emergencial:', id);

    // ✅ Buscar e verificar propriedade antes de deletar
    const schedule = await EmergencySchedule.findOne({ _id: id, school: schoolId });
    
    if (!schedule) {
      console.log('❌ Horário não encontrado ou não pertence a esta escola:', id);
      return res.status(404).json({
        success: false,
        message: 'Horário emergencial não encontrado ou acesso negado'
      });
    }

    await EmergencySchedule.findByIdAndDelete(id);

    console.log('✅ Horário excluído com sucesso:', id);
    res.json({
      success: true,
      message: 'Horário emergencial excluído com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Erro ao excluir horário emergencial:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir horário emergencial',
      error: error.message
    });
  }
});

// POST /api/emergency-schedules/teacher-debts/:teacherId/pay - Dar baixa em débitos (reposição realizada)
router.post('/teacher-debts/:teacherId/pay', auth, async (req, res) => {
  try {
    // ✅ ISOLAMENTO DE DADOS POR ESCOLA
    const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
    const { teacherId } = req.params;
    const { date, hoursRepaid, details } = req.body;

    console.log(`💰 Dando baixa em débitos do professor ${teacherId}:`, {
      date,
      hoursRepaid,
      details
    });

    // ✅ Verificar se o professor pertence à mesma escola
    const Teacher = require('../models/Teacher').default;
    const teacher = await Teacher.findOne({ _id: teacherId, school: schoolId });
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Professor não encontrado ou não pertence a esta escola'
      });
    }

    // Buscar débitos pendentes do professor
    const debts = await TeacherDebtRecord.find({
      teacherId,
      isPaid: false
    }).sort({ absenceDate: 1 });

    let hoursToRepay = hoursRepaid;
    const updatedDebts = [];

    // Dar baixa nos débitos mais antigos primeiro
    for (const debt of debts) {
      if (hoursToRepay <= 0) break;

      const hoursOwed = debt.hoursOwed - debt.hoursPaid;
      const hoursToPayNow = Math.min(hoursOwed, hoursToRepay);

      debt.hoursPaid += hoursToPayNow;
      debt.paidDates.push(new Date(date));

      if (debt.hoursPaid >= debt.hoursOwed) {
        debt.isPaid = true;
      }

      await debt.save();
      updatedDebts.push(debt);
      hoursToRepay -= hoursToPayNow;

      console.log(`  ✅ ${hoursToPayNow}h pagas em débito de ${new Date(debt.absenceDate).toLocaleDateString()}`);
    }

    res.json({
      success: true,
      message: `${hoursRepaid} hora(s) de reposição registradas`,
      data: {
        debtsUpdated: updatedDebts.length,
        debtsPaidInFull: updatedDebts.filter(d => d.isPaid).length,
        remainingHours: hoursToRepay
      }
    });
  } catch (error: any) {
    console.error('Erro ao dar baixa em débitos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao dar baixa em débitos',
      error: error.message
    });
  }
});

export default router;
