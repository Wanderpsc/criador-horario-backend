# 👥 SISTEMA DE ADMINISTRADORES - DOIS NÍVEIS

## 🎯 Entendendo os Dois Tipos de Administrador

### 1️⃣ **Super-Admin (Administrador do Sistema Geral)**
- **Quem é:** Wander (dono do sistema)
- **Email:** wanderpsc@gmail.com
- **Senha:** Wpsc2025@
- **Rota de login:** `/login` (rota principal)
- **Permissões:**
  - ✅ Gerenciar todas as escolas cadastradas
  - ✅ Aprovar novos clientes
  - ✅ Ver dashboard de vendas
  - ✅ Fazer backup do sistema
  - ✅ Acessar todas as funcionalidades admin
- **Tipo no banco:** `role: 'super-admin'` ou `role: 'admin'` na collection `users`

### 2️⃣ **Admin da Escola (Administrador Cliente)**
- **Quem é:** Diretor/Coordenador da escola que comprou o sistema
- **Exemplo - CETI:**
  - Email: escola@ceti.com
  - Senha: Ceti@2026
  - Escola: CETI - Centro de Educação
- **Rota de login:** `/school-user-login` ⚠️ **IMPORTANTE: Use esta rota!**
- **Permissões:**
  - ✅ Criar usuários da própria escola (secretários, coordenadores, etc.)
  - ✅ Gerenciar professores, turmas, disciplinas da escola
  - ✅ Gerar horários
  - ✅ Acessar settings e criar novos usuários
  - ❌ NÃO pode ver dados de outras escolas
- **Tipo no banco:** `role: 'admin'` na collection `schoolusers`

---

## 🔐 COMO FAZER LOGIN

### Para Admin da Escola CETI (escola@ceti.com):

1. **Acesse a rota correta:**
   ```
   https://wanderpsc.github.io/criador-horario-backend/school-user-login
   ```
   ⚠️ **NÃO use `/login` - essa é para o super-admin!**

2. **Credenciais:**
   - Email: `escola@ceti.com`
   - Senha: `Ceti@2026`

3. **Após o login:**
   - ✅ Você verá o dashboard da escola CETI
   - ✅ Pode criar usuários em Settings
   - ✅ Botão "Novo Usuário" estará visível (porque você é admin)

### Para Super-Admin (wanderpsc@gmail.com):

1. **Acesse:**
   ```
   https://wanderpsc.github.io/criador-horario-backend/login
   ```

2. **Credenciais:**
   - Email: `wanderpsc@gmail.com`
   - Senha: `Wpsc2025@`

---

## 📊 ESTRUTURA DO BANCO DE DADOS

### Collection: `users`
```javascript
{
  email: "escola@ceti.com",
  role: "school",  // Cliente que comprou o sistema
  schoolName: "CETI - Centro de Educação"
}
```

### Collection: `schoolusers`
```javascript
{
  email: "escola@ceti.com",
  role: "admin",  // Admin da escola CETI
  schoolId: ObjectId("..."),  // Referência para a escola em 'users'
  permissions: { /* todas as permissões */ }
}
```

---

## ✅ VERIFICAÇÃO - Como Saber Se Está Funcionando

### Depois de fazer login com escola@ceti.com:

1. **Vá para Settings:**
   ```
   /settings
   ```

2. **O que você DEVE ver:**
   - ✅ Botão "Novo Usuário" no canto superior direito
   - ✅ Lista de usuários da escola
   - ✅ Pode criar novos usuários

3. **O que NÃO deve aparecer:**
   - ❌ Alerta amarelo dizendo "Apenas administradores podem criar usuários"
   - ❌ Botão "Novo Usuário" escondido

### Se o botão não aparecer:

Execute novamente o script:
```bash
cd backend
npx ts-node scripts/ensure-ceti-admin.ts
```

---

## 🔄 CRIANDO USUÁRIOS DA ESCOLA

Após fazer login como **escola@ceti.com**:

1. Vá em **Settings** (`/settings`)
2. Clique em **"Novo Usuário"**
3. Preencha:
   - **Nome:** Ex: "João Silva"
   - **Email:** Ex: "joao@ceti.com"
   - **Senha:** Ex: "Joao@123"
   - **Tipo:** 
     - **Administrador:** Pode criar outros usuários
     - **Usuário:** Só visualiza e edita conforme permissões

4. Salvar

5. O novo usuário faz login também em `/school-user-login`

---

## 📝 RESUMO RÁPIDO

| Tipo | Email | Rota de Login | Pode Criar Usuários? |
|------|-------|---------------|---------------------|
| **Super-Admin** | wanderpsc@gmail.com | `/login` | Não (gerencia escolas) |
| **Admin Escola** | escola@ceti.com | `/school-user-login` | ✅ Sim (da própria escola) |
| **Usuário Escola** | joao@ceti.com | `/school-user-login` | ❌ Não |

---

## 🚀 AGORA VOCÊ PODE:

1. ✅ Fazer login com escola@ceti.com em `/school-user-login`
2. ✅ Criar quantos usuários quiser para a escola CETI
3. ✅ Definir se cada usuário é admin ou não
4. ✅ Controlar permissões granulares de cada usuário

**Pronto! O sistema de dois níveis está funcionando perfeitamente! 🎉**
