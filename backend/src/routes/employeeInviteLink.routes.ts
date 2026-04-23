import express from 'express';
import crypto from 'crypto';
import EmployeeInviteLink from '../models/EmployeeInviteLink';
import Employee from '../models/Employee';
import User from '../models/User';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /  — gerar link de convite (requer autenticação)
// Body: { employeeId?: string }  (vazio → link para cadastrar novo funcionário)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { employeeId } = req.body;

    // Nome da escola
    const schoolUser = await User.findById(schoolId).select('schoolName name');
    const schoolName = (schoolUser as any)?.schoolName || (schoolUser as any)?.name || '';

    let employeeName = '';
    if (employeeId) {
      const emp = await Employee.findOne({ _id: employeeId, schoolId });
      if (!emp) return res.status(404).json({ message: 'Funcionário não encontrado.' });
      employeeName = emp.name;
    }

    const token = crypto.randomBytes(24).toString('hex');
    const invite = new EmployeeInviteLink({
      token,
      schoolId,
      schoolName,
      employeeId: employeeId || '',
      employeeName,
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
      createdBy: req.user!.id,
    });

    await invite.save();
    res.status(201).json(invite);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /  — listar links da escola (requer autenticação)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const links = await EmployeeInviteLink.find({ schoolId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(links);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /:id  — desativar link (requer autenticação)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const link = await EmployeeInviteLink.findOneAndUpdate(
      { _id: req.params.id, schoolId },
      { isActive: false },
      { new: true }
    );
    if (!link) return res.status(404).json({ message: 'Link não encontrado.' });
    res.json({ message: 'Link desativado.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /public/:token  — obter dados do convite (sem autenticação)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/public/:token', async (req, res) => {
  try {
    const invite = await EmployeeInviteLink.findOne({ token: req.params.token });
    if (!invite) return res.status(404).json({ message: 'Link não encontrado.' });
    if (!invite.isActive) return res.status(410).json({ message: 'Este link foi desativado.' });
    if (invite.expiresAt < new Date()) return res.status(410).json({ message: 'Este link expirou.' });

    // Pré-preencher dados se for atualização de funcionário existente
    let existingData: Record<string, unknown> | null = null;
    if (invite.employeeId) {
      const emp = await Employee.findById(invite.employeeId).lean();
      if (emp) {
        // Excluir campos internos que o funcionário não deve editar
        const { schoolId, isActive, createdAt, updatedAt, __v, _id, ...safeData } = emp as any;
        existingData = safeData;
      }
    }

    res.json({
      token: invite.token,
      schoolName: invite.schoolName,
      employeeId: invite.employeeId || null,
      employeeName: invite.employeeName || null,
      isUpdate: !!invite.employeeId,
      existingData,
      expiresAt: invite.expiresAt,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /public/:token/submit  — funcionário envia seus dados (sem autenticação)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/public/:token/submit', async (req, res) => {
  try {
    const invite = await EmployeeInviteLink.findOne({ token: req.params.token });
    if (!invite) return res.status(404).json({ message: 'Link não encontrado.' });
    if (!invite.isActive) return res.status(410).json({ message: 'Este link foi desativado.' });
    if (invite.expiresAt < new Date()) return res.status(410).json({ message: 'Este link expirou.' });

    // Campos permitidos que o funcionário pode enviar (bloqueio de campos internos)
    const ALLOWED_FIELDS = [
      'name', 'matricula', 'cpf', 'rg', 'rgOrgao', 'rgDataEmissao',
      'dataNascimento', 'naturalidade', 'nacionalidade', 'sexo',
      'estadoCivil', 'nomeMae', 'nomePai', 'tipoSanguineo',
      'email', 'celular', 'telefoneFixo',
      'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
      'cargo', 'setor', 'tipoContrato', 'dataAdmissao', 'jornadaTrabalho',
      'cargaHorariaSemanal',
      'ctpsNumero', 'ctpsSerie', 'pisPasep', 'tituloEleitor', 'zonaEleitoral',
      'secaoEleitoral', 'certificadoMilitar', 'cnhNumero', 'cnhCategoria',
      'cnhValidade', 'reservista', 'observacoes',
    ];

    // Filtrar apenas os campos permitidos do body
    const submittedData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined && req.body[field] !== '') {
        submittedData[field] = req.body[field];
      }
    }

    if (!submittedData.name) {
      return res.status(400).json({ message: 'O nome é obrigatório.' });
    }

    let employee;
    if (invite.employeeId) {
      // Atualizar funcionário existente
      employee = await Employee.findOneAndUpdate(
        { _id: invite.employeeId, schoolId: invite.schoolId },
        { $set: submittedData },
        { new: true, runValidators: true }
      );
      if (!employee) {
        return res.status(404).json({ message: 'Funcionário não encontrado no sistema.' });
      }
    } else {
      // Criar novo funcionário
      employee = new Employee({
        ...submittedData,
        schoolId: invite.schoolId,
        isActive: true,
      });
      await employee.save();

      // Vincular o invite ao funcionário criado para evitar duplicatas
      invite.employeeId = (employee._id as any).toString();
    }

    // Registrar envio
    invite.submittedAt = new Date();
    invite.submittedData = submittedData;
    await invite.save();

    res.json({ message: 'Dados enviados com sucesso! Obrigado.', employeeId: employee._id });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
