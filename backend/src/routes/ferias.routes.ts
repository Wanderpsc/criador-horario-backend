import express from 'express';
import mongoose from 'mongoose';
import Ferias from '../models/Ferias';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

const isValidId = (id: string) => mongoose.isValidObjectId(id);

// GET / — listar registros de férias da escola
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { employeeId, status, anoReferencia } = req.query;

    const filter: any = { schoolId };
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;
    if (anoReferencia) filter.anoReferencia = Number(anoReferencia);

    const ferias = await Ferias.find(filter).sort({ dataInicio: -1 });
    res.json(ferias);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /:id — buscar um registro
router.get('/:id', auth, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const schoolId = req.user!.schoolId || req.user!.id;
    const ferias = await Ferias.findOne({ _id: req.params.id, schoolId });
    if (!ferias) return res.status(404).json({ message: 'Registro não encontrado.' });
    res.json(ferias);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST / — criar registro de férias
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const ferias = new Ferias({ ...req.body, schoolId });
    await ferias.save();
    res.status(201).json(ferias);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /:id — atualizar registro
router.put('/:id', auth, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const schoolId = req.user!.schoolId || req.user!.id;
    const ferias = await Ferias.findOneAndUpdate(
      { _id: req.params.id, schoolId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!ferias) return res.status(404).json({ message: 'Registro não encontrado.' });
    res.json(ferias);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /:id — remover registro
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const schoolId = req.user!.schoolId || req.user!.id;
    const ferias = await Ferias.findOneAndDelete({ _id: req.params.id, schoolId });
    if (!ferias) return res.status(404).json({ message: 'Registro não encontrado.' });
    res.json({ message: 'Registro excluído.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
