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

export default router;
