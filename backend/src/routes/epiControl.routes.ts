/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Rotas: Controle de EPIs
 */
import express from 'express';
import mongoose from 'mongoose';
import EpiControl from '../models/EpiControl';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();
const isValidId = (id: string) => mongoose.isValidObjectId(id);

// GET / — listar EPIs
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { employeeId, condition, epiType, isActive } = req.query;

    const filter: any = { schoolId };
    if (employeeId) filter.employeeId = employeeId;
    if (condition) filter.condition = condition;
    if (epiType) filter.epiType = { $regex: epiType, $options: 'i' };
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const records = await EpiControl.find(filter).sort({ deliveryDate: -1, employeeName: 1 });
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /:id — buscar um EPI
router.get('/:id', auth, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const schoolId = req.user!.schoolId || req.user!.id;
    const doc = await EpiControl.findOne({ _id: req.params.id, schoolId });
    if (!doc) return res.status(404).json({ message: 'Registro não encontrado.' });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST / — registrar entrega de EPI
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const doc = new EpiControl({ ...req.body, schoolId });
    await doc.save();
    res.status(201).json(doc);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /:id — atualizar EPI
router.put('/:id', auth, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const schoolId = req.user!.schoolId || req.user!.id;
    const doc = await EpiControl.findOneAndUpdate(
      { _id: req.params.id, schoolId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ message: 'Registro não encontrado.' });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /:id
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const schoolId = req.user!.schoolId || req.user!.id;
    const doc = await EpiControl.findOneAndDelete({ _id: req.params.id, schoolId });
    if (!doc) return res.status(404).json({ message: 'Registro não encontrado.' });
    res.json({ message: 'Deletado com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /expiring/soon — EPIs vencendo nos próximos 30 dias
router.get('/expiring/soon', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const today = new Date().toISOString().split('T')[0];
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const records = await EpiControl.find({
      schoolId,
      isActive: true,
      expirationDate: { $gte: today, $lte: in30 },
    }).sort({ expirationDate: 1 });

    res.json(records);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
