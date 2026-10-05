import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { auth, AuthRequest } from '../middleware/auth';
import MedicalCertificate from '../models/MedicalCertificate';
import Employee from '../models/Employee';
import Teacher from '../models/Teacher';
import {
  CertificateValidationError, certificatePeriod, cid10Catalog, dateOnly, integer, normalizeCids, text,
} from '../utils/medicalCertificate';

const router = Router();
type Action = 'read' | 'create' | 'update' | 'delete';

function authorize(action: Action) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user || (!user.schoolId && user.role !== 'school')) {
      return res.status(403).json({ message: 'Acesso exclusivo à gestão da escola.' });
    }
    const owner = user.role === 'school' || (user.role === 'admin' && !!user.schoolId);
    const permission = user.permissions?.medicalCertificates;
    if (!owner && (!permission?.access || !permission?.[action])) {
      return res.status(403).json({ message: 'Sem permissão para dados sensíveis de atestados.' });
    }
    next();
  };
}

function schoolId(req: AuthRequest): string {
  return req.user!.schoolId || req.user!.id;
}

router.use(auth);
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

router.get('/catalog', authorize('read'), (_req, res) => {
  res.json(cid10Catalog);
});

router.get('/people', authorize('read'), async (req: AuthRequest, res, next) => {
  try {
    const scope = schoolId(req);
    const [employees, teachers] = await Promise.all([
      Employee.find({ schoolId: scope, isActive: true }).select('name matricula').sort({ name: 1 }).lean(),
      Teacher.find({ $or: [{ schoolId: scope }, { userId: scope }], isActive: true })
        .select('name registration').sort({ name: 1 }).lean(),
    ]);
    res.json({
      employees: employees.map(p => ({ id: String(p._id), name: p.name, registration: p.matricula || '' })),
      teachers: teachers.map(p => ({ id: String(p._id), name: p.name, registration: p.registration || '' })),
    });
  } catch (error) { next(error); }
});

router.get('/', authorize('read'), async (req: AuthRequest, res, next) => {
  try {
    res.json(await MedicalCertificate.find({ schoolId: schoolId(req) }).sort({ startDate: -1 }).lean());
  } catch (error) { next(error); }
});

async function payload(req: AuthRequest) {
  const body = req.body;
  if (!body || !['employee', 'teacher', 'student'].includes(body.personType)) {
    throw new CertificateValidationError('Tipo de pessoa inválido.');
  }
  const personType: 'employee' | 'teacher' | 'student' = body.personType;
  const personId = personType === 'student' ? '' : text(body.personId, 'Pessoa', 24, true);
  let personName = text(body.personName, 'Nome', 200, personType === 'student');
  let registration = text(body.registration, 'Matrícula');
  if (personType !== 'student') {
    if (!mongoose.isValidObjectId(personId)) throw new CertificateValidationError('Pessoa inválida.');
    const scope = schoolId(req);
    if (personType === 'employee') {
      const person = await Employee.findOne({ _id: personId, schoolId: scope });
      if (!person) throw new CertificateValidationError('Funcionário não encontrado nesta escola.');
      personName = person.name;
      registration = person.matricula || '';
    } else {
      const person = await Teacher.findOne({ _id: personId, $or: [{ schoolId: scope }, { userId: scope }] });
      if (!person) throw new CertificateValidationError('Professor não encontrado nesta escola.');
      personName = person.name;
      registration = person.registration || '';
    }
  }
  const deliveredAt = dateOnly(body.deliveredAt, 'Entrega');
  const issuedAt = dateOnly(body.issuedAt, 'Emissão');
  const startDate = dateOnly(body.startDate, 'Início');
  if (deliveredAt < issuedAt) throw new CertificateValidationError('A entrega não pode anteceder a emissão.');
  const days = integer(body.days, 'Dias de afastamento', 1, 3650);
  const period = certificatePeriod(startDate, days);
  const returnedAt = body.returnedAt ? dateOnly(body.returnedAt, 'Retorno efetivo') : '';
  if (returnedAt && returnedAt < startDate) throw new CertificateValidationError('Retorno anterior ao afastamento.');
  const makeupDays = integer(body.makeupDays, 'Dias de reposição', 0, days);
  const madeUpDays = integer(body.madeUpDays, 'Dias repostos', 0, makeupDays);
  const makeupReason = text(body.makeupReason, 'Justificativa da reposição', 1000, makeupDays > 0);
  return {
    personType, personId, personName, registration,
    className: personType === 'student' ? text(body.className, 'Turma') : '',
    deliveredAt, issuedAt, startDate, days, ...period, returnedAt,
    cids: normalizeCids(body.cids),
    doctorName: text(body.doctorName, 'Médico'),
    doctorRegistration: text(body.doctorRegistration, 'CRM/UF', 80),
    hospital: text(body.hospital, 'Hospital ou unidade emissora'),
    documentReference: text(body.documentReference, 'Referência do documento'),
    alertDays: integer(body.alertDays, 'Antecedência do alerta', 0, 30),
    makeupDays, madeUpDays, makeupReason,
    notes: text(body.notes, 'Observações', 2000),
    updatedBy: req.user!.id,
  };
}

router.post('/', authorize('create'), async (req: AuthRequest, res, next) => {
  try {
    const data = await payload(req);
    res.status(201).json(await MedicalCertificate.create({
      ...data, schoolId: schoolId(req), createdBy: req.user!.id,
    }));
  } catch (error) { next(error); }
});

router.put('/:id', authorize('update'), async (req: AuthRequest, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new CertificateValidationError('ID inválido.');
    const data = await payload(req);
    const result = await MedicalCertificate.findOneAndUpdate(
      { _id: req.params.id, schoolId: schoolId(req) }, { $set: data }, { new: true, runValidators: true },
    );
    if (!result) return res.status(404).json({ message: 'Atestado não encontrado.' });
    res.json(result);
  } catch (error) { next(error); }
});

router.delete('/:id', authorize('delete'), async (req: AuthRequest, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new CertificateValidationError('ID inválido.');
    const result = await MedicalCertificate.findOneAndDelete({ _id: req.params.id, schoolId: schoolId(req) });
    if (!result) return res.status(404).json({ message: 'Atestado não encontrado.' });
    res.json({ message: 'Atestado excluído.' });
  } catch (error) { next(error); }
});

export default router;
