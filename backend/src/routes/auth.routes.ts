import express from 'express';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import SchoolUser from '../models/SchoolUser';
import { sendPasswordResetEmail } from '../services/emailService';
import { AutoBackupService } from '../services/auto-backup.service';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Ping para acordar o servidor (cold start warm-up)
router.get('/ping', (_req: any, res: any) => res.json({ ok: true }));

// Endpoint de teste para verificar autenticação
router.get('/me', auth, async (req: AuthRequest, res: any) => {
  try {
    console.log('🔍 GET /auth/me - req.user:', req.user);
    
    return res.json({
      success: true,
      user: req.user,
      message: 'Autenticação funcionando corretamente'
    });
  } catch (error: any) {
    console.error('❌ Erro em /auth/me:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Registro completo de escola
router.post('/register-school', async (req: any, res: any) => {
  try {
    const { email, password, acceptedTerms, numberOfTeachers, selectedPlan, ...schoolData } = req.body;

    if (!acceptedTerms) {
      return res.status(400).json({ message: 'Você deve aceitar os termos de uso' });
    }

    // Validar plano baseado no número de professores
    const teachers = numberOfTeachers || 0;
    
    if (selectedPlan === 'basico' && teachers > 30) {
      return res.status(400).json({ 
        message: 'O plano Básico suporta até 30 professores. Você informou ' + teachers + ' professores. Escolha o plano Profissional.',
        requiredPlan: 'profissional'
      });
    }
    
    if (selectedPlan === 'profissional' && teachers > 50) {
      return res.status(400).json({ 
        message: 'O plano Profissional suporta até 50 professores. Você informou ' + teachers + ' professores. Entre em contato para planos personalizados.',
        contact: 'wanderpsc@gmail.com'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }

    const user = new User({
      ...schoolData,
      email,
      password, // Será hasheada pelo pre-save hook
      role: 'school',
      registrationStatus: 'pending',
      acceptedTerms,
      acceptedTermsDate: new Date(),
      numberOfTeachers,
      selectedPlan
    });

    await user.save();

    res.status(201).json({
      message: 'Cadastro realizado com sucesso! Aguardando aprovação do administrador. Você receberá um email quando sua licença for liberada.',
      schoolName: user.schoolName,
      status: 'pending_approval',
      selectedPlan: selectedPlan,
      numberOfTeachers: teachers,
      nextStep: 'Complete o pagamento e aguarde a aprovação do administrador para acessar o sistema.'
    });
  } catch (error: any) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: error.message });
  }
});

// Registro simples (compatibilidade)
router.post('/register',
  [
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
    body('schoolName').notEmpty().withMessage('Nome da escola é obrigatório')
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password, schoolName, licenseKey } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email já cadastrado' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        name,
        email,
        password: hashedPassword,
        schoolName,
        licenseKey,
        role: 'school'
      });

      await user.save();

      // Gerar token JWT
      const token = jwt.sign(
        { id: user._id, role: user.role },
        (process.env.JWT_SECRET || 'secret') as jwt.Secret,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          schoolName: user.schoolName
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Login - Verifica automaticamente schoolusers e users
router.post('/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Senha é obrigatória')
  ],
  async (req: any, res: any) => {
    console.log('🔍 POST /login - Iniciando...');
    console.log('📦 Body:', { email: req.body.email, password: '***' });
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Erros de validação:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const emailLower = email.toLowerCase();
      console.log('🔍 Procurando usuário:', emailLower);

      // 1️⃣ PRIORIDADE: Verificar primeiro na collection schoolusers (funcionários)
      console.log('👥 Verificando schoolusers...');
      const schoolUser = await SchoolUser.findOne({ email: emailLower });
      
      if (schoolUser) {
        console.log('✅ Usuário encontrado em schoolusers (role: ' + schoolUser.role + ')');
        
        // Verificar senha
        const isMatch = await bcrypt.compare(password, schoolUser.password);
        if (!isMatch) {
          console.log('❌ Senha incorreta');
          return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        // Verificar se está ativo
        if (!schoolUser.isActive) {
          console.log('⚠️ Usuário inativo');
          return res.status(403).json({ 
            message: 'Sua conta está inativa. Entre em contato com o administrador.',
            status: 'inactive'
          });
        }

        // Atualizar último login
        schoolUser.lastLogin = new Date();
        await schoolUser.save();

        // Gerar token JWT com type='school-user' para diferenciação no middleware
        const token = jwt.sign(
          { 
            userId: schoolUser._id, 
            type: 'school-user',
            role: schoolUser.role, 
            schoolId: schoolUser.schoolId 
          },
          (process.env.JWT_SECRET || 'secret') as jwt.Secret,
          { expiresIn: '7d' }
        );

        console.log('✅ Login bem-sucedido (schooluser)');
        
        return res.json({
          token,
          user: {
            id: schoolUser._id,
            name: schoolUser.name,
            email: schoolUser.email,
            role: schoolUser.role,
            schoolId: schoolUser.schoolId.toString(),
            permissions: schoolUser.permissions
          }
        });
      }

      // 2️⃣ FALLBACK: Se não encontrou em schoolusers, verificar em users (escolas)
      console.log('🏫 Verificando users (schools)...');
      const user = await User.findOne({ email: emailLower });
      
      if (!user) {
        console.log('❌ Usuário não encontrado em nenhuma collection');
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }

      console.log('✅ Usuário encontrado em users (role: ' + user.role + ')');

      // Verificar senha
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log('❌ Senha incorreta');
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }

      // Verificar se a escola foi aprovada pelo administrador
      if (user.role === 'school' && !user.approvedByAdmin) {
        console.log('⚠️ Escola não aprovada ainda');
        return res.status(403).json({ 
          message: 'Sua conta está aguardando aprovação do administrador. Você receberá um email quando sua licença for liberada.',
          status: 'pending_approval'
        });
      }

      // Verificar se a conta está suspensa
      if (user.registrationStatus === 'suspended') {
        console.log('⚠️ Conta suspensa');
        return res.status(403).json({ 
          message: 'Sua conta foi suspensa. Entre em contato com o administrador.',
          status: 'suspended'
        });
      }

      // Verificar se a conta foi rejeitada
      if (user.registrationStatus === 'rejected') {
        console.log('⚠️ Conta rejeitada');
        return res.status(403).json({ 
          message: 'Sua solicitação de cadastro foi rejeitada. Entre em contato com o administrador.',
          status: 'rejected'
        });
      }

      // Gerar token JWT
      const token = jwt.sign(
        { id: user._id, role: user.role },
        (process.env.JWT_SECRET || 'secret') as jwt.Secret,
        { expiresIn: '7d' }
      );

      console.log('✅ Login bem-sucedido (school)');
      
      // Criar backup automático para clientes (não admin)
      if (user.role !== 'admin') {
        AutoBackupService.createLoginBackup(user._id.toString())
          .catch(err => console.error('❌ Erro ao criar backup automático:', err));
      }
      
      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          schoolId: user.role === 'school' ? user._id.toString() : undefined,
          schoolName: user.schoolName
        }
      });
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({ message: error.message });
    }
  }
);

