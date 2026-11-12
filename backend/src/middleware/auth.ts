import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import SchoolUser from '../models/SchoolUser';
import { getJwtSecret } from '../config/jwt';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    userId?: string;
    role: string;
    /**
     * Origem da conta:
     *  - 'platform'    → User com role admin/super-admin (admin do sistema)
     *  - 'school'      → User com role school (conta principal da escola)
     *  - 'school-user' → SchoolUser (funcionário/sub-admin DE UMA escola)
     * Papéis 'admin' de SchoolUser NUNCA devem passar em verificações de
     * admin da plataforma — usar isPlatformAdmin().
     */
    accountType: 'platform' | 'school' | 'school-user';
    schoolId?: string;
    permissions?: any;
    name?: string;
    email?: string;
  };
}

/** Admin do sistema (plataforma) — nunca um sub-admin de escola. */
export const isPlatformAdmin = (user?: AuthRequest['user']): boolean =>
  !!user
  && user.accountType === 'platform'
  && (user.role === 'admin' || user.role === 'super-admin');

/**
 * Remove do corpo da requisição as chaves de posse (tenant) que o cliente
 * nunca pode alterar em uma atualização — impede mover registros para
 * outra escola via mass assignment.
 */
export const stripTenantKeys = (body: any): any => {
  if (!body || typeof body !== 'object') return body;
  const { userId, schoolId, school, _id, ...rest } = body;
  return rest;
};

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret()) as any;
    } catch (jwtError: any) {
      return res.status(401).json({ message: 'Token inválido.' });
    }

    // Verificar se é SchoolUser ou User principal
    if (decoded.type === 'school-user') {
      // Usuário do sistema de multi-usuários (pertence a UMA escola)
      const schoolUser = await SchoolUser.findById(decoded.userId);

      if (!schoolUser || !schoolUser.isActive) {
        return res.status(401).json({ message: 'Usuário não encontrado ou inativo.' });
      }

      req.user = {
        id: schoolUser._id.toString(),
        userId: schoolUser._id.toString(),
        role: schoolUser.role,
        accountType: 'school-user',
        schoolId: schoolUser.schoolId.toString(),
        permissions: schoolUser.permissions,
        name: schoolUser.name,
        email: schoolUser.email
      };
    } else {
      // Usuário principal (escola ou admin da plataforma)
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ message: 'Usuário não encontrado.' });
      }

      // Para usuários school, o schoolId é o próprio ID do usuário
      const schoolId = user.role === 'school' ? user._id.toString() : undefined;

      req.user = {
        id: decoded.id,
        userId: decoded.id,
        role: user.role, // ✅ Usar role do banco, não do token
        accountType: user.role === 'school' ? 'school' : 'platform',
        schoolId,
        name: user.name,
        email: user.email
      };
    }

    next();
  } catch (error: any) {
    console.error('❌ Erro geral no middleware auth:', error.message);
    res.status(401).json({ message: 'Token inválido.' });
  }
};

// Alias para compatibilidade
export const authenticate = auth;

/** Apenas admin DA PLATAFORMA (nunca sub-admin de escola). */
export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!isPlatformAdmin(req.user)) {
    return res.status(403).json({ message: 'Acesso negado. Apenas administradores do sistema.' });
  }
  next();
};

/** Conta principal da escola ou sub-admin da escola (gestão interna da escola). */
export const schoolAdminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  const allowed = user?.role === 'school'
    || (user?.accountType === 'school-user' && user.role === 'admin')
    || isPlatformAdmin(user);
  if (!allowed) {
    return res.status(403).json({
      message: 'Acesso negado. Apenas a administração da escola pode gerenciar links e dispositivos de ponto.',
    });
  }
  next();
};
