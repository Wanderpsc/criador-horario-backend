/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * E-mail: wanderpsc@gmail.com
 * Todos os direitos reservados.
 */

import express, { Response } from 'express';
import { auth } from '../middleware/auth';
import User from '../models/User';

const router = express.Router();

/**
 * GET /api/schools ou /api/school
 * Retorna os dados da escola logada (atalho para /profile)
 */
router.get('/', auth, async (req: any, res: Response) => {
  try {
    console.log('\n🔍 GET /api/schools - Escola solicitando seus dados');
    console.log('   req.user:', req.user);
    
    if (!req.user || !req.user.id) {
      console.log('❌ User não autenticado ou sem userId');
      return res.status(401).json({
        success: false,
        message: 'Não autenticado'
      });
    }
    
    const school = await User.findById(req.user.id).select('-password');
    console.log('   Escola encontrada:', school ? `✅ ${school.schoolName || school.email}` : '❌ NÃO ENCONTRADA');
    
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    // Retornar dados da escola
    const schoolData = school.toObject();
    return res.json({
      ...schoolData,
      name: schoolData.schoolName || schoolData.email || '',
      email: schoolData.email || ''
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar dados da escola:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados da escola',
      error: error.message
    });
  }
});

/**
 * GET /api/schools/profile
 * Retorna os dados da escola logada
 */
router.get('/profile', auth, async (req: any, res: Response) => {
  try {
    console.log('\n🔍🔍🔍 GET /api/schools/profile - Escola solicitando seus dados');
    console.log('   req.user:', req.user);
    console.log('   User ID:', req.user?.id);
    console.log('   User ID Type:', typeof req.user?.id);
    
    if (!req.user || !req.user.id) {
      console.log('❌ User não autenticado ou sem userId');
      return res.status(401).json({
        success: false,
        message: 'Não autenticado'
      });
    }
    
    const school = await User.findById(req.user.id).select('-password');
    console.log('   Escola encontrada:', school ? `✅ ${school.schoolName || school.email}` : '❌ NÃO ENCONTRADA');
    
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    return res.json({
      success: true,
      data: school
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar dados da escola:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados da escola',
      error: error.message
    });
  }
});

/**
 * PUT /api/schools/profile
 * Atualiza os dados da escola (nome, dias de aula, ano letivo)
 */
router.put('/profile', auth, async (req: any, res: Response) => {
  try {
    console.log('\n💾💾💾 PUT /api/schools/profile - Atualizando dados da escola');
    console.log('   req.user:', req.user);
    console.log('   User ID:', req.user?.id);
    console.log('   Dados recebidos:', req.body);

    if (!req.user || !req.user.id) {
      console.log('❌ User não autenticado ou sem userId');
      return res.status(401).json({
        success: false,
        message: 'Não autenticado'
      });
    }

    const { schoolName, workingDays, academicYear } = req.body;

    // Validações
    if (!schoolName) {
      console.log('❌ Nome da escola é obrigatório');
      return res.status(400).json({
        success: false,
        message: 'Nome da escola é obrigatório'
      });
    }

    console.log('   Atualizando escola ID:', req.user.id);
    const updateData: any = { schoolName };
    if (workingDays) updateData.workingDays = workingDays;
    if (academicYear) updateData.academicYear = academicYear;

    // Atualiza a escola
    const updatedSchool = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select('-password');

    if (!updatedSchool) {
      console.log('❌ Escola não encontrada');
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    console.log('✅ Dados da escola atualizados com sucesso!');
    console.log('   Nome:', updatedSchool.schoolName);
    console.log('   Dias de aula:', workingDays);
    console.log('   Ano letivo:', academicYear);

    return res.json({
      success: true,
      message: 'Dados da escola atualizados com sucesso',
      data: updatedSchool
    });
  } catch (error: any) {
    console.error('❌ Erro ao atualizar escola:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar dados da escola',
      error: error.message
    });
  }
});

/**
 * PUT /api/schools/responsible
 * Atualiza os dados do responsável pela escola
 */
router.put('/responsible', auth, async (req: any, res: Response) => {
  try {
    console.log('\n💾💾💾 PUT /api/schools/responsible - Atualizando dados do responsável');
    console.log('   req.user:', req.user);
    console.log('   User ID:', req.user?.id);
    console.log('   User ID Type:', typeof req.user?.id);
    console.log('   Dados recebidos:', req.body);

    if (!req.user || !req.user.id) {
      console.log('❌ User não autenticado ou sem userId');
      return res.status(401).json({
        success: false,
        message: 'Não autenticado'
      });
    }

    const { responsibleName, responsibleCPF, responsiblePhone, responsibleEmail } = req.body;

    // Validações
    if (!responsibleName || !responsibleCPF || !responsiblePhone || !responsibleEmail) {
      console.log('❌ Campos obrigatórios faltando');
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios'
      });
    }

    console.log('   Buscando escola com ID:', req.user.id);
    const schoolBefore = await User.findById(req.user.id);
    console.log('   Escola antes da atualização:', schoolBefore ? `✅ ${schoolBefore.schoolName || schoolBefore.email}` : '❌ NÃO ENCONTRADA');

    // Atualiza a escola
    const updatedSchool = await User.findByIdAndUpdate(
      req.user.id,
      {
        responsibleName,
        responsibleCPF,
        responsiblePhone,
        responsibleEmail
      },
      { new: true }
    ).select('-password');

    if (!updatedSchool) {
      console.log('❌ Escola não encontrada após update');
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    console.log('✅ Dados do responsável atualizados com sucesso!');
    console.log('   Nome:', updatedSchool.responsibleName);
    console.log('   Email:', updatedSchool.responsibleEmail);

    return res.json({
      success: true,
      message: 'Dados do responsável atualizados com sucesso',
      data: updatedSchool
    });
  } catch (error: any) {
    console.error('❌ Erro ao atualizar responsável:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar dados do responsável',
      error: error.message
    });
  }
});

/**
 * GET /api/schools/print-header
 * Retorna o cabeçalho de impressão da escola
 */
router.get('/print-header', auth, async (req: any, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Não autenticado' });
    }

    const school = await User.findById(req.user.schoolId || req.user.id).select('printHeader schoolName');
    if (!school) {
      return res.status(404).json({ success: false, message: 'Escola não encontrada' });
    }

    return res.json({
      success: true,
      data: {
        printHeader: school.printHeader || {},
        schoolName: school.schoolName || ''
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar cabeçalho:', error);
    return res.status(500).json({ success: false, message: 'Erro ao buscar cabeçalho', error: error.message });
  }
});

/**
 * PUT /api/schools/print-header
 * Atualiza o cabeçalho de impressão da escola
 */
router.put('/print-header', auth, async (req: any, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Não autenticado' });
    }

    const { emblemBase64, line1, line2, line3 } = req.body;

    // Validar tamanho do base64 (max ~2MB)
    if (emblemBase64 && emblemBase64.length > 2 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Imagem muito grande (máximo 2MB)' });
    }

    const updatedSchool = await User.findByIdAndUpdate(
      req.user.id,
      { printHeader: { emblemBase64, line1, line2, line3 } },
      { new: true }
    ).select('printHeader');

    if (!updatedSchool) {
      return res.status(404).json({ success: false, message: 'Escola não encontrada' });
    }

    return res.json({
      success: true,
      message: 'Cabeçalho de impressão atualizado com sucesso',
      data: updatedSchool.printHeader
    });
  } catch (error: any) {
    console.error('❌ Erro ao atualizar cabeçalho:', error);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar cabeçalho', error: error.message });
  }
});

export default router;
