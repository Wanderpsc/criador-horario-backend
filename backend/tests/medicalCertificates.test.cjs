const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json') });
const express = require('express');
const utils = require('../src/utils/medicalCertificate');
const front = require('../../frontend/src/utils/medicalCertificates');

test('contagem inclusiva, virada de mês, ano e ano bissexto', () => {
  assert.deepEqual(utils.certificatePeriod('2026-10-05', 1), { endDate: '2026-10-05', returnDate: '2026-10-06' });
  assert.deepEqual(utils.certificatePeriod('2024-02-28', 2), { endDate: '2024-02-29', returnDate: '2024-03-01' });
  assert.deepEqual(utils.certificatePeriod('2026-12-31', 2), { endDate: '2027-01-01', returnDate: '2027-01-02' });
  assert.deepEqual(utils.certificatePeriod('2026-10-09', 1), { endDate: '2026-10-09', returnDate: '2026-10-10' });
});

test('rejeita datas impossíveis e dias inválidos', () => {
  for (const value of ['2026-02-29', '2026-02-30', '05/10/2026', '', null, '2026-13-01']) {
    assert.throws(() => utils.dateOnly(value, 'Data'), utils.CertificateValidationError);
  }
  for (const value of [0, -1, 1.5, '2', null, 3651, NaN]) {
    assert.throws(() => utils.integer(value, 'Dias', 1, 3650), utils.CertificateValidationError);
  }
  assert.equal(utils.dateOnly('2024-02-29', 'Data'), '2024-02-29');
});

test('CID opcional, normalização e códigos não catalogados sem inferência', () => {
  assert.deepEqual(utils.normalizeCids([]), []);
  assert.deepEqual(utils.normalizeCids(['j06.9', ' J06.9 ', 'R51']), ['J06.9', 'R51']);
  assert.deepEqual(utils.normalizeCids(['A00.0']), ['A00.0']);
  assert.equal(utils.cid10Catalog['A00.0'], undefined);
  assert.throws(() => utils.normalizeCids(['inválido']));
  assert.throws(() => utils.normalizeCids(Array(11).fill('R51')));
});

test('alertas no limite, vencimento, confirmação e início futuro', () => {
  const r = { startDate: '2026-10-05', returnDate: '2026-10-10', returnedAt: '', alertDays: 2 };
  assert.equal(front.certificateStatus(r, '2026-10-07').key, 'active');
  assert.equal(front.certificateStatus(r, '2026-10-08').key, 'soon');
  assert.equal(front.certificateStatus(r, '2026-10-10').key, 'today');
  assert.equal(front.certificateStatus(r, '2026-10-11').key, 'overdue');
  assert.equal(front.certificateStatus(r, '2026-10-04').key, 'planned');
  assert.equal(front.certificateStatus({ ...r, returnedAt: '2026-10-10' }, '2026-10-11').key, 'returned');
});

test('dados sensíveis exigem acesso e leitura; permissões por ação', () => {
  assert.equal(front.canUseCertificates(null), false);
  assert.equal(front.canUseCertificates({ role: 'school' }), true);
  assert.equal(front.canUseCertificates({ role: 'admin' }), false);
  const user = { role: 'user', schoolId: 'escola', permissions: { medicalCertificates: { access: true, read: true } } };
  assert.equal(front.canUseCertificates(user), true);
  assert.equal(front.canUseCertificates(user, 'update'), false);
  assert.equal(front.canUseCertificates({ ...user, permissions: {} }), false);
  assert.equal(front.canUseCertificates({ ...user, role: 'admin' }), true);
});