// Aceite de Termos
router.post('/accept-terms', async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    
    const { termsVersion, privacyVersion, copyrightAcknowledged } = req.body;
    
    // Atualizar usuário
    const user = await User.findByIdAndUpdate(
      decoded.id,
      {
        acceptedTerms: true,
        acceptedTermsDate: new Date(),
        termsVersion: termsVersion || '1.0',
        privacyVersion: privacyVersion || '1.0',
        copyrightAcknowledged: copyrightAcknowledged || false
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Criar registro de aceite para fins legais
    const TermsAcceptance = require('../models/TermsAcceptance').default;
    const crypto = require('crypto');
    
    const digitalSignature = crypto
      .createHash('sha256')
      .update(`${user._id}-${termsVersion}-${Date.now()}`)
      .digest('hex');

    await TermsAcceptance.create({
      userId: user._id,
      schoolId: user.school,
      termsVersion: termsVersion || '1.0',
      privacyVersion: privacyVersion || '1.0',
      acceptedAt: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      digitalSignature
    });

    res.json({
      success: true,
      message: 'Termos aceitos com sucesso',
      acceptedAt: user.acceptedTermsDate
    });
  } catch (error: any) {
    console.error('Erro ao aceitar termos:', error);
    res.status(500).json({ message: error.message });
  }
});

