# 🔐 GUIA DO SISTEMA MULTI-USUÁRIOS COM PERMISSÕES GRANULARES

## ✅ Sistema Implementado com Sucesso!

### 📋 O que foi criado:

1. **Backend (API)**
   - ✅ Modelo `SchoolUser` com permissões por recurso
   - ✅ Modelo `AuditLog` para histórico completo
   - ✅ Rotas CRUD de usuários: `/api/school-users`
   - ✅ Rotas de auditoria: `/api/audit-logs`
   - ✅ Middleware de auditoria automática
   - ✅ Middleware de verificação de permissões
   - ✅ Endpoint seed para primeiro admin

2. **Frontend (Interface)**
   - ✅ Página de Login: `/school-user-login`
   - ✅ Gerenciamento de Usuários: `/settings`
   - ✅ Relatórios de Auditoria: `/audit-logs`
   - ✅ Barra de Acesso Rápido com todos os botões

---

## 🚀 COMO USAR - PASSO A PASSO

### **ETAPA 1: Criar Primeiro Administrador**

#### Opção A: Via API (Postman/Thunder Client)
```
POST https://criador-horario-backend.onrender.com/api/school-users/seed-admin

Body (JSON):
{
  "schoolId": "SEU_ID_DA_ESCOLA",
  "name": "Administrador",
  "email": "escola@ceti.com",
  "password": "Ceti@2026"
}
```

#### Opção B: Via Script Node.js
```bash
cd backend
npm run seed-admin
```

**⚠️ IMPORTANTE:** Este endpoint só funciona UMA VEZ por escola (quando não há admin).

---

### **ETAPA 2: Fazer Login como Administrador**

1. Acesse: https://wanderpsc.github.io/criador-horario-backend/school-user-login
2. Use as credenciais:
   - **Login:** `escola@ceti.com`
   - **Senha:** `Ceti@2026`

---

### **ETAPA 3: Gerenciar Usuários**

Após login, acesse **Settings** ou **Configurações**:

#### ➕ Criar Novo Usuário
1. Clique em "Novo Usuário"
2. Preencha:
   - Nome completo
   - E-mail
   - Senha (mínimo 6 caracteres)
   - Tipo: **Usuário** ou **Administrador**
3. Clique em "Salvar"

#### 🔐 Configurar Permissões
1. Clique no ícone **🛡️ Shield** ao lado do usuário
2. Marque/desmarque checkboxes para cada funcionalidade:
   - **Professores:** Create, Read, Update, Delete
   - **Disciplinas:** Create, Read, Update, Delete
   - **Turmas:** Create, Read, Update, Delete
   - **Gerar Horários:** Access, Generate
   - **Calendário:** Create, Read, Update, Delete
   - **Frequência:** Create, Read, Update, Delete
   - **Relatórios:** Read
   - **Configurações:** Access
   - **Gerenciar Usuários:** Manage
   - **Logs de Auditoria:** Read
3. Clique em "Salvar Permissões"

#### 🔑 Resetar Senha
1. Clique no ícone **🔑 Key** ao lado do usuário
2. Digite a nova senha (mínimo 6 caracteres)
3. Confirme

#### ✏️ Editar Usuário
- Clique no ícone **✏️ Edit** para alterar nome, e-mail ou tipo

#### 🗑️ Excluir Usuário
- Clique no ícone **🗑️ Trash** (confirme a exclusão)

---

### **ETAPA 4: Visualizar Logs de Auditoria**

Acesse **Settings** > Botão "Ver Logs" ou diretamente `/audit-logs`:

#### 📊 Dashboards Estatísticos
- Total de ações realizadas
- Taxa de sucesso
- Ações por tipo (Create, Update, Delete)
- Usuários mais ativos

#### 🔍 Filtros Disponíveis
- Por usuário (nome ou e-mail)
- Por ação (Create, Update, Delete, Login)
- Por recurso (Professores, Turmas, etc.)
- Por período (data início e fim)

