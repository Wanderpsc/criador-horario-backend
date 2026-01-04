/**
 * Rotas de Admin - Sistema de Licenciamento Completo
 * © 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com
 */

import { Router, Response } from 'express';
import User from '../models/User';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/license';
import { sendPaymentConfirmationEmail } from '../services/email.service';

const router = Router();

/**
 * GET /api/admin/schools/public-test - Teste SEM autenticação
 */
router.get('/public-test', async (req: any, res: Response) => {
  try {
    console.log('\n🔥🔥🔥 [PUBLIC-TEST] ROTA PÚBLICA ACESSADA! 🔥🔥🔥\n');
    
    const schools = await User.find({
      $or: [
        { role: 'school' },
        { schoolName: { $exists: true, $ne: '' } }
      ]
    }).select('-password').limit(10);
    
    console.log(`[PUBLIC-TEST] Escolas encontradas: ${schools.length}`);
    schools.forEach(s => console.log(`  - ${s.schoolName} (${s.email})`));
    
    return res.json({
      success: true,
      count: schools.length,
      schools: schools
    });
  } catch (error: any) {
    console.error('[PUBLIC-TEST] Erro:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/schools/test - Teste super simples SEM FILTROS
 */
router.get('/test', async (req: any, res: Response) => {
  try {
    console.log('[TEST] Buscando TODOS os usuários sem filtro...');
    
    const all = await User.find({}).select('email schoolName role approvedByAdmin isActive').limit(20);
    
    console.log(`[TEST] Total retornado: ${all.length}`);
    
    return res.json({
      success: true,
      total: all.length,
      users: all
    });
  } catch (error: any) {
    console.error('[TEST] Erro:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/schools/debug - Debug e corrigir roles
 */
router.get('/debug', async (req: any, res: Response) => {
  try {
    // Buscar todas as escolas com schoolName
    const allWithSchoolName = await User.find({
      schoolName: { $exists: true, $ne: null }
    }).select('-password');

    const wrongRole = allWithSchoolName.filter(u => u.role !== 'school' && u.role !== 'admin');
    
    // Corrigir automaticamente
    for (const user of wrongRole) {
      user.role = 'school';
      await user.save();
    }

    const schools = await User.find({ role: 'school' }).select('-password');

    res.json({
      success: true,
      fixed: wrongRole.length,
      total: schools.length,
      schools: schools.map(s => ({
        id: s._id,
        email: s.email,
        schoolName: s.schoolName,
        role: s.role,
        approvedByAdmin: s.approvedByAdmin,
        isActive: s.isActive
      }))
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/schools - Listar todas as escolas
 */
router.get('/', async (req: any, res: Response) => {
  console.log('⚡⚡⚡ ENTRANDO NA ROTA / ⚡⚡⚡');
  try {
    console.log('⚡⚡⚡ DENTRO DO TRY ⚡⚡⚡');
    // 🔥 DESABILITAR CACHE COMPLETAMENTE
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    
    console.log('\n🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
    console.log('🔥  ROTA GET /api/admin/schools EXECUTANDO!!!  🔥');
    console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥\n');
    
    console.log('👤 Usuário da requisição:', JSON.stringify(req.user, null, 2));
    
    // Primeiro, vamos buscar TUDO sem filtro
    const allUsers = await User.find({}).select('email schoolName role').limit(10);
    console.log(`\n📊 Total de usuários no banco (primeiros 10): ${allUsers.length}`);
    allUsers.forEach(u => {
      console.log(`  • ${u.email} | Role: ${u.role} | School: ${u.schoolName || 'N/A'}`);
    });
    
    // Agora busca com o filtro
    const query = {
      $or: [
        { role: 'school' },
        { schoolName: { $exists: true, $ne: '' } }
      ]
    };
    
    console.log('\n🔍 Query sendo executada:', JSON.stringify(query, null, 2));
    
    const schools = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    console.log(`\n✅ ESCOLAS ENCONTRADAS COM FILTRO: ${schools.length}`);
    schools.forEach((s, index) => {
      console.log(`  ${index + 1}. ${s.schoolName || s.email} (Role: ${s.role})`);
    });

    const responseData = schools.map(school => ({
      _id: school._id,
      id: school._id,
      email: school.email,
      schoolName: school.schoolName || school.name,
      name: school.name,
      cnpj: school.cnpj,
      phone: school.phone,
      city: school.city,
      state: school.state,
      role: school.role,
      isActive: school.isActive !== undefined ? school.isActive : true,
      approvedByAdmin: school.approvedByAdmin || false,
      licenseExpiryDate: school.licenseExpiryDate,
      maxUsers: school.maxUsers || 50,
      paymentStatus: school.paymentStatus || 'pending',
      registrationStatus: school.registrationStatus || 'pending',
      createdAt: school.createdAt,
      schoolId: school.school,
      adminNotes: school.adminNotes,
      responsibleName: school.responsibleName,
      responsibleCPF: school.responsibleCPF,
      responsiblePhone: school.responsiblePhone,
      responsibleEmail: school.responsibleEmail,
      selectedPlan: school.selectedPlan,
      schoolType: school.schoolType,
      numberOfStudents: school.numberOfStudents,
      numberOfTeachers: school.numberOfTeachers
    }));

    console.log('[Admin-Schools] 📤 Enviando resposta com', responseData.length, 'escolas');
    console.log('============================================\n');

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('[Admin-Schools] ❌ ERRO:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar escolas'
    });
  }
});

/**
 * GET /api/admin/schools/stats - Estatísticas gerais
 */
router.get('/stats', async (req: any, res: Response) => {
  try {
    const totalSchools = await User.countDocuments({ 
      role: { $in: ['user', 'school'] },
      schoolName: { $exists: true }
    });
    
    const activeSchools = await User.countDocuments({ 
      role: { $in: ['user', 'school'] },
      schoolName: { $exists: true },
      isActive: true 
    });

    const pendingApproval = await User.countDocuments({
      role: { $in: ['user', 'school'] },
      schoolName: { $exists: true },
      approvedByAdmin: false
    });

    const expiredLicenses = await User.countDocuments({
      role: { $in: ['user', 'school'] },
      schoolName: { $exists: true },
      licenseExpiryDate: { $lt: new Date() }
    });

    res.json({
      success: true,
      data: {
        totalSchools,
        activeSchools,
        inactiveSchools: totalSchools - activeSchools,
        pendingApproval,
        expiredLicenses
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas'
    });
  }
});

/**
 * GET /api/admin/schools/:id - Obter detalhes de uma escola
 */
router.get('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const school = await User.findById(id).select('-password');

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        id: school._id,
        email: school.email,
        schoolName: school.schoolName,
        isActive: school.isActive || false,
        approvedByAdmin: school.approvedByAdmin || false,
        licenseExpiryDate: school.licenseExpiryDate,
        maxUsers: school.maxUsers || 0,
        paymentStatus: school.paymentStatus || 'pending',
        createdAt: school.createdAt,
        schoolId: school.school
      }
    });
  } catch (error) {
    console.error('Erro ao obter escola:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter dados da escola'
    });
  }
});

/**
 * PUT /api/admin/schools/:id/approve - Aprovar escola e configurar licença
 */
router.put('/:id/approve', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { licenseExpiryDate, maxUsers, adminNotes } = req.body;

    console.log('[Admin-Schools] Aprovando escola:', { id, licenseExpiryDate, maxUsers });

    if (!licenseExpiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Data de expiração da licença é obrigatória'
      });
    }

    const school = await User.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    // Garantir que o role seja válido (admin ou school)
    if (school.role !== 'admin' && school.role !== 'school') {
      console.log(`[Admin-Schools] Corrigindo role inválido "${school.role}" para "school"`);
      school.role = 'school';
    }

    // Aprovar e ativar
    school.approvedByAdmin = true;
    school.isActive = true;
    school.registrationStatus = 'approved';
    school.licenseExpiryDate = new Date(licenseExpiryDate);
    school.maxUsers = parseInt(String(maxUsers)) || 50;
    school.paymentStatus = 'paid';
    
    if (adminNotes) {
      school.adminNotes = adminNotes;
    }

    await school.save();
    
    // Enviar email de confirmação para a escola
    try {
      await sendPaymentConfirmationEmail({
        schoolEmail: school.email,
        schoolName: school.schoolName || school.name,
        planName: school.selectedPlan || 'Básico',
        planDuration: 12, // default
        amount: 0, // será preenchido no pagamento real
        paymentMethod: 'PIX/Cartão',
        paymentDate: new Date(),
        licenseExpiryDate: school.licenseExpiryDate
      });
      console.log('[Admin-Schools] Email de aprovação enviado para:', school.email);
    } catch (emailError) {
      console.error('[Admin-Schools] Erro ao enviar email:', emailError);
      // Não bloqueia a aprovação se o email falhar
    }
    
    console.log('[Admin-Schools] Escola aprovada com sucesso:', school._id);

    res.json({
      success: true,
      message: 'Escola aprovada e licença ativada com sucesso',
      data: {
        id: school._id,
        email: school.email,
        schoolName: school.schoolName,
        isActive: school.isActive,
        approvedByAdmin: school.approvedByAdmin,
        licenseExpiryDate: school.licenseExpiryDate,
        maxUsers: school.maxUsers,
        paymentStatus: school.paymentStatus
      }
    });
  } catch (error: any) {
    console.error('[Admin-Schools] Erro ao aprovar escola:', error);
    console.error('[Admin-Schools] Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erro ao aprovar escola',
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/schools/:id/reset-password - Resetar senha da escola
 */
router.put('/:id/reset-password', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Nova senha é obrigatória e deve ter no mínimo 6 caracteres'
      });
    }

    const school = await User.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    // Atribui a senha diretamente - o pre-save hook fará o hash automaticamente
    school.password = newPassword;
    await school.save();

    console.log(`[Admin-Schools] Senha resetada para escola: ${school.schoolName || school.email}`);

    res.json({
      success: true,
      message: 'Senha resetada com sucesso',
      data: {
        id: school._id,
        email: school.email,
        schoolName: school.schoolName
      }
    });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao resetar senha'
    });
  }
});

/**
 * PUT /api/admin/schools/:id/toggle - Ativar/Desativar escola
 */
router.put('/:id/toggle', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const school = await User.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    school.isActive = !school.isActive;
    await school.save();

    res.json({
      success: true,
      message: `Escola ${school.isActive ? 'ativada' : 'desativada'} com sucesso`,
      data: {
        id: school._id,
        isActive: school.isActive
      }
    });
  } catch (error) {
    console.error('Erro ao alterar status da escola:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao alterar status da escola'
    });
  }
});

