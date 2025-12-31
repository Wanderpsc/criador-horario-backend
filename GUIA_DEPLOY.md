# 🚀 Guia de Deploy - Sistema Criador de Horário de Aula

© 2025 Wander Pires Silva Coelho

## 📋 Pré-requisitos

- ✅ MongoDB Atlas configurado (já feito)
- ✅ Surge CLI instalado globalmente
- ✅ Conta Render.com ou Railway.app (para backend)

---

## 🎨 PARTE 1: Deploy do Frontend (Surge)

### Passo 1: Build de Produção

```powershell
cd "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\frontend"
npm run build
```

### Passo 2: Deploy no Surge

```powershell
surge dist --domain criador-horario-aula.surge.sh
```

**URL do Frontend:** https://criador-horario-aula.surge.sh

---

## 🔧 PARTE 2: Deploy do Backend

### Opção A: Render.com (Recomendado - Gratuito)

1. **Criar conta:** https://render.com
2. **Novo Web Service:**
   - Connect Repository (ou usar GitHub)
   - Environment: Node
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && node dist/server.js`

3. **Variáveis de Ambiente:**
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority
JWT_SECRET=seu_jwt_secret_aqui_muito_seguro_123456789
MERCADOPAGO_ACCESS_TOKEN=seu_token_mercadopago
WHATSAPP_API_KEY=seu_token_whatsapp
EMAIL_USER=wanderpsc@gmail.com
EMAIL_PASSWORD=sua_senha_app_gmail
FRONTEND_URL=https://criador-horario-aula.surge.sh
```

4. **Depois do Deploy:**
   - Copie a URL gerada (ex: https://criador-horario-aula.onrender.com)
   - Atualize o arquivo `.env.production` do frontend com essa URL
   - Faça novo deploy do frontend

### Opção B: Railway.app (Gratuito)

1. **Criar conta:** https://railway.app
2. **New Project → Deploy from GitHub**
3. **Configurar variáveis de ambiente** (mesmas acima)
4. **Root Directory:** `backend`
5. **Build Command:** `npm install && npm run build`
6. **Start Command:** `node dist/server.js`

### Opção C: Heroku (Gratuito com limitações)

```powershell
# Instalar Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Criar app
cd "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\backend"
heroku create criador-horario-backend

# Configurar variáveis
heroku config:set MONGODB_URI="mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority"
heroku config:set JWT_SECRET="seu_jwt_secret"
heroku config:set FRONTEND_URL="https://criador-horario-aula.surge.sh"

# Deploy
git push heroku main
```

---

## 🔄 PARTE 3: Conectar Frontend ao Backend

Depois de fazer deploy do backend, atualize:

**frontend/.env.production:**
```
VITE_API_URL=https://sua-url-backend.onrender.com/api
```

**Novo deploy do frontend:**
```powershell
cd frontend
npm run build
surge dist --domain criador-horario-aula.surge.sh
```

---

## ✅ Checklist Final

- [ ] Backend deployado e rodando
- [ ] Frontend deployado no Surge
- [ ] Variáveis de ambiente configuradas
- [ ] Frontend conectado à URL do backend
- [ ] MongoDB Atlas acessível
- [ ] Testar login admin
- [ ] Testar criação de horário
- [ ] Verificar notificações
- [ ] Testar pagamentos (modo teste)

---

## 🔒 Segurança

**IMPORTANTE:** Nunca commite arquivos .env com senhas reais no Git!

Crie um `.gitignore` se não existir:
```
.env
.env.local
.env.production.local
dist/
node_modules/
```

---

## 📱 URLs do Sistema

- **Frontend:** https://criador-horario-aula.surge.sh
- **Backend:** https://sua-url-backend.onrender.com
- **MongoDB:** MongoDB Atlas (cloud)
- **Painel Admin:** https://criador-horario-aula.surge.sh/admin

**Login Admin:**
- Email: admin@edusync-pro.com
- Senha: admin123

---

## 🆘 Troubleshooting

### Frontend não conecta ao backend
- Verifique CORS no backend (arquivo `server.ts`)
- Confirme VITE_API_URL correto
- Verifique Network tab no DevTools

### Backend não inicia
- Verifique logs no Render/Railway
- Confirme MONGODB_URI correto
- Verifique PORT (Render usa 10000)

### Erro de CORS
Adicione no `backend/src/server.ts`:
```typescript
app.use(cors({
  origin: ['https://criador-horario-aula.surge.sh'],
  credentials: true
}));
```

---

## 📊 Monitoramento

- **Render:** Dashboard → Logs
- **Railway:** Project → Deployments → Logs
- **Surge:** Sem logs (apenas hospedagem estática)

---

## 💰 Custos

- **Frontend (Surge):** Gratuito
- **Backend (Render Free Tier):** Gratuito
  - 750 horas/mês
  - Hiberna após 15min inatividade
- **MongoDB Atlas (M0):** Gratuito
  - 512MB storage
  - Conexões compartilhadas

**Total:** R$ 0,00/mês (tier gratuito)

---

## 🚀 Deploy Rápido (Script)

Depois de configurar o backend, use:

```powershell
# Deploy completo
cd frontend
npm run deploy
```

---

**Suporte:** wanderpsc@gmail.com
