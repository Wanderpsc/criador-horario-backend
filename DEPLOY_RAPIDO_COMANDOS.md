# Deploy Rápido - Guia de Comandos

## 🚀 Deploy Completo em 3 Passos

### 1️⃣ Backend (Render - Auto Deploy)
```powershell
# Commit e push (deploy automático)
cd backend
git add .
git commit -m "fix: Sua mensagem aqui"
git push origin master

# Render faz deploy automaticamente após push
# Aguardar 2-3 minutos
```

### 2️⃣ Frontend (Build)
```powershell
# Build do frontend
cd frontend
npm run build

# Verificar se compilou sem erros
# Saída esperada: "✓ built in XX.XXs"
```

### 3️⃣ Frontend (Deploy Surge)
```powershell
# Deploy para Surge
cd frontend
surge dist criador-horario-aula.surge.sh

# Aguardar upload concluir
# Saída esperada: "Success! - Published to criador-horario-aula.surge.sh"
```

---

## ⚡ Comandos Únicos (Copy & Paste)

### Deploy Completo Backend
```powershell
cd "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\backend"; git add .; git commit -m "fix: Atualização"; git push origin master
```

### Build e Deploy Frontend
```powershell
cd "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\frontend"; npm run build; surge dist criador-horario-aula.surge.sh
```

### Tudo de Uma Vez
```powershell
# Backend
cd "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\backend"
git add .
git commit -m "fix: Atualização completa"
git push origin master

# Frontend
cd "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\frontend"
npm run build
surge dist criador-horario-aula.surge.sh
```

---

## 🔍 Verificar Status

### Check Backend (Render)
```powershell
# Ver logs do Render
# 1. Acesse: https://dashboard.render.com
# 2. Clique em "criador-horario-backend"
# 3. Aba "Logs" | Aba "Events"

# Ou teste direto:
curl https://criador-horario-backend.onrender.com/api/health
```

### Check Frontend (Surge)
```powershell
# Abrir no navegador
start https://criador-horario-aula.surge.sh

# Ou testar disponibilidade
curl https://criador-horario-aula.surge.sh
```

---

## 🐛 Troubleshooting

### Erro: "build failed"
```powershell
# Limpar e rebuild
cd frontend
Remove-Item -Recurse -Force dist, node_modules/.vite
npm run build
```

### Erro: "Surge upload aborted"
```powershell
# Tentar novamente (pode ser timeout)
cd frontend
surge dist criador-horario-aula.surge.sh

# Se persistir, verificar conta Surge
surge whoami
# Deve mostrar: wanderpsc@gmail.com
```

### Erro: "Git push rejected"
```powershell
# Forçar push (cuidado!)
git push origin master --force

# Ou resolver conflitos primeiro
git pull origin master
# Resolver conflitos manualmente
git add .
git commit -m "fix: Resolve conflicts"
git push origin master
```

### Backend não atualiza no Render
```powershell
# 1. Verificar se commit foi enviado
cd backend
git log --oneline -5

# 2. Check Render Dashboard
# - Events: deve mostrar "Deploy started"
# - Logs: deve ter mensagens recentes

# 3. Se necessário, forçar rebuild no Render
# Dashboard > Manual Deploy > "Deploy latest commit"
```

---

## 📦 Antes de Deploy - Checklist

Antes de fazer deploy, verificar:

- [ ] **Backend**:
  - [ ] Código compila sem erros TypeScript
  - [ ] Testes locais passaram
  - [ ] Variáveis de ambiente configuradas no Render
  - [ ] Commit message descritivo

- [ ] **Frontend**:
  - [ ] `npm run build` sem erros
  - [ ] Sem erros no console do navegador (F12)
  - [ ] API base URL correta no `.env`
  - [ ] Assets (imagens, icons) presentes

---

## 🔐 Variáveis de Ambiente

### Render (Backend)
Acessar: https://dashboard.render.com > criador-horario-backend > Environment

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=sua-chave-secreta
MERCADO_PAGO_ACCESS_TOKEN=APP-...
PORT=10000
```

### Frontend (.env)
```
VITE_API_URL=https://criador-horario-backend.onrender.com/api
```

---

## 📝 Template de Commit Messages

### Correção de Bugs
```bash
git commit -m "fix: Corrige erro 404 ao marcar frequência"
git commit -m "fix: Resolve validação de startTime/endTime"
```

### Nova Funcionalidade
```bash
git commit -m "feat: Adiciona sistema de impressão profissional"
git commit -m "feat: Implementa relatório por disciplina"
```

### Melhorias
```bash
git commit -m "chore: Atualiza documentação de deploy"
git commit -m "refactor: Melhora lógica de agregação de horários"
```

### Deploy Completo
```bash
git commit -m "deploy: Atualização completa - frequência e impressão"
```

---

## 🕐 Tempo Estimado de Deploy

| Etapa | Tempo |
|-------|-------|
| Git commit/push backend | 10-30 segundos |
| Render build & deploy | 2-4 minutos |
| Frontend npm build | 30-60 segundos |
| Surge upload | 30-90 segundos |
| **TOTAL** | **4-6 minutos** |

---

## 🎯 URLs de Acesso

| Serviço | URL |
|---------|-----|
| Frontend Produção | https://criador-horario-aula.surge.sh |
| Backend API | https://criador-horario-backend.onrender.com/api |
| Render Dashboard | https://dashboard.render.com |
| GitHub Repositório | https://github.com/Wanderpsc/criador-horario-backend |

---

## 🆘 Contatos de Emergência

Se algo der errado após deploy:

1. **Revisar Logs do Render**:
   - Dashboard > Logs
   - Procurar por erros em vermelho

2. **Reverter Deploy** (se necessário):
   ```powershell
   cd backend
   git revert HEAD
   git push origin master
   # Render vai fazer deploy da versão anterior
   ```

3. **Contato**:
   - E-mail: wanderpsc@gmail.com
   - Urgência: Verificar logs antes de contatar

---

## ✅ Validação Pós-Deploy

Após deploy, testar:

```powershell
# 1. API Health Check
curl https://criador-horario-backend.onrender.com/api/health

# 2. Frontend carrega
start https://criador-horario-aula.surge.sh

# 3. Login funciona
# Testar manualmente no navegador

# 4. Funcionalidade crítica
# Marcar frequência de um professor
```

---

**Última Atualização**: 10/02/2026  
**Versão do Guia**: 1.0