const authModule = require('../src/middleware/auth');
const originalAuth = authModule.auth;
const school = '507f1f77bcf86cd799439011';
let actor = { id: school, role: 'school', schoolId: school };
authModule.auth = (req, _res, next) => { req.user = actor; next(); };
const router = require('../src/routes/medicalCertificate.routes').default;
authModule.auth = originalAuth;
const Certificate = require('../src/models/MedicalCertificate').default;
const Employee = require('../src/models/Employee').default;
const Teacher = require('../src/models/Teacher').default;
const originals = { find: Certificate.find, create: Certificate.create, update: Certificate.findOneAndUpdate, remove: Certificate.findOneAndDelete, employee: Employee.findOne, teacher: Teacher.findOne };
let server;
let base;
before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/certificates', router);
  app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ message: err.message }));
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}/certificates`;
});
after(async () => {
  Certificate.find = originals.find;
  Certificate.create = originals.create;
  Certificate.findOneAndUpdate = originals.update;
  Certificate.findOneAndDelete = originals.remove;
  Employee.findOne = originals.employee;
  Teacher.findOne = originals.teacher;
  await new Promise(resolve => server.close(resolve));
});
const body = () => ({
  personType: 'student', personName: 'Aluno de teste', registration: 'A-001', className: '6 A',
  deliveredAt: '2026-10-05', issuedAt: '2026-10-05', startDate: '2026-10-05', days: 3,
  alertDays: 2, cids: [], makeupDays: 0, madeUpDays: 0, returnedAt: '',
});
async function request(method, route = '', data) {
  return fetch(base + route, {
    method, headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined,
  });
}

test('API: leitura isolada por escola e sem cache', async () => {
  Certificate.find = filter => {
    assert.deepEqual(filter, { schoolId: school });
    return { sort: () => ({ lean: async () => [] }) };
  };
  const response = await request('GET');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), []);
});

test('API: nega usuário sem permissão e escrita a usuário somente leitura', async () => {
  actor = { id: 'user', role: 'user', schoolId: school };
  assert.equal((await request('GET')).status, 403);
  actor.permissions = { medicalCertificates: { access: true, read: true } };
  assert.equal((await request('POST', '', body())).status, 403);
  assert.equal((await request('PUT', '/' + school, body())).status, 403);
  assert.equal((await request('DELETE', '/' + school)).status, 403);
  actor = { id: school, role: 'school', schoolId: school };
});

test('API: ignora schoolId e campos derivados enviados pelo cliente', async () => {
  Certificate.create = async data => data;
  const response = await request('POST', '', { ...body(), schoolId: 'outra', endDate: '2099-01-01', returnDate: '2099-01-02', createdBy: 'intruso' });
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.schoolId, school);
  assert.equal(result.createdBy, school);
  assert.equal(result.endDate, '2026-10-07');
  assert.equal(result.returnDate, '2026-10-08');
  assert.equal(result.makeupDays, 0);
});

test('API: valida entrega, retorno, saldo e justificativa de reposição', async () => {
  for (const extra of [
    { deliveredAt: '2026-10-04' }, { returnedAt: '2026-10-04' },
    { days: 0 }, { madeUpDays: 1 }, { makeupDays: 4 },
    { makeupDays: 1, makeupReason: '' }, { cids: ['??'] },
  ]) {
    const response = await request('POST', '', { ...body(), ...extra });
    assert.equal(response.status, 400, JSON.stringify(extra));
  }
  const response = await request('POST', '', { ...body(), makeupDays: 2, madeUpDays: 1, makeupReason: 'Reposição autorizada pela gestão' });
  assert.equal(response.status, 201);
});

test('API: rejeita vínculo de funcionário de outra escola', async () => {
  Employee.findOne = async filter => {
    assert.equal(filter.schoolId, school);
    return null;
  };
  const response = await request('POST', '', { ...body(), personType: 'employee', personId: school });
  assert.equal(response.status, 400);
});

test('API: nomes e matrículas de funcionários e professores vêm do cadastro da escola', async () => {
  Employee.findOne = async filter => {
    assert.equal(filter.schoolId, school);
    return { name: 'Funcionário cadastrado', matricula: 'F001' };
  };
  Teacher.findOne = async filter => {
    assert.deepEqual(filter.$or, [{ schoolId: school }, { userId: school }]);
    return { name: 'Professor cadastrado', registration: 'P001' };
  };
  for (const [personType, name, registration] of [
    ['employee', 'Funcionário cadastrado', 'F001'], ['teacher', 'Professor cadastrado', 'P001'],
  ]) {
    const response = await request('POST', '', { ...body(), personType, personId: school, personName: 'Nome adulterado', registration: 'adulterada' });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.personName, name);
    assert.equal(result.registration, registration);
    assert.equal(result.personId, school);
    assert.equal(result.className, '');
  }
});

test('API: edição/exclusão isoladas e registro inexistente retorna 404', async () => {
  Certificate.findOneAndUpdate = async (filter, update) => {
    assert.deepEqual(filter, { _id: school, schoolId: school });
    assert.equal(update.$set.returnDate, '2026-10-08');
    assert.equal(update.$set.schoolId, undefined);
    return null;
  };
  Certificate.findOneAndDelete = async filter => {
    assert.deepEqual(filter, { _id: school, schoolId: school });
    return null;
  };
  assert.equal((await request('PUT', '/' + school, body())).status, 404);
  assert.equal((await request('DELETE', '/' + school)).status, 404);
  assert.equal((await request('DELETE', '/invalid')).status, 400);
});