#### 📥 Exportar Logs
- Clique em "Exportar CSV" para baixar planilha completa
- Clique em "Imprimir" para imprimir relatório

#### 📋 Informações no Log
Cada linha mostra:
- Data/Hora da ação
- Nome e e-mail do usuário
- Tipo de ação (badge colorido)
- Recurso afetado
- Status (Sucesso/Erro)
- Endereço IP

---

## 🔐 PERMISSÕES DETALHADAS POR RECURSO

### 📋 Recursos e Ações Disponíveis

| Recurso | Ações Disponíveis |
|---------|-------------------|
| **Professores** | Create, Read, Update, Delete |
| **Disciplinas** | Create, Read, Update, Delete |
| **Séries** | Create, Read, Update, Delete |
| **Turmas** | Create, Read, Update, Delete |
| **Disciplinas por Turma** | Create, Read, Update, Delete |
| **Professores por Disciplina** | Create, Read, Update, Delete |
| **Horários Base** | Create, Read, Update, Delete |
| **Gerar Horários** | Access, Generate |
| **Calendário Letivo** | Create, Read, Update, Delete |
| **Comunicados** | Create, Read, Update, Delete |
| **Horário Emergencial** | Create, Read |
| **Frequência Professores** | Create, Read, Update, Delete |
| **Relatórios de Frequência** | Read |
| **Painel de Exibição** | Access |
| **Configurações** | Access |
| **Gerenciar Usuários** | Manage |
| **Logs de Auditoria** | Read |

### 🛡️ Permissões Padrão

#### Administrador (Admin)
- ✅ **TODAS** as permissões habilitadas
- Pode criar, editar e excluir outros usuários
- Pode resetar senhas
- Pode ver logs de auditoria completos

#### Usuário  (User)
- ✅ **Read** (leitura) em todos os recursos
- ❌ Create, Update, Delete desabilitados por padrão
- ❌ Sem acesso a Settings e Gerenciamento de Usuários
- ❌ Sem acesso a Logs de Auditoria

> **💡 Dica:** O admin pode personalizar individualmente cada permissão!

---

## 📝 AUDITORIA AUTOMÁTICA

### O que é registrado automaticamente:
- ✅ Todas operações de **Create** (criação)
- ✅ Todas operações de **Update** (edição)
- ✅ Todas operações de  **Delete** (exclusão)
- ✅ Logins e logouts
- ✅ Geração de horários
- ✅ Exportações

### Informações capturadas:
- Usuário que executou a ação
- Data/hora precisa
- Tipo de ação (create/update/delete/login)
- Recurso afetado (teachers/classes/subjects)
- ID do registro modificado
- Método HTTP (GET/POST/PUT/DELETE)
- Endpoint da API chamado
- Endereço IP do usuário
- User-Agent do navegador
- Status (sucesso ou erro)
- Mensagem de erro (se houver)
- **Antes/Depois** das mudanças (para updates)

---

## 🔒 SEGURANÇA IMPLEMENTADA

1. **Autenticação JWT**
   - Tokens expiram em 24 horas
   - Validação em cada requisição

2. **Senha Criptografada**
   - bcrypt com salt de 10 rounds
   - Senhas nunca expostas na API

3. **Validação de Permissões**
   - Middleware verifica antes de executar ação
   - Retorna 403 (Forbidden) se sem permissão

4. **Isolamento por Escola**
   - Cada usuário só vê dados da sua escola
   - SchoolId validado em todas operações

5. **Auditoria Automática**
   - Impossível desabilitar
   - Logs imutáveis após criação

---

## 🌐 URLs DO SISTEMA

### Produção (GitHub Pages + Render)
- **Frontend:** https://wanderpsc.github.io/criador-horario-backend/
- **Login Multi-Usuários:** https://wanderpsc.github.io/criador-horario-backend/school-user-login
- **Settings:** https://wanderpsc.github.io/criador-horario-backend/settings
- **Audit Logs:** https://wanderpsc.github.io/criador-horario-backend/audit-logs
- **Backend API:** https://criador-horario-backend.onrender.com/api

