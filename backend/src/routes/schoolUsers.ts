import { Router, Request, Response } from 'express';
import SchoolUser, { defaultAdminPermissions, defaultUserPermissions } from '../models/SchoolUser';
import AuditLog from '../models/AuditLog';
import jwt from 'jsonwebtoken';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();

// Login do School User
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Tentativa de login School User:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    // Buscar usuário
    const user = await SchoolUser.findOne({ email: email.toLowerCase(), isActive: true });
    
    if (!user) {
      console.log('❌ Usuário não encontrado:', email);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      console.log('❌ Senha incorreta para:', email);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Atualizar último login
    user.lastLogin = new Date();
    await user.save();

    // Gerar token JWT
    const token = jwt.sign(
      { 
        userId: user._id,
        schoolId: user.schoolId,
        role: user.role,
        type: 'school-user'
      },
      process.env.JWT_SECRET || 'secret-key-default',
      { expiresIn: '24h' }
    );

    // Registrar no audit log
    await AuditLog.create({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      schoolId: user.schoolId,
      action: 'login',
      resource: 'auth',
      method: 'POST',
      endpoint: '/api/school-users/login',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      status: 'success'
    });

    console.log('✅ Login bem-sucedido:', email);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        schoolId: user.schoolId,
        lastLogin: user.lastLogin
      }
    });
  } catch (error: any) {
    console.error('❌ Erro no login School User:', error);
    res.status(500).json({ error: 'Erro ao fazer login', details: error.message });
  }
});

// Criar primeiro usuário admin (seed - apenas se não existir nenhum admin)
router.post('/seed-admin', async (req: Request, res: Response) => {
  try {
    const { schoolId, email, password, name } = req.body;

    if (!schoolId || !email || !password || !name) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Verificar se já existe admin para esta escola
    const existingAdmin = await SchoolUser.findOne({ schoolId, role: 'admin' });
    
    if (existingAdmin) {
      return res.status(400).json({ error: 'Já existe um administrador para esta escola' });
    }

    // Criar admin
    const admin = new SchoolUser({
      name,
      email: email.toLowerCase(),
      password,
      role: 'admin',
      permissions: defaultAdminPermissions,
      schoolId,
      isActive: true
    });

    await admin.save();

    console.log('✅ Administrador criado com sucesso:', email);

    res.status(201).json({
      message: 'Administrador criado com sucesso',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao criar admin:', error);
    res.status(500).json({ error: 'Erro ao criar administrador', details: error.message });
  }
});

// Listar todos os usuários da escola (apenas admin)
router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;

    const users = await SchoolUser.find({ schoolId })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error: any) {
    console.error('❌ Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários', details: error.message });
  }
});

// Criar novo usuário (apenas admin ou dono da escola)
router.post('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    const schoolId = req.user!.schoolId;
    const creatorId = req.user!.userId;
    const creatorRole = req.user!.role;

    // Verificar se o criador é admin (SchoolUser) ou dono da escola (role: 'school')
    if (creatorRole !== 'admin' && creatorRole !== 'school') {
      return res.status(403).json({ error: 'Apenas administradores ou donos da escola podem criar usuários' });
    }

    // Se for role 'school', buscar o ID da escola (creatorId é o ID do User, não SchoolUser)
    // Se for role 'admin', buscar na SchoolUser
    const creator = creatorRole === 'admin' 
      ? await SchoolUser.findById(creatorId)
      : { _id: creatorId, role: 'school', name: req.user!.name };
    
    if (!creator) {
      return res.status(403).json({ error: 'Criador não encontrado' });
    }

    // Verificar se já existe usuário com este email nesta escola
    const existingUser = await SchoolUser.findOne({ email: email.toLowerCase(), schoolId });
    if (existingUser) {
      return res.status(400).json({ error: 'Já existe um usuário com este e-mail' });
    }

    // Criar usuário
    const newUser = new SchoolUser({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'user',
      permissions: permissions || (role === 'admin' ? defaultAdminPermissions : defaultUserPermissions),
      schoolId,
      createdBy: creatorId,
      isActive: true
    });

    await newUser.save();

    // Registrar no audit log
    await AuditLog.create({
      userId: creatorId,
      userName: creator.name,
      userEmail: creator.email,
      schoolId,
      action: 'create',
      resource: 'users',
      resourceId: newUser._id.toString(),
      method: 'POST',
      endpoint: '/api/school-users',
      changes: { after: { name, email, role } },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      status: 'success'
    });

    console.log('✅ Usuário criado:', email);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        permissions: newUser.permissions
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário', details: error.message });
  }
});

