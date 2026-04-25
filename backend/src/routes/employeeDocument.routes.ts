import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import EmployeeDocument from '../models/EmployeeDocument';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Tipos MIME aceitos (imagens e PDF)
const ALLOWED_MIME = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
  'application/pdf',
];

// Limite: 10 MB por arquivo
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido. Use imagens (JPG, PNG, GIF, WEBP) ou PDF.'));
  },
});

const isValidId = (id: string) => mongoose.isValidObjectId(id);

// ─────────────────────────────────────────────────────────────────────────────
// GET /:employeeId — listar documentos de um funcionário (sem conteúdo base64)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:employeeId', auth, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.employeeId))
      return res.status(400).json({ message: 'ID inválido.' });

    const schoolId = req.user!.schoolId || req.user!.id;
    // Retorna metadados sem o campo `data` (select: false no schema)
    const docs = await EmployeeDocument.find(
      { employeeId: req.params.employeeId, schoolId },
      { data: 0 }
    ).sort({ createdAt: -1 });

    res.json(docs);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /:employeeId/:docId/download — baixar/visualizar um documento
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:employeeId/:docId/download', auth, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.employeeId) || !isValidId(req.params.docId))
      return res.status(400).json({ message: 'ID inválido.' });

    const schoolId = req.user!.schoolId || req.user!.id;
    // Forçar inclusão do campo `data` (select: false por padrão)
    const doc = await EmployeeDocument.findOne(
      { _id: req.params.docId, employeeId: req.params.employeeId, schoolId },
    ).select('+data');

    if (!doc) return res.status(404).json({ message: 'Documento não encontrado.' });

    const buffer = Buffer.from(doc.data, 'base64');
    res.set('Content-Type', doc.mimeType);
    res.set('Content-Disposition', `inline; filename="${encodeURIComponent(doc.filename)}"`);
    res.set('Content-Length', String(buffer.length));
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /:employeeId — fazer upload de um documento
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:employeeId', auth, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.employeeId))
      return res.status(400).json({ message: 'ID inválido.' });
    if (!req.file)
      return res.status(400).json({ message: 'Nenhum arquivo enviado.' });

    const schoolId = req.user!.schoolId || req.user!.id;
    const { type, description } = req.body;

    if (!type || !type.trim())
      return res.status(400).json({ message: 'Informe o tipo do documento.' });

    const doc = new EmployeeDocument({
      schoolId,
      employeeId: req.params.employeeId,
      type: type.trim(),
      description: description?.trim() || '',
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer.toString('base64'),
    });

    await doc.save();

    // Retornar sem o campo data
    const { data: _data, ...meta } = doc.toObject();
    res.status(201).json(meta);
  } catch (err: any) {
    if (err.code === 'LIMIT_FILE_SIZE')
      return res.status(413).json({ message: 'Arquivo muito grande. Limite: 10 MB.' });
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /:employeeId/:docId — atualizar tipo/descrição de um documento
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:employeeId/:docId', auth, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.employeeId) || !isValidId(req.params.docId))
      return res.status(400).json({ message: 'ID inválido.' });

    const schoolId = req.user!.schoolId || req.user!.id;
    const { type, description } = req.body;

    const doc = await EmployeeDocument.findOneAndUpdate(
      { _id: req.params.docId, employeeId: req.params.employeeId, schoolId },
      { $set: { ...(type && { type: type.trim() }), ...(description !== undefined && { description: description.trim() }) } },
      { new: true, select: '-data' }
    );

    if (!doc) return res.status(404).json({ message: 'Documento não encontrado.' });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /:employeeId/:docId — excluir documento
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:employeeId/:docId', auth, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.employeeId) || !isValidId(req.params.docId))
      return res.status(400).json({ message: 'ID inválido.' });

    const schoolId = req.user!.schoolId || req.user!.id;
    const doc = await EmployeeDocument.findOneAndDelete(
      { _id: req.params.docId, employeeId: req.params.employeeId, schoolId }
    );

    if (!doc) return res.status(404).json({ message: 'Documento não encontrado.' });
    res.json({ message: 'Documento excluído.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