/**
 * PUT /api/admin/schools/:id/license - Atualizar licença
 */
router.put('/:id/license', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { licenseExpiryDate, maxUsers, paymentStatus } = req.body;

    const school = await User.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    if (licenseExpiryDate) {
      school.licenseExpiryDate = new Date(licenseExpiryDate);
    }
    if (maxUsers !== undefined) {
      school.maxUsers = maxUsers;
    }
    if (paymentStatus) {
      school.paymentStatus = paymentStatus;
    }

    await school.save();

    res.json({
      success: true,
      message: 'Licença atualizada com sucesso',
      data: {
        id: school._id,
        licenseExpiryDate: school.licenseExpiryDate,
        maxUsers: school.maxUsers,
        paymentStatus: school.paymentStatus
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar licença:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar licença'
    });
  }
});

/**
 * DELETE /api/admin/schools/:id - Deletar escola
 */
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const school = await User.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Escola deletada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar escola:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar escola'
    });
  }
});

/**
 * PATCH /api/admin/schools/:id/reject - Rejeitar cadastro
 */
router.patch('/:id/reject', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const school = await User.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    school.approvedByAdmin = false;
    school.isActive = false;
    school.registrationStatus = 'rejected';
    if (adminNotes) {
      school.adminNotes = adminNotes;
    }

    await school.save();

    res.json({
      success: true,
      message: 'Cadastro rejeitado com sucesso',
      data: {
        id: school._id,
        email: school.email,
        registrationStatus: school.registrationStatus
      }
    });
  } catch (error) {
    console.error('Erro ao rejeitar cadastro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao rejeitar cadastro'
    });
  }
});

