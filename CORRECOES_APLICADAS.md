# 🔧 CORREÇÕES DE SEGURANÇA APLICADAS
**Data**: 04/02/2025  
**Sistema**: Criador de Horário de Aula Escolar

---

## ✅ FASE 1 - CORREÇÕES CRÍTICAS APLICADAS

### 1. **emergencySchedule.routes.ts** - 5 rotas corrigidas

#### ✅ **Rota GET /by-date**
**ANTES:**
```typescript
router.get('/by-date', async (req, res) => {
  const query: any = {};  // ❌ Sem filtro por escola
  const schedules = await EmergencySchedule.find(query);
}
```

**DEPOIS:**
```typescript
router.get('/by-date', auth, async (req, res) => {  // ✅ Auth adicionado
  const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
  const query: any = { school: schoolId };  // ✅ Filtro por escola
  const schedules = await EmergencySchedule.find(query);
}
```

---

#### ✅ **Rota GET /debts/:teacherId**
**ANTES:**
```typescript
router.get('/debts/:teacherId', async (req, res) => {
  // ❌ Qualquer pessoa pode ver débitos de qualquer professor
  const debts = await TeacherDebtRecord.find({ teacherId });
}
```

**DEPOIS:**
```typescript
router.get('/debts/:teacherId', auth, async (req, res) => {  // ✅ Auth adicionado
  const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
  
  // ✅ Verificar se professor pertence à escola
  const teacher = await Teacher.findOne({ _id: teacherId, school: schoolId });
  if (!teacher) {
    return res.status(404).json({ message: 'Professor não encontrado' });
  }
  
  const debts = await TeacherDebtRecord.find({ teacherId });
}
```

---

#### ✅ **Rota PATCH /debts/:debtId/pay**
**ANTES:**
```typescript
router.patch('/debts/:debtId/pay', async (req, res) => {
  // ❌ Qualquer pessoa pode marcar débito como pago
  const debt = await TeacherDebtRecord.findById(debtId);
  debt.hoursPaid += hoursPaid;
  await debt.save();
}
```

**DEPOIS:**
```typescript
router.patch('/debts/:debtId/pay', auth, async (req, res) => {  // ✅ Auth
  const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
  const debt = await TeacherDebtRecord.findById(debtId);
  
  // ✅ Verificar propriedade da escola
  const teacher = await Teacher.findOne({ _id: debt.teacherId, school: schoolId });
  if (!teacher) {
    return res.status(403).json({ message: 'Acesso negado' });
  }
  
  debt.hoursPaid += hoursPaid;
  await debt.save();
}
```

---

#### ✅ **Rota DELETE /:id**
**ANTES:**
```typescript
router.delete('/:id', async (req, res) => {
  // ❌ Qualquer pessoa pode deletar horário emergencial
  await EmergencySchedule.findByIdAndDelete(id);
}
```

**DEPOIS:**
```typescript
router.delete('/:id', auth, async (req, res) => {  // ✅ Auth
  const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
  
  // ✅ Verificar propriedade antes de deletar
  const schedule = await EmergencySchedule.findOne({ _id: id, school: schoolId });
  if (!schedule) {
    return res.status(404).json({ message: 'Não encontrado ou acesso negado' });
  }
  
  await EmergencySchedule.findByIdAndDelete(id);
}
```

---

#### ✅ **Rota POST /teacher-debts/:teacherId/pay**
**ANTES:**
```typescript
router.post('/teacher-debts/:teacherId/pay', async (req, res) => {
  // ❌ Qualquer pessoa pode dar baixa em débitos
  const debts = await TeacherDebtRecord.find({ teacherId, isPaid: false });
}
```

**DEPOIS:**
```typescript
router.post('/teacher-debts/:teacherId/pay', auth, async (req, res) => {  // ✅ Auth
  const schoolId = (req as any).user?.schoolId || (req as any).user?.id;
  
  // ✅ Verificar se professor pertence à escola
  const teacher = await Teacher.findOne({ _id: teacherId, school: schoolId });
  if (!teacher) {
    return res.status(404).json({ message: 'Professor não encontrado' });
  }
  
  const debts = await TeacherDebtRecord.find({ teacherId, isPaid: false });
}
```

---

### 2. **GeneratedTimetable.ts (Model)** - Campo `school` adicionado

**ANTES:**
```typescript
const generatedTimetableSchema = new mongoose.Schema({
  scheduleId: { type: String, required: true },
  classId: { type: String, required: true },
  slots: [timetableSlotSchema],
  title: { type: String, required: true },
  userId: { type: String, required: false }
  // ❌ SEM campo school
});
```

**DEPOIS:**
```typescript
const generatedTimetableSchema = new mongoose.Schema({
  scheduleId: { type: String, required: true },
  classId: { type: String, required: true },
  slots: [timetableSlotSchema],
  title: { type: String, required: true },
  userId: { type: String, required: false },
  school: {                     // ✅ Campo adicionado
    type: String, 
    required: false,            // Opcional para dados antigos
    index: true                 // ✅ Indexado para performance
  }
});
```

---

### 3. **generatedTimetable.routes.ts** - Rota POST / corrigida

**ANTES:**
```typescript
router.post('/', async (req, res) => {
  // ❌ Sem autenticação
  // ❌ Sem schoolId
  const { scheduleId, timetables, title } = req.body;
  
  await GeneratedTimetable.deleteMany({ scheduleId, title });  // ❌ Deleta de TODAS escolas
  
  const timetable = new GeneratedTimetable({
    scheduleId,
    classId,
    slots,
    title  // ❌ Sem school
  });
  await timetable.save();
}
```

