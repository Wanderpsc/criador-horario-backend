import { Router, Response } from 'express';
import { AuthRequest, auth } from '../middleware/auth';
import Message from '../models/Message';
import User from '../models/User';

const router = Router();

// Função auxiliar para criar ID de conversa
const getConversationId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join('-');
};

// GET /api/messages/conversations - Listar todas as conversas
router.get('/conversations', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    let conversations;

    if (isAdmin) {
      // Admin vê todas as conversas agrupadas por cliente
      const messages = await Message.find({
        $or: [
          { from: userId },
          { to: userId }
        ]
      })
      .populate('from', 'schoolName email')
      .populate('to', 'schoolName email')
      .sort({ createdAt: -1 });

      // Agrupar por conversationId
      const conversationsMap = new Map();

      for (const message of messages) {
        const convId = message.conversationId || getConversationId(
          (message.from as any)._id.toString(),
          (message.to as any)._id.toString()
        );

        if (!conversationsMap.has(convId)) {
          const otherUser: any = (message.from as any)._id.toString() === userId.toString() 
            ? message.to 
            : message.from;

          // Contar mensagens não lidas
          const unreadCount = await Message.countDocuments({
            conversationId: convId,
            to: userId,
            isRead: false
          });

          conversationsMap.set(convId, {
            conversationId: convId,
            school: {
              _id: otherUser._id,
              name: otherUser.schoolName || 'Sem nome',
              email: otherUser.email
            },
            lastMessage: message,
            unreadCount,
            messages: []
          });
        }
      }

      conversations = Array.from(conversationsMap.values());
    } else {
      // Cliente vê apenas sua conversa com o admin
      // Encontrar o admin
      const admin = await User.findOne({ role: 'admin' });
      if (!admin) {
        return res.json([]);
      }

      const convId = getConversationId(userId.toString(), admin._id.toString());
      
      const messages = await Message.find({
        $or: [
          { from: userId, to: admin._id },
          { from: admin._id, to: userId }
        ]
      })
      .populate('from', 'schoolName email')
      .populate('to', 'schoolName email')
      .sort({ createdAt: -1 });

      if (messages.length > 0) {
        const unreadCount = await Message.countDocuments({
          from: admin._id,
          to: userId,
          isRead: false
        });

        conversations = [{
          conversationId: convId,
          school: {
            _id: admin._id,
            name: 'Administrador',
            email: admin.email
          },
          lastMessage: messages[0],
          unreadCount,
          messages: []
        }];
      } else {
        conversations = [];
      }
    }

    res.json(conversations);
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    res.status(500).json({ message: 'Erro ao buscar conversas' });
  }
});

// GET /api/messages/conversation/:id - Obter mensagens de uma conversa específica
router.get('/conversation/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const messages = await Message.find({ conversationId: id })
      .populate('from', 'schoolName email role')
      .populate('to', 'schoolName email role')
      .sort({ createdAt: 1 });

    // Verificar se o usuário tem permissão para ver esta conversa
    if (messages.length > 0) {
      const firstMessage = messages[0];
      const isParticipant = 
        (firstMessage.from as any)._id.toString() === userId.toString() ||
        (firstMessage.to as any)._id.toString() === userId.toString();

      if (!isParticipant && !isAdmin) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
    }

    // Se não for admin, remover notas internas
    const filteredMessages = messages.map(msg => {
      const messageObj: any = msg.toObject();
      if (!isAdmin && messageObj.internalNotes) {
        messageObj.internalNotes = [];
      }
      return messageObj;
    });

    res.json(filteredMessages);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ message: 'Erro ao buscar mensagens' });
  }
});

// POST /api/messages/send - Enviar mensagem
router.post('/send', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const { message, subject, toUserId } = req.body;
    const fromUserId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!message) {
      return res.status(400).json({ message: 'Mensagem é obrigatória' });
    }

    let recipientId = toUserId;

    // Se não for admin, sempre enviar para o admin
    if (!isAdmin) {
      const admin = await User.findOne({ role: 'admin' });
      if (!admin) {
        return res.status(404).json({ message: 'Administrador não encontrado' });
      }
      recipientId = admin._id.toString();
    }

    if (!recipientId) {
      return res.status(400).json({ message: 'Destinatário é obrigatório' });
    }

    const conversationId = getConversationId(fromUserId.toString(), recipientId);

    const newMessage = new Message({
      from: fromUserId,
      to: recipientId,
      subject,
      message,
      conversationId,
      isRead: false,
      internalNotes: []
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('from', 'schoolName email role')
      .populate('to', 'schoolName email role');

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ message: 'Erro ao enviar mensagem' });
  }
});

// PATCH /api/messages/conversation/:id/read - Marcar conversa como lida
router.patch('/conversation/:id/read', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const { id } = req.params;
    const userId = req.user.id;

    await Message.updateMany(
      {
        conversationId: id,
        to: userId,
        isRead: false
      },
      {
        $set: { isRead: true }
      }
    );

    res.json({ message: 'Mensagens marcadas como lidas' });
  } catch (error) {
    console.error('Erro ao marcar mensagens como lidas:', error);
    res.status(500).json({ message: 'Erro ao marcar mensagens como lidas' });
  }
});

// POST /api/messages/:id/internal-note - Adicionar nota interna (apenas admin)
router.post('/:id/internal-note', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const { id } = req.params;
    const { note } = req.body;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({ message: 'Apenas administradores podem adicionar notas internas' });
    }

    if (!note || note.trim() === '') {
      return res.status(400).json({ message: 'Nota é obrigatória' });
    }

    const message = await Message.findByIdAndUpdate(
      id,
      {
        $push: { internalNotes: note.trim() }
      },
      { new: true }
    )
    .populate('from', 'schoolName email role')
    .populate('to', 'schoolName email role');

    if (!message) {
      return res.status(404).json({ message: 'Mensagem não encontrada' });
    }

    res.json(message);
  } catch (error) {
    console.error('Erro ao adicionar nota interna:', error);
    res.status(500).json({ message: 'Erro ao adicionar nota interna' });
  }
});

export default router;