// Atualizar usuário (apenas admin ou dono da escola)
router.put('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, role, permissions, isActive, password } = req.body;
    const schoolId = req.user!.schoolId;
    const updaterId = req.user!.userId;
    const updaterRole = req.user!.role;

    // Verificar se o atualizador é admin ou dono da escola
    if (updaterRole !== 'admin' && updaterRole !== 'school') {
      return res.status(403).json({ error: 'Apenas administradores ou donos da escola podem atualizar usuários' });
    }

    const updater = updaterRole === 'admin'
      ? await SchoolUser.findById(updaterId)
      : { _id: updaterId, role: 'school', name: req.user!.name, email: req.user!.email };

    if (!updater) {
      return res.status(403).json({ error: 'Atualizador não encontrado' });
    }

    const user = await SchoolUser.findOne({ _id: id, schoolId });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const before = {
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    };

    // Atualizar campos
    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (role) user.role = role;
    if (permissions) user.permissions = permissions;
    if (typeof isActive !== 'undefined') user.isActive = isActive;
    if (password) user.password = password;

    await user.save();

    const after = {
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    };

    // Registrar no audit log
    await AuditLog.create({
      userId: updaterId,
      userName: updater.name,
      userEmail: updater.email,
      schoolId,
      action: 'update',
      resource: 'users',
      resourceId: id,
      method: 'PUT',
      endpoint: `/api/school-users/${id}`,
      changes: { before, after },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      status: 'success'
    });

    console.log('✅ Usuário atualizado:', user.email);

    res.json({
      message: 'Usuário atualizado com sucesso',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário', details: error.message });
  }
});

// Excluir usuário (apenas admin ou dono da escola)
router.delete('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    const deleterId = req.user!.userId;
    const deleterRole = req.user!.role;

    // Verificar se o deletador é admin ou dono da escola
    if (deleterRole !== 'admin' && deleterRole !== 'school') {
      return res.status(403).json({ error: 'Apenas administradores ou donos da escola podem excluir usuários' });
    }

    const deleter = deleterRole === 'admin'
      ? await SchoolUser.findById(deleterId)
      : { _id: deleterId, role: 'school', name: req.user!.name, email: req.user!.email };

    if (!deleter) {
      return res.status(403).json({ error: 'Deletador não encontrado' });
    }

    const user = await SchoolUser.findOne({ _id: id, schoolId });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Não permitir deletar a si mesmo
    if (deleterId && id === deleterId.toString()) {
      return res.status(400).json({ error: 'Você não pode deletar sua própria conta' });
    }

    const before = {
      name: user.name,
      email: user.email,
      role: user.role
    };

    await SchoolUser.deleteOne({ _id: id });

    // Registrar no audit log
    await AuditLog.create({
      userId: deleterId,
      userName: deleter.name,
      userEmail: deleter.email,
      schoolId,
      action: 'delete',
      resource: 'users',
      resourceId: id,
      method: 'DELETE',
      endpoint: `/api/school-users/${id}`,
      changes: { before },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      status: 'success'
    });

    console.log('✅ Usuário deletado:', user.email);

    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error: any) {
    console.error('❌ Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro ao deletar usuário', details: error.message });
  }
});

// Resetar senha (admin ou dono da escola pode resetar senha de qualquer usuário)
router.post('/:id/reset-password', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const schoolId = req.user!.schoolId;
    const adminId = req.user!.userId;
    const adminRole = req.user!.role;

    // Verificar se é admin ou dono da escola
    if (adminRole !== 'admin' && adminRole !== 'school') {
      return res.status(403).json({ error: 'Apenas administradores ou donos da escola podem resetar senhas' });
    }

    const admin = adminRole === 'admin'
      ? await SchoolUser.findById(adminId)
      : { _id: adminId, role: 'school', name: req.user!.name, email: req.user!.email };

    if (!admin) {
      return res.status(403).json({ error: 'Requisitante não encontrado' });
    }

    const user = await SchoolUser.findOne({ _id: id, schoolId });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    user.password = newPassword;
    await user.save();

    // Registrar no audit log
    await AuditLog.create({
      userId: adminId,
      userName: admin.name,
      userEmail: admin.email,
      schoolId,
      action: 'update',
      resource: 'users',
      resourceId: id,
      method: 'POST',
      endpoint: `/api/school-users/${id}/reset-password`,
      changes: { after: 'Senha resetada' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      status: 'success'
    });

    console.log('✅ Senha resetada para:', user.email);

    res.json({ message: 'Senha resetada com sucesso' });
  } catch (error: any) {
    console.error('❌ Erro ao resetar senha:', error);
    res.status(500).json({ error: 'Erro ao resetar senha', details: error.message });
  }
});

export default router;
