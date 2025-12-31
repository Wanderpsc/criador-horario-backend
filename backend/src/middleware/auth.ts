import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    schoolId?: string;
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
      console.log('🔓 Token decodificado:', { id: decoded.id, role: decoded.role });
    } catch (jwtError: any) {
      console.error('❌ Erro ao decodificar token:', jwtError.message);
      return res.status(401).json({ message: 'Token inválido.' });
    }
    
    // Buscar usuário no banco para pegar schoolId
    console.log('🔍 Buscando usuário no banco:', decoded.id);
    let user;
    try {
      user = await User.findById(decoded.id);
      console.log('👤 Resultado da busca:', user ? 'Usuário encontrado' : 'Usuário NÃO encontrado');
    } catch (dbError: any) {
      console.error('❌ Erro ao buscar usuário no MongoDB:', dbError.message);
      return res.status(500).json({ message: 'Erro ao buscar usuário.' });
    }
    
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
      role: decoded.role,
      schoolId
    };
    
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
