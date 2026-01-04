# Sistema Completo de Licenças e Gerenciamento de Escolas

## ✅ IMPLEMENTADO E FUNCIONANDO

### Novos Endpoints API

Base URL: `https://criador-horario-backend.onrender.com/api/admin/schools`

Autenticação: Bearer token (role admin necessário)

---

### 1. **Listar Todas as Escolas**
```http
GET /api/admin/schools
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "695586f2f3c59edd521213c6",
      "email": "escola@exemplo.com",
      "schoolName": "Escola Exemplo",
      "isActive": true,
      "approvedByAdmin": true,
      "licenseExpiryDate": "2025-12-31T00:00:00.000Z",
      "maxUsers": 50,
      "paymentStatus": "paid",
      "createdAt": "2025-01-10T12:00:00.000Z",
      "schoolId": "695586f2f3c59edd521213c6"
    }
  ]
}
```

---

### 2. **Detalhes de uma Escola**
```http
GET /api/admin/schools/:id
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "695586f2f3c59edd521213c6",
    "email": "escola@exemplo.com",
    "schoolName": "Escola Exemplo",
    "cnpj": "12.345.678/0001-00",
    "phone": "(11) 98765-4321",
    "address": "Rua Exemplo, 123",
    "city": "São Paulo",
    "state": "SP",
    "isActive": true,
    "approvedByAdmin": true,
    "licenseExpiryDate": "2025-12-31T00:00:00.000Z",
    "maxUsers": 50,
    "paymentStatus": "paid",
    "credits": 100,
    "totalTimetablesGenerated": 5
  }
}
```

---

### 3. **Aprovar Escola e Ativar Licença**
```http
PUT /api/admin/schools/:id/approve
Content-Type: application/json

{
  "licenseExpiryDate": "2025-12-31",
  "maxUsers": 50
}
```

**Ações realizadas:**
- Define `approvedByAdmin = true`
- Define `isActive = true`
- Define `paymentStatus = 'paid'`
- Define data de validade da licença
- Define número máximo de usuários

**Resposta:**
```json
{
  "success": true,
  "message": "Escola aprovada e licença configurada com sucesso",
  "data": {
    "id": "695586f2f3c59edd521213c6",
    "email": "escola@exemplo.com",
    "schoolName": "Escola Exemplo",
    "isActive": true,
    "approvedByAdmin": true,
    "licenseExpiryDate": "2025-12-31T00:00:00.000Z",
    "maxUsers": 50,
    "paymentStatus": "paid"
  }
}
```

---

### 4. **Ativar/Desativar Escola**
```http
PUT /api/admin/schools/:id/toggle
```

**Ações:**
- Alterna o status `isActive` entre `true` e `false`
- Quando inativo, a escola não pode acessar o sistema

**Resposta:**
```json
{
  "success": true,
  "message": "Escola ativada com sucesso",
  "data": {
    "id": "695586f2f3c59edd521213c6",
    "isActive": true
  }
}
```

---

### 5. **Atualizar Licença**
```http
PUT /api/admin/schools/:id/license
Content-Type: application/json

{
  "licenseExpiryDate": "2026-12-31",
  "maxUsers": 100,
  "paymentStatus": "paid"
}
```

**Campos opcionais:**
- `licenseExpiryDate`: Nova data de validade
- `maxUsers`: Novo limite de usuários
- `paymentStatus`: 'pending', 'paid', 'expired', 'cancelled'

**Resposta:**
```json
{
  "success": true,
  "message": "Licença atualizada com sucesso",
  "data": {
    "id": "695586f2f3c59edd521213c6",
    "licenseExpiryDate": "2026-12-31T00:00:00.000Z",
    "maxUsers": 100,
    "paymentStatus": "paid"
  }
}
```

---

### 6. **Deletar Escola**
```http
DELETE /api/admin/schools/:id
```

**Resposta:**
```json
{
  "success": true,
  "message": "Escola deletada com sucesso"
}
```

---

### 7. **Estatísticas Gerais**
```http
GET /api/admin/schools/stats
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "totalSchools": 45,
    "activeSchools": 38,
    "inactiveSchools": 7,
    "pendingApproval": 12,
    "expiredLicenses": 3
  }
}
```

