# 🚀 DEPLOY RÁPIDO

© 2025 Wander Pires Silva Coelho

## 📦 Frontend (Surge) - PRONTO PARA DEPLOY!

```powershell
.\DEPLOY_FRONTEND.ps1
```

**OU manualmente:**

```powershell
cd frontend
npm run build
surge dist --domain criador-horario-aula.surge.sh
```

**URL:** https://criador-horario-aula.surge.sh

---

## 🔧 Backend - Escolha uma opção:

### Opção 1: Render.com (Recomendado)

1. Acesse: https://render.com
2. Clique em "New Web Service"
3. Conecte ao GitHub ou use "Deploy a public Git repository"
4. Se usar Git público, use: `https://github.com/seu-usuario/seu-repo.git`
5. Configure:
   - **Name:** criador-horario-backend
   - **Environment:** Node
   - **Region:** Oregon (Free)
   - **Branch:** main
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/server.js`

6. **Environment Variables** (Add Environment Variable):
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=mongodb+srv://<usuario>:<senha>@<cluster>.mongodb.net/<banco>
   JWT_SECRET=criar_um_secret_muito_seguro_aqui_123456789
   FRONTEND_URL=https://criador-horario-aula.surge.sh
   MERCADOPAGO_ACCESS_TOKEN=seu_token_aqui
   WHATSAPP_API_KEY=seu_token_aqui
   EMAIL_USER=wanderpsc@gmail.com
   EMAIL_PASSWORD=sua_senha_app_gmail
   ```

7. Clique em "Create Web Service"

8. **IMPORTANTE:** Depois do deploy, copie a URL (ex: https://criador-horario-backend.onrender.com)

9. Atualize `frontend/.env.production`:
   ```
   VITE_API_URL=https://criador-horario-backend.onrender.com/api
   ```

10. Faça novo deploy do frontend:
    ```powershell
    .\DEPLOY_FRONTEND.ps1
    ```

---

### Opção 2: Railway.app

1. Acesse: https://railway.app
2. Clique em "Start a New Project"
3. Escolha "Deploy from GitHub repo"
4. Selecione seu repositório
5. Configure:
   - **Root Directory:** `backend`
   - Adicione as mesmas variáveis de ambiente acima

---

### Opção 3: Heroku (Limitado)

```powershell
# Instalar Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
heroku login
cd backend
heroku create criador-horario-backend
heroku config:set MONGODB_URI="sua_connection_string"
heroku config:set JWT_SECRET="seu_secret"
heroku config:set FRONTEND_URL="https://criador-horario-aula.surge.sh"
git push heroku main
```

---

## ✅ Checklist

- [ ] Backend deployado e rodando
- [ ] Copiei a URL do backend
- [ ] Atualizei `.env.production` do frontend
- [ ] Fiz novo deploy do frontend
- [ ] Testei login em https://criador-horario-aula.surge.sh
- [ ] Sistema funcionando online! 🎉

---

## 🆘 Problemas?

### "surge: command not found"
```powershell
npm install -g surge
```

### Erro de CORS
O backend já está configurado para aceitar requisições do Surge.
Se necessário, adicione mais domínios em `backend/src/server.ts`

### Backend não inicia no Render
- Verifique logs no dashboard do Render
- Confirme que MONGODB_URI está correto
- PORT deve ser 10000

---

## 📊 Status do Sistema

**Frontend:** ✅ Pronto para deploy  
**Backend:** ⚠️ Precisa escolher plataforma  
**Database:** ✅ MongoDB Atlas configurado  
**CORS:** ✅ Configurado  

---

**Precisa de ajuda?**  
📧 wanderpsc@gmail.com
