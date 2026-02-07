import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import SchoolUser from '../models/SchoolUser';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    userId?: string;
    role: string;
    schoolId?: string;
    permissions?: any;
    name?: string;
    email?: string;
  };
}

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log(`🔐 Auth middleware - ${req.method} ${req.path}`);
    
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log('❌ Token não fornecido');
      return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }

    console.log('🔑 Token recebido:', token.substring(0, 20) + '...');

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
      console.log('🔓 Token decodificado:', decoded);
    } catch (jwtError: any) {
      console.error('❌ Erro ao decodificar token:', jwtError.message);
      return res.status(401).json({ message: 'Token inválido.' });
    }
    
    // Verificar se é SchoolUser ou User principal
    if (decoded.type === 'school-user') {
      // Usuário do sistema de multi-usuários
      console.log('👥 Autenticando SchoolUser:', decoded.userId);
      
      const schoolUser = await SchoolUser.findById(decoded.userId);
      
      if (!schoolUser || !schoolUser.isActive) {
        console.log('❌ SchoolUser não encontrado ou inativo:', decoded.userId);
        return res.status(401).json({ message: 'Usuário não encontrado ou inativo.' });
      }
      
      console.log('✅ SchoolUser autenticado:', {
        id: schoolUser._id,
        name: schoolUser.name,
        email: schoolUser.email,
        role: schoolUser.role,
        schoolId: schoolUser.schoolId
      });
      
      req.user = {
        id: schoolUser._id.toString(),
        userId: schoolUser._id.toString(),
        role: schoolUser.role,
        schoolId: schoolUser.schoolId.toString(),
        permissions: schoolUser.permissions,
        name: schoolUser.name,
        email: schoolUser.email
      };
    } else {
      // Usuário principal (escola)
      console.log('🔍 Buscando usuário principal no banco:', decoded.id);
      
      const user = await User.findById(decoded.id);
      
      if (!user) {
        console.log('❌ Usuário não encontrado no banco:', decoded.id);
        return res.status(401).json({ message: 'Usuário não encontrado.' });
      }
      
      console.log('👤 Usuário encontrado:', { 
        id: user._id, 
        role: user.role, 
        schoolName: user.schoolName,
        email: user.email 
      });
      
      // Para usuários school, o schoolId é o próprio ID do usuário
      const schoolId = user.role === 'school' ? user._id.toString() : undefined;
      console.log('🏫 SchoolId calculado:', schoolId);
      
      if (user.role === 'school' && !schoolId) {
        console.error('⚠️ ALERTA: Role é school mas schoolId está undefined!');
      }
      
      req.user = { 
        id: decoded.id, 
        userId: decoded.id,
        role: decoded.role,
        schoolId,
        name: user.name,
        email: user.email
      };
    }
    
    console.log('✅ Auth middleware concluído - req.user:', req.user);
    next();
  } catch (error: any) {
    console.error('❌ Erro geral no middleware auth:', error.message);
    console.error('Stack:', error.stack);
    res.status(401).json({ message: 'Token inválido.' });
  }
};

// Alias para compatibilidade
export const authenticate = auth;

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
  }
  next();
};