---

## Modelo de Dados Atualizado

### User Model - Campos de Licenciamento

```typescript
{
  // Licenciamento
  school: ObjectId,              // ID da escola (relacionamento)
  isActive: Boolean,             // Status ativo/inativo (default: true)
  licenseKey: String,            // Chave de licença
  selectedPlan: String,          // ID do plano selecionado
  paymentStatus: String,         // 'pending' | 'paid' | 'expired' | 'cancelled'
  approvedByAdmin: Boolean,      // Aprovado pelo admin (default: false)
  licenseExpiryDate: Date,       // Data de expiração da licença
  maxUsers: Number,              // Máximo de usuários (default: 1)
  
  // Créditos e uso
  credits: Number,               // Créditos disponíveis
  totalTimetablesGenerated: Number  // Total de horários gerados
}
```

---

## Fluxo de Trabalho Administrativo

### 1. Nova Escola se Registra
- Escola cria conta no sistema
- Status inicial: `approvedByAdmin = false`, `isActive = true`
- `paymentStatus = 'pending'`

### 2. Admin Aprova Escola
```
PUT /api/admin/schools/:id/approve
{
  "licenseExpiryDate": "2025-12-31",
  "maxUsers": 50
}
```
- Define validade da licença
- Define limite de usuários
- Marca como aprovado e pago

### 3. Gerenciamento Contínuo

**Renovação de Licença:**
```
PUT /api/admin/schools/:id/license
{
  "licenseExpiryDate": "2026-12-31",
  "paymentStatus": "paid"
}
```

**Suspensão Temporária:**
```
PUT /api/admin/schools/:id/toggle
```
Define `isActive = false` (escola não pode acessar)

**Reativação:**
```
PUT /api/admin/schools/:id/toggle
```
Define `isActive = true` (escola volta a ter acesso)

**Atualização de Plano:**
```
PUT /api/admin/schools/:id/license
{
  "maxUsers": 100,
  "paymentStatus": "paid"
}
```

---

## Códigos de Erro

### 400 Bad Request
- Data de validade não fornecida ao aprovar
- Dados inválidos no body

### 401 Unauthorized
- Token JWT não fornecido
- Token inválido ou expirado

### 403 Forbidden
- Usuário não é admin

### 404 Not Found
- Escola não encontrada com o ID fornecido

### 500 Internal Server Error
- Erro no servidor ou banco de dados

---

## Segurança

✅ Autenticação JWT obrigatória  
✅ Verificação de role admin  
✅ Validação de dados de entrada  
✅ Tratamento de erros robusto  
✅ Senhas não retornadas nas respostas  

---

## Deploy Atualizado

**Backend:** https://criador-horario-backend.onrender.com  
**Frontend:** https://criador-horario-aula.surge.sh  
**Banco:** MongoDB Atlas

**Último commit:** fd693bf - Sistema completo de gerenciamento de licenças

---

## Próximos Passos (Frontend)

Agora o backend está 100% funcional. Para completar o sistema, você pode:

1. **Criar página de gerenciamento de escolas** (`/admin/schools`)
2. **Tabela com lista de escolas** (com filtros)
3. **Botões de ação:** Aprovar, Ativar/Desativar, Renovar, Deletar
4. **Modal de aprovação** com campos de data e limite de usuários
5. **Dashboard com estatísticas** usando endpoint `/stats`

---

## Teste Rápido

```bash
# Login como admin
curl -X POST https://criador-horario-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@edusync-pro.com","password":"admin123"}'

# Listar escolas (use o token recebido)
curl https://criador-horario-backend.onrender.com/api/admin/schools \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## ✅ Sistema 100% Funcional e Sem Erros

Todas as funcionalidades solicitadas foram implementadas:
- ✅ Ativar/Desativar cadastros
- ✅ Gerenciamento de licenças
- ✅ Controle de prazos/validades
- ✅ Cobrança e status de pagamento
- ✅ API completa e documentada
- ✅ Compilação sem erros
- ✅ Deploy atualizado no Render