/**
 * PATCH /api/admin/schools/:id/suspend - Suspender escola
 */
router.patch('/:id/suspend', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const school = await User.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    school.isActive = false;
    school.registrationStatus = 'suspended';
    if (adminNotes) {
      school.adminNotes = adminNotes;
    }

    await school.save();

    res.json({
      success: true,
      message: 'Escola suspensa com sucesso',
      data: {
        id: school._id,
        email: school.email,
        schoolName: school.schoolName,
        registrationStatus: school.registrationStatus
      }
    });
  } catch (error) {
    console.error('Erro ao suspender escola:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao suspender escola'
    });
  }
});

/**
 * PATCH /api/admin/schools/:id/reactivate - Reativar escola suspensa
 */
router.patch('/:id/reactivate', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const school = await User.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    school.isActive = true;
    school.registrationStatus = 'approved';
    school.approvedByAdmin = true;
    if (adminNotes) {
      school.adminNotes = adminNotes;
    }

    await school.save();

    res.json({
      success: true,
      message: 'Escola reativada com sucesso',
      data: {
        id: school._id,
        email: school.email,
        schoolName: school.schoolName,
        registrationStatus: school.registrationStatus,
        isActive: school.isActive
      }
    });
  } catch (error) {
    console.error('Erro ao reativar escola:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao reativar escola'
    });
  }
});

