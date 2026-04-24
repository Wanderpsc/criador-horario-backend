import express from 'express';
import mongoose from 'mongoose';
import Employee from '../models/Employee';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

const isValidId = (id: string) => mongoose.isValidObjectId(id);

// GET / — listar funcionários da escola
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const { search, setor, isActive } = req.query;

    const filter: any = { schoolId };
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (setor) filter.setor = setor;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { matricula: { $regex: search, $options: 'i' } },
        { cargo: { $regex: search, $options: 'i' } },
        { cpf: { $regex: search, $options: 'i' } },
      ];
    }

    const employees = await Employee.find(filter).sort({ name: 1 });
    res.json(employees);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /:id — buscar um funcionário
router.get('/:id', auth, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const schoolId = req.user!.schoolId || req.user!.id;
    const employee = await Employee.findOne({ _id: req.params.id, schoolId });
    if (!employee) return res.status(404).json({ message: 'Funcionário não encontrado.' });
    res.json(employee);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST / — cadastrar funcionário
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const employee = new Employee({ ...req.body, schoolId });
    await employee.save();
    res.status(201).json(employee);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /:id — atualizar funcionário
router.put('/:id', auth, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const schoolId = req.user!.schoolId || req.user!.id;
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, schoolId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!employee) return res.status(404).json({ message: 'Funcionário não encontrado.' });
    res.json(employee);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /:id — remover funcionário (soft delete via isActive)
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const schoolId = req.user!.schoolId || req.user!.id;
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, schoolId },
      { isActive: false },
      { new: true }
    );
    if (!employee) return res.status(404).json({ message: 'Funcionário não encontrado.' });
    res.json({ message: 'Funcionário desativado com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