### Endpoints da API

```
POST   /api/school-users/login           - Login usuário
POST   /api/school-users/seed-admin      - Criar primeiro admin
GET    /api/school-users                 - Listar usuários
POST   /api/school-users                 - Criar usuário
PUT    /api/school-users/:id             - Atualizar usuário
DELETE /api/school-users/:id             - Excluir usuário
POST   /api/school-users/:id/reset-password - Resetar senha

GET    /api/audit-logs                   - Listar logs
GET    /api/audit-logs/stats             - Estatísticas
GET    /api/audit-logs/export            - Exportar CSV
GET    /api/audit-logs/user/:userId      - Logs de um usuário
```

---

## 💡 CASOS DE USO PRÁTICOS

### Caso 1: Escola com 5 Usuários
1. **Diretor(a)** - Admin (todas permissões)
2. **Coordenador(a) Pedagógico** - Read em tudo + Update em Calendário e Comunicados
3. **Secretário(a)** - CRUD em Professores, Disciplinas e Turmas
4. **Professor(a) Coordenador(a)** - Read em tudo + Create em Frequência
5. **Visualizador** - Apenas Read em Horários e Painel de Exibição

### Caso 2: Controle Total do Administrador
- Admin cria os 5 usuários em /settings
- Configura permissões individuais clicando no Shield
- Usuário 2 tenta deletar um professor → ❌ Bloqueado (sem permissão Delete)
- Usuário 3 edita turma → ✅ Permitido (tem Update)
- Admin vai em /audit-logs e vê quem fez cada ação

### Caso 3: Resetar Senha de Usuário
- Usuário esqueceu a senha
- Admin acessa /settings
- Clica no ícone Key ao lado do usuário
- Define nova senha
- Sistema registra no audit log que admin resetou a senha

---

## ⚠️ NOTAS IMPORTANTES

1. **Não é possível deletar a própria conta** (bloqueado no backend)
2. **Usuários inativos não podem fazer login** (campo `isActive`)
3. **Apenas 1 admin pode ser criado pelo seed** (depois use /settings)
4. **Logs de auditoria NÃO podem ser deletados** (garantia de rastreabilidade)
5. **Permissões são verificadas no backend** (não apenas no frontend)
6. **Token JWT expira em 24h** (usuário precisa fazer login novamente)

---

## 🎯 CHECKLIST DE IMPLANTAÇÃO

- [x] Backend compilado e deployed no Render
- [x] Frontend compilado e deployed no GitHub Pages
- [x] Modelo SchoolUser criado com permissões
- [x] Modelo AuditLog implementado
- [x] Rotas de usuários funcionando
- [x] Rotas de auditoria funcionando
- [x] Middleware de audit integrado
- [x] Middleware de permissões integrado
- [x] Página de Login (/school-user-login)
- [x] Página de Settings (/settings)
- [x] Página de Audit Logs (/audit-logs)
- [x] Barra de acesso rápido atualizada
- [x] Sistema rodando em produção
- [ ] **Criar primeiro admin** (próximo passo!)

---

## 📞 SUPORTE

**Desenvolvedor:** Wander Pires Silva Coelho  
**E-mail:** wanderpsc@gmail.com  
**Sistema:** Criador de Horário de Aula Escolar  
**© 2025 - Todos os direitos reservados**

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Acesse: https://wanderpsc.github.io/criador-horario-backend/school-user-login
2. ✅ Crie o primeiro admin via API ou script
3. ✅ Faça login com escola@ceti.com / Ceti@2026
4. ✅ Acesse /settings e crie os 5 usuários
5. ✅ Configure permissões individuais
6. ✅ Teste o sistema fazendo login com cada usuário
7. ✅ Verifique os logs em /auditlogs

**Sistema 100% funcional e em produção! 🎉**