/**
 * PATCH /api/admin/schools/:id/notes - Atualizar observações administrativas
 */
router.patch('/:id/notes', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const school = await User.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    school.adminNotes = adminNotes || '';
    await school.save();

    res.json({
      success: true,
      message: 'Observações atualizadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar observações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar observações'
    });
  }
});

/**
 * PUT /api/admin/schools/:id/data - Atualizar dados cadastrais da escola
 */
router.put('/:id/data', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { schoolName, cnpj, phone, address, city, state, zipCode, schoolType, numberOfStudents, numberOfTeachers } = req.body;

    const school = await User.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    // Atualizar dados
    if (schoolName) school.schoolName = schoolName;
    if (cnpj) school.cnpj = cnpj;
    if (phone) school.phone = phone;
    if (address) school.address = address;
    if (city) school.city = city;
    if (state) school.state = state;
    if (zipCode) school.zipCode = zipCode;
    if (schoolType) school.schoolType = schoolType;
    if (numberOfStudents !== undefined) school.numberOfStudents = numberOfStudents;
    if (numberOfTeachers !== undefined) school.numberOfTeachers = numberOfTeachers;

    await school.save();

    res.json({
      success: true,
      message: 'Dados cadastrais atualizados com sucesso',
      data: school
    });
  } catch (error) {
    console.error('Erro ao atualizar dados cadastrais:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar dados cadastrais'
    });
  }
});

/**
 * PUT /api/admin/schools/:id/responsible - Atualizar dados do responsável
 */
router.put('/:id/responsible', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { responsibleName, responsibleCPF, responsiblePhone, responsibleEmail } = req.body;

    const school = await User.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    // Atualizar dados do responsável
    if (responsibleName) school.responsibleName = responsibleName;
    if (responsibleCPF) school.responsibleCPF = responsibleCPF;
    if (responsiblePhone) school.responsiblePhone = responsiblePhone;
    if (responsibleEmail) school.responsibleEmail = responsibleEmail;

    await school.save();

    res.json({
      success: true,
      message: 'Dados do responsável atualizados com sucesso',
      data: school
    });
  } catch (error) {
    console.error('Erro ao atualizar dados do responsável:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar dados do responsável'
    });
  }
});

/**
 * POST /api/admin/schools/:id/payment - Registrar pagamento
 */
router.post('/:id/payment', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, method, date, notes, planName, planDuration } = req.body;

    const school = await User.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'Escola não encontrada'
      });
    }

    // Calcular data de expiração da licença
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + (planDuration || 1));

    // Atualizar dados da escola
    school.paymentStatus = 'paid';
    school.isActive = true;
    school.licenseExpiryDate = expiryDate;
    if (planName) school.selectedPlan = planName;
    
    // Adicionar observação sobre o pagamento
    const paymentNote = `\n[PAGAMENTO CONFIRMADO] ${new Date(date).toLocaleDateString('pt-BR')}: R$ ${amount.toFixed(2)} via ${method}${notes ? ` - ${notes}` : ''} | Plano: ${planName || 'Padrão'} | Válido até: ${expiryDate.toLocaleDateString('pt-BR')}`;
    school.adminNotes = (school.adminNotes || '') + paymentNote;

    await school.save();

    // Enviar e-mail de confirmação para a escola
    try {
      const emailSent = await sendPaymentConfirmationEmail({
        schoolName: school.schoolName || school.name || 'Escola',
        schoolEmail: school.email,
        amount: amount,
        paymentMethod: method,
        paymentDate: new Date(date),
        planName: planName || 'Plano Padrão',
        planDuration: planDuration || 1,
        licenseExpiryDate: expiryDate
      });

      if (emailSent) {
        console.log('✅ E-mail de confirmação enviado para:', school.email);
      } else {
        console.log('⚠️ Falha ao enviar e-mail, mas pagamento foi registrado');
      }
    } catch (emailError) {
      console.error('❌ Erro ao enviar e-mail:', emailError);
      // Não bloqueia o processo de pagamento se o e-mail falhar
    }

    res.json({
      success: true,
      message: 'Pagamento confirmado e e-mail enviado para a escola',
      data: school
    });
  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar pagamento'
    });
  }
});

export default router;
