# 🚀 Deploy Backend no Render.com - GUIA COMPLETO

**Tempo estimado:** 10 minutos  
**Custo:** GRÁTIS (750h/mês)

---

## 📋 PASSO 1: Criar Conta no Render (2 min)

1. Acesse: **https://render.com**
2. Clique em **"Get Started"**
3. **Escolha "Sign in with GitHub"** ⭐ (RECOMENDADO)
4. Autorize o Render a acessar seu GitHub
5. ✅ Pronto! Você está logado

---

## 🔗 PASSO 2: Conectar seu Repositório GitHub (3 min)

### 2.1 - Criar Repositório no GitHub (se não tiver)

```powershell
cd "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA"
git init
git add .
git commit -m "Deploy inicial - EduSync-PRO"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/edusync-pro.git
git push -u origin main
```

### 2.2 - No Render Dashboard

1. Clique em **"New +"**
2. Selecione **"Web Service"**
3. Clique em **"Connect a repository"**
4. Procure: **edusync-pro** (ou nome do seu repositório)
5. Clique em **"Connect"**

---

## ⚙️ PASSO 3: Configurar o Serviço (5 min)

### 3.1 - Configurações Básicas

```
Name: edusync-pro-backend
Region: Oregon (US West)
Branch: main
Root Directory: backend
Runtime: Node
```

### 3.2 - Build & Start Commands

```
Build Command: npm install && npm run build
Start Command: node dist/server.js
```

### 3.3 - Plano

Selecione: **Free** ⭐

---

## 🔐 PASSO 4: Variáveis de Ambiente (3 min)

Role até **"Environment Variables"** e adicione:

```env
NODE_ENV=production
PORT=10000

MONGODB_URI=mongodb+srv://wanderpsc:Wpsc2026@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority

JWT_SECRET=wanderpsc2025horarioescolar_secret_key_change_in_production
JWT_EXPIRE=7d

EMAIL_USER=wanderpsc@gmail.com
EMAIL_PASSWORD=yvquefknpprdohwk

FRONTEND_URL=https://edusync-pro.surge.sh
CORS_ORIGIN=https://edusync-pro.surge.sh

MERCADO_PAGO_ACCESS_TOKEN=APP_USR-8624658040903889-010322-4f9240f477d96f3a7539c751a2cf3d53-58356
```

---

## 🎯 PASSO 5: Deploy!

1. Clique em **"Create Web Service"**
2. ⏳ Aguarde 3-5 minutos (vai aparecer logs em tempo real)
3. ✅ Quando ver **"Your service is live"**, COPIE a URL!

**Sua URL será tipo:**
```
https://edusync-pro-backend.onrender.com
```

---

## 🔄 PASSO 6: Atualizar Frontend

Volte aqui e me informe a URL do Render que você recebeu!

Exemplo: `https://edusync-pro-backend.onrender.com`

Vou atualizar o frontend automaticamente para conectar nessa URL.

---

## ✅ Checklist Final

- [ ] Conta criada no Render
- [ ] Repositório conectado
- [ ] Variáveis de ambiente configuradas
- [ ] Build concluído com sucesso
- [ ] URL do backend copiada
- [ ] Frontend atualizado (eu faço isso)

---

## 🆘 Problemas Comuns

### Build falhou?
- Verifique se está usando Node 18+
- Confirme que o `Root Directory` está como `backend`

### Erro de MongoDB?
- Confirme que copiou a `MONGODB_URI` corretamente
- Verifique se a senha está URL-encoded: `Wpsc2026` (sem @)

### CORS Error?
- Confirme que `FRONTEND_URL` está como `https://edusync-pro.surge.sh`

---

📧 **Dúvidas?** wanderpsc@gmail.com

✅ **Depois de fazer o deploy, me avise a URL do backend!**