// Esqueci minha senha
router.post('/forgot-password',
  [body('email').isEmail().withMessage('Email inválido')],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        // Por segurança, não revelamos se o email existe ou não
        return res.json({ 
          message: 'Se o email existir, você receberá as instruções para redefinir sua senha.' 
        });
      }

      // Gerar token de reset
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Hash do token antes de salvar
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      // Salvar token e data de expiração (1 hora)
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
      await user.save();

      // Enviar email
      await sendPasswordResetEmail(user.email, resetToken, user.name);

      res.json({ 
        message: 'Se o email existir, você receberá as instruções para redefinir sua senha.',
        success: true
      });
    } catch (error: any) {
      console.error('Erro ao processar recuperação de senha:', error);
      res.status(500).json({ message: 'Erro ao processar solicitação' });
    }
  }
);

// Resetar senha
router.post('/reset-password/:token',
  [
    body('password')
      .isLength({ min: 6 })
      .withMessage('Senha deve ter no mínimo 6 caracteres')
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token } = req.params;
      const { password } = req.body;

      // Hash do token recebido
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Buscar usuário com token válido e não expirado
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ 
          message: 'Token inválido ou expirado' 
        });
      }

      // Atualizar senha
      user.password = password; // O hash será feito pelo pre-save hook
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      res.json({ 
        message: 'Senha redefinida com sucesso!',
        success: true
      });
    } catch (error: any) {
      console.error('Erro ao resetar senha:', error);
      res.status(500).json({ message: 'Erro ao resetar senha' });
    }
  }
);

// Alterar senha do usuário logado (User principal - dono da escola)
router.post('/change-password', async (req: any, res: any) => {
  try {
    console.log('🔐 POST /auth/change-password - Iniciando...');
    
    const { currentPassword, newPassword } = req.body;
    
    // Pegar userId do token (precisamos do auth middleware)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Token não fornecido');
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, (process.env.JWT_SECRET || 'secret') as jwt.Secret);
      console.log('🔓 Token decodificado:', { id: decoded.id, userId: decoded.userId, role: decoded.role });
    } catch (error) {
      console.log('❌ Token inválido');
      return res.status(401).json({ message: 'Token inválido' });
    }

    // Validação
    if (!currentPassword || !newPassword) {
      console.log('❌ Senhas não fornecidas');
      return res.status(400).json({ message: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 6) {
      console.log('❌ Nova senha muito curta');
      return res.status(400).json({ message: 'Nova senha deve ter no mínimo 6 caracteres' });
    }

    // Buscar usuário na collection Users (role: 'school')
    const userId = decoded.userId || decoded.id;
    console.log('🔍 Buscando usuário:', userId);
    
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('❌ Usuário não encontrado:', userId);
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    console.log('✅ Usuário encontrado:', user.email);

    // Verificar senha atual
    console.log('🔍 Verificando senha atual...');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      console.log('❌ Senha atual incorreta');
      return res.status(401).json({ message: 'Senha atual incorreta' });
    }

    console.log('✅ Senha atual correta, atualizando...');

    // Hash da nova senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Atualizar usando updateOne para evitar double-hashing do pre-save
    await User.updateOne(
      { _id: userId },
      { $set: { password: hashedPassword } }
    );

    console.log('✅ Senha alterada com sucesso para usuário:', user.email);

    return res.json({ message: 'Senha alterada com sucesso' });
  } catch (error: any) {
    console.error('❌ Erro ao alterar senha:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({ message: `Erro ao alterar senha: ${error.message}` });
  }
});

export default router;
