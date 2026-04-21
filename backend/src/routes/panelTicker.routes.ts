/**
 * Rotas para letreiro do painel (PanelTicker)
 * © 2025 Wander Pires Silva Coelho
 */

import express, { Request, Response } from 'express';
import PanelTicker from '../models/PanelTicker';
import { auth } from '../middleware/auth';

interface AuthRequest extends Request {
  user?: any;
}

const router = express.Router();

// GET /api/panel-ticker/:schoolId - Obter letreiro ativo da escola (protegido)
router.get('/:schoolId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId } = req.params;
    const ticker = await PanelTicker.findOne({ schoolId });
    res.json({ data: ticker || { schoolId, message: '', active: false } });
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao buscar letreiro', error: error.message });
  }
});

// PUT /api/panel-ticker/:schoolId - Criar ou atualizar letreiro (protegido)
router.put('/:schoolId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { message, active } = req.body;

    const ticker = await PanelTicker.findOneAndUpdate(
      { schoolId },
      { message: message ?? '', active: active !== undefined ? active : true },
      { new: true, upsert: true }
    );
    res.json({ data: ticker });
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao salvar letreiro', error: error.message });
  }
});

export default router;