**DEPOIS:**
```typescript
router.post('/', auth, async (req: AuthRequest, res) => {  // ✅ Auth
  const schoolId = req.user?.schoolId || req.user?.id;      // ✅ Extrair schoolId
  const { scheduleId, timetables, title } = req.body;
  
  // ✅ Deletar APENAS da escola do usuário
  await GeneratedTimetable.deleteMany({ 
    scheduleId, 
    title,
    school: schoolId  // ✅ Filtro por escola
  });
  
  const timetable = new GeneratedTimetable({
    scheduleId,
    classId,
    slots,
    title,
    school: schoolId  // ✅ Associar à escola
  });
  await timetable.save();
}
```

---

## 🔄 PRÓXIMAS CORREÇÕES NECESSÁRIAS

### **generatedTimetable.routes.ts** - 10 rotas restantes

#### ❌ **Rotas que precisam de correção:**

1. `GET /list/:scheduleId` (linha 79) - ❌ Sem auth
2. `GET /all` (linha 116) - ❌ **CRÍTICO** - Retorna dados de TODAS escolas
3. `GET /by-class/:classId` (linha 285) - ❌ Sem auth
4. `GET /metadata` (linha 336) - ❌ Sem auth
5. `GET /full/:id` (linha 425) - ❌ Sem auth
6. `GET /:scheduleId` (linha 523) - ❌ Sem auth
7. `PUT /:scheduleId/:classId` (linha 599) - ❌ Sem auth
8. `DELETE /:scheduleId` (linha 644) - ❌ Sem auth
9. `DELETE /:scheduleId/by-title/:title` (linha 699) - ❌ Sem auth
10. `GET /:scheduleId/by-title/:title` (linha 720) - ❌ Sem auth

---

## 📋 CHECKLIST DE CORREÇÕES

### ✅ **CONCLUÍDO:**
- [x] Auditoria completa do sistema
- [x] Relatório de vulnerabilidades gerado
- [x] emergencySchedule.routes.ts - 5 rotas corrigidas
- [x] GeneratedTimetable model - campo `school` adicionado
- [x] generatedTimetable.routes.ts - POST / corrigida

### ⏳ **PENDENTE (URGENTE):**
- [ ] generatedTimetable.routes.ts - Todas as rotas GET/PUT/DELETE
- [ ] Remover console.logs de produção (150+ ocorrências)
- [ ] Remover middleware de debug (server.ts linhas 163-171)
- [ ] Criar utilitário de log condicional
- [ ] Testar isolamento entre escolas
- [ ] Testar sistema de pagamento end-to-end

### 🔄 **RECOMENDADO (IMPORTANTE):**
- [ ] Implementar logger estruturado (Winston/Pino)
- [ ] Adicionar rate limiting
- [ ] Validar assinatura no webhook Mercado Pago
- [ ] Criar testes automatizados de segurança
- [ ] Configurar monitoramento de erros (Sentry)

---

## 🎯 SCRIPT DE CORREÇÃO RÁPIDA

Para corrigir as rotas restantes de `generatedTimetable.routes.ts`:

### **Padrão a seguir:**

```typescript
// ❌ ANTES
router.get('/rota', async (req, res) => {
  const data = await GeneratedTimetable.find({});  // Sem filtro
})

// ✅ DEPOIS
router.get('/rota', auth, async (req: AuthRequest, res) => {
  const schoolId = req.user?.schoolId || req.user?.id;
  const data = await GeneratedTimetable.find({ school: schoolId });  // Com filtro
})
```

### **Para rotas com parâmetros:**

```typescript
// ❌ ANTES
router.get('/:id', async (req, res) => {
  const doc = await GeneratedTimetable.findById(id);
})

// ✅ DEPOIS
router.get('/:id', auth, async (req: AuthRequest, res) => {
  const schoolId = req.user?.schoolId || req.user?.id;
  const doc = await GeneratedTimetable.findOne({ _id: id, school: schoolId });
  if (!doc) {
    return res.status(404).json({ message: 'Não encontrado ou acesso negado' });
  }
})
```

---

## 📊 IMPACTO DAS CORREÇÕES

### **Antes:**
- ❌ 16 rotas públicas sem autenticação
- ❌ Vazamento de dados entre escolas
- ❌ Qualquer pessoa podia ver/editar/deletar dados
- ❌ 0% de isolamento de dados

### **Depois (Parcial - 6 rotas):**
- ✅ 6 rotas protegidas com autenticação
- ✅ Validação de propriedade por escola
- ✅ Isolamento de dados implementado
- ✅ ~40% das vulnerabilidades críticas corrigidas

### **Depois (Total - quando concluir):**
- ✅ 100% das rotas protegidas
- ✅ Isolamento total entre escolas
- ✅ Sistema apto para venda comercial
- ✅ Conformidade com LGPD

---

## ⏱️ TEMPO ESTIMADO RESTANTE

- **Correção rotas restantes**: 1-2 horas
- **Remoção de console.logs**: 1 hora
- **Testes de isolamento**: 30 minutos
- **Deploy e validação**: 30 minutos

**TOTAL**: 3-4 horas para sistema 100% seguro

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

1. ✅ **Corrigir rotas restantes de generatedTimetable.routes.ts**
2. ✅ **Criar utilitário de log condicional**
3. ✅ **Substituir todos console.log**
4. ✅ **Remover middleware de debug**
5. ✅ **Testar com 2 escolas diferentes**
6. ✅ **Build e deploy final**

---

© 2025 Wander Pires Silva Coelho  
E-mail: wanderpsc@gmail.com
