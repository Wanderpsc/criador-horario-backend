# Sistema de Aprovação de Escolas

## 📋 Resumo
Implementado sistema completo de aprovação onde escolas **só podem fazer login após aprovação do administrador**.

---

## 🔒 Fluxo de Cadastro e Aprovação

### 1️⃣ **Cadastro da Escola**
- Escola preenche formulário em `/register-school`
- Sistema cria conta com status: `registrationStatus: 'pending'` e `approvedByAdmin: false`
- Mensagem exibida: *"Cadastro realizado! Complete o pagamento e aguarde a aprovação do administrador."*
- Redireciona para `/payment-checkout?plan=basico` ou `profissional`

### 2️⃣ **Tentativa de Login (BLOQUEADA)**
Escola tenta fazer login mas recebe mensagens de erro específicas:

**Status: Pending (Aguardando Aprovação)**
```
❌ "Sua conta está aguardando aprovação do administrador. 
   Você receberá um email quando sua licença for liberada."
```

**Status: Rejected (Cadastro Rejeitado)**
```
❌ "Sua solicitação de cadastro foi rejeitada. 
   Entre em contato com o administrador."
```

**Status: Suspended (Conta Suspensa)**
```
❌ "Sua conta foi suspensa. 
   Entre em contato com o administrador."
```

### 3️⃣ **Aprovação pelo Administrador**
Admin acessa painel e aprova a escola através da rota:
```
PUT /api/admin/schools/:id/approve
```

Dados atualizados:
- `approvedByAdmin: true`
- `isActive: true`
- `registrationStatus: 'approved'`
- `paymentStatus: 'paid'`
- `licenseExpiryDate: Date`
- `maxUsers: 50` (ou personalizado)

**Email automático** é enviado para a escola confirmando aprovação.

### 4️⃣ **Login Liberado** ✅
Após aprovação, escola pode fazer login normalmente.

---

## 🛠️ Rotas Admin Implementadas

### **Aprovar Escola**
```http
PUT /api/admin/schools/:id/approve
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "licenseExpiryDate": "2026-12-31",
  "maxUsers": 50,
  "adminNotes": "Pagamento confirmado via PIX"
}
```

### **Rejeitar Cadastro**
```http
PATCH /api/admin/schools/:id/reject
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "adminNotes": "Dados bancários inválidos"
}
```

### **Suspender Escola**
```http
PATCH /api/admin/schools/:id/suspend
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "adminNotes": "Inadimplência - 30 dias sem pagamento"
}
```

### **Reativar Escola**
```http
PATCH /api/admin/schools/:id/reactivate
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "adminNotes": "Pagamento regularizado"
}
```

---

## 📊 Status da Conta

| Campo | Valores | Descrição |
|-------|---------|-----------|
| `registrationStatus` | `pending`, `approved`, `rejected`, `suspended` | Status do cadastro |
| `approvedByAdmin` | `true`, `false` | Se foi aprovada pelo admin |
| `isActive` | `true`, `false` | Se a conta está ativa |
| `paymentStatus` | `pending`, `paid`, `expired`, `cancelled` | Status do pagamento |

### Regras de Login
✅ **Permitido quando:**
- `approvedByAdmin === true`
- `registrationStatus === 'approved'`
- `isActive === true`

❌ **Bloqueado quando:**
- `approvedByAdmin === false` (pending)
- `registrationStatus === 'rejected'`
- `registrationStatus === 'suspended'`

---

## 🔐 Verificações no Backend

### Login (`auth.routes.ts`)
```typescript
// Bloqueia escola não aprovada
if (user.role === 'school' && !user.approvedByAdmin) {
  return res.status(403).json({ 
    message: 'Aguardando aprovação do administrador...',
    status: 'pending_approval'
  });
}

// Bloqueia conta suspensa
if (user.registrationStatus === 'suspended') {
  return res.status(403).json({ 
    message: 'Conta suspensa. Contate o administrador.',
    status: 'suspended'
  });
}

// Bloqueia cadastro rejeitado
if (user.registrationStatus === 'rejected') {
  return res.status(403).json({ 
    message: 'Cadastro rejeitado. Contate o administrador.',
    status: 'rejected'
  });
}
```

---

## 🎨 Frontend

### Login (`Login.tsx`)
Tratamento especial para status 403:
```typescript
if (error.response?.status === 403) {
  const data = error.response?.data;
  
  if (data?.status === 'pending_approval') {
    toast.error(data.message, { duration: 6000 });
  } else if (data?.status === 'suspended') {
    toast.error(data.message, { duration: 6000 });
  } else if (data?.status === 'rejected') {
    toast.error(data.message, { duration: 6000 });
  }
}
```

### Registro (`SchoolRegister.tsx`)
Mensagem clara após cadastro:
```typescript
toast.success(
  'Cadastro realizado! Complete o pagamento e aguarde a aprovação.', 
  { duration: 6000 }
);
```

---

## 🔄 Processo Completo

```
┌─────────────────┐
│ Escola cadastra │
│ no formulário   │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Status: PENDING     │
│ approvedByAdmin: ❌ │
└────────┬────────────┘
         │
         ▼
┌──────────────────────┐
│ Redireciona para     │
│ PaymentCheckout      │
│ (PIX/Cartão)         │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Escola tenta login   │
│ ❌ BLOQUEADO         │
│ "Aguardando          │
│  aprovação..."       │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Admin recebe         │
│ solicitação          │
│ (Dashboard)          │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Admin verifica       │
│ pagamento e aprova   │
│ PUT /approve         │
└────────┬─────────────┘
         │
         ▼
┌─────────────────────┐
│ Status: APPROVED    │
│ approvedByAdmin: ✅ │
│ Email enviado 📧    │
└────────┬────────────┘
         │
         ▼
┌──────────────────────┐
│ Escola pode fazer    │
│ login ✅             │
│ Acesso liberado      │
└──────────────────────┘
```

---

## 🎯 Benefícios

✅ **Controle Total**: Admin decide quem pode acessar  
✅ **Segurança**: Evita acessos não autorizados  
✅ **Validação de Pagamento**: Confirma pagamento antes de liberar  
✅ **Gestão Flexível**: Suspender/reativar quando necessário  
✅ **Feedback Clear**: Mensagens específicas para cada situação  
✅ **Auditoria**: Campo `adminNotes` para observações

---

## 📝 Observações

- **Admin sempre tem acesso**: Verificação apenas para `role === 'school'`
- **Email automático**: Enviado após aprovação (requer SMTP configurado)
- **Dados preservados**: Escola cadastrada permanece no banco aguardando aprovação
- **Reversível**: Admin pode suspender e reativar escolas

---

## 🔗 Arquivos Modificados

### Backend
- `backend/src/routes/auth.routes.ts` - Bloqueio de login
- `backend/src/routes/admin-schools.routes.ts` - Rotas de aprovação/suspensão/reativação
- `backend/src/models/User.ts` - Campos de status já existiam

### Frontend
- `frontend/src/pages/Login.tsx` - Tratamento de erros 403
- `frontend/src/pages/SchoolRegister.tsx` - Mensagem após cadastro

---

**© 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com**
