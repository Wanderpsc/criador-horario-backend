# 🚀 Deploy IMEDIATO no Render.com

© 2025 Wander Pires Silva Coelho

**Tempo estimado:** 10-15 minutos  
**Custo:** Grátis (750h/mês)

---

## 📋 PASSO 1: Criar Conta no Render (2 minutos)

1. **Abra no navegador**: https://render.com
2. Clique em **"Get Started"**
3. Escolha **"Sign in with GitHub"** ⭐ (RECOMENDADO)
4. Autorize o Render a acessar seu GitHub
5. Pronto! Você está logado.

---

## 🔗 PASSO 2: Criar Web Service (3 minutos)

1. **No Dashboard do Render**, clique no botão **"New +"**
2. Selecione **"Web Service"**

3. **Conectar Repositório:**
   - Clique em **"Connect a repository"**
   - Procure por: **`criador-horario-backend`**
   - Clique em **"Connect"**

4. **Configurações Básicas:**
   ```
   Name: criador-horario-backend
   Region: Oregon (US West)
   Branch: master
   Root Directory: (deixe vazio)
   Runtime: Node
   ```

5. **Build Settings:**
   ```
   Build Command: cd backend && npm install && npm run build
   Start Command: cd backend && node dist/server.js
   ```

6. **Plan:** Selecione **"Free"**

---

## 🔐 PASSO 3: Configurar Variáveis de Ambiente (5 minutos)

**IMPORTANTE:** No Render, role até **"Environment Variables"** e adicione:

### ⚙️ Variáveis Obrigatórias:

```env
NODE_ENV=production
PORT=10000
```

### 🔒 Copie do seu .env local:

```env
MONGODB_URI=mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority

JWT_SECRET=wanderpsc2025horarioescolar_secret_key_change_in_production

EMAIL_USER=wanderpsc@gmail.com
EMAIL_PASSWORD=yvquefknpprdohwk

MERCADO_PAGO_ACCESS_TOKEN=APP_USR-8624658040903889-010322-4f9240f477d96f3a7539c751a2cf3d53-58356
```

### 🌐 URL do Frontend (Surge):

```env
FRONTEND_URL=https://criador-horario-aula.surge.sh
CORS_ORIGIN=https://criador-horario-aula.surge.sh
```

### 📦 Webhook (Importante para pagamentos):

**AGUARDE o deploy terminar para pegar a URL!**

Depois do deploy, a URL será tipo:
```
https://criador-horario-backend.onrender.com
```

Então você adiciona:
```env
WEBHOOK_URL=https://criador-horario-backend.onrender.com/api/payments/webhook
```

---

## 🎯 PASSO 4: Deploy! (5 minutos)

1. **Clique em "Create Web Service"**
2. **Aguarde o build** (vai aparecer logs em tempo real)
3. **Status esperado:**
   ```
   Building... ⏳
   Installing dependencies...
   Running build...
   Starting server...
   ✅ Live!
   ```

4. **Quando aparecer "Live"**, copie a URL:
   ```
   https://criador-horario-backend.onrender.com
   ```

---

## ✅ PASSO 5: Testar Backend (2 minutos)

**Abra no navegador:**
```
https://criador-horario-backend.onrender.com/health
```

**Resposta esperada:**
```json
{
  "status": "OK",
  "message": "Sistema Criador de Horário de Aula Escolar - API funcionando"
}
```

✅ **Se apareceu isso = Backend funcionando!**

---

## 🌐 PASSO 6: Configurar Webhook (1 minuto)

1. **Volte ao Render Dashboard**
2. Clique no seu serviço **criador-horario-backend**
3. Vá em **"Environment"** (menu lateral)
4. Clique em **"Add Environment Variable"**
5. Adicione:
   ```
   Key: WEBHOOK_URL
   Value: https://criador-horario-backend.onrender.com/api/payments/webhook
   ```
6. Clique em **"Save Changes"**
7. O serviço vai reiniciar automaticamente

---

## 🎨 PASSO 7: Deploy do Frontend no Surge (2 minutos)

**No PowerShell, execute:**

```powershell
cd "e:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA"
.\DEPLOY_FRONTEND.ps1
```

**Ou manualmente:**

```powershell
cd frontend
npm install -g surge
npm run build
surge dist/ criador-horario-aula.surge.sh
```

---

## 🔄 PASSO 8: Atualizar Frontend para usar Backend em Produção

Edite: `frontend/.env.production`

```env
VITE_API_URL=https://criador-horario-backend.onrender.com/api
```

**Depois, refaça o build e deploy:**

```powershell
cd frontend
npm run build
surge dist/ criador-horario-aula.surge.sh
```

---

## ✅ CHECKLIST FINAL

Marque conforme concluir:

- [ ] Conta Render criada e conectada ao GitHub
- [ ] Web Service criado e configurado
- [ ] Todas as variáveis de ambiente adicionadas
- [ ] Build concluído com sucesso (status "Live")
- [ ] Teste `/health` funcionando
- [ ] WEBHOOK_URL configurado
- [ ] Frontend buildado e deployado no Surge
- [ ] Frontend conectado ao backend em produção
- [ ] Teste de login funcionando
- [ ] Teste de pagamento funcionando

---

## 🎯 URLs FINAIS

Depois de tudo pronto, você terá:

```
🔹 Backend (API):
https://criador-horario-backend.onrender.com

🔹 Frontend (Interface):
https://criador-horario-aula.surge.sh

🔹 Webhook Mercado Pago:
https://criador-horario-backend.onrender.com/api/payments/webhook
```

---

## 🆘 TROUBLESHOOTING

### ❌ Erro: "Build Failed"
**Solução:** Verifique se colocou os comandos de build corretamente:
```
Build: cd backend && npm install && npm run build
Start: cd backend && node dist/server.js
```

### ❌ Erro: "Application failed to respond"
**Solução:** Certifique-se que PORT=10000 está nas variáveis de ambiente

### ❌ Erro: "Cannot connect to MongoDB"
**Solução:** Verifique se o IP do Render está na whitelist do MongoDB Atlas:
1. Acesse MongoDB Atlas
2. Network Access → Add IP Address
3. Adicione: `0.0.0.0/0` (permite todos - apenas para desenvolvimento)

### ❌ Frontend não conecta ao Backend
**Solução:** Verifique se CORS está configurado corretamente no backend
```env
FRONTEND_URL=https://criador-horario-aula.surge.sh
CORS_ORIGIN=https://criador-horario-aula.surge.sh
```

---

## 🚀 PRONTO!

Seu sistema está no ar! 🎉

**Próximos passos recomendados:**

1. ✅ Teste completo do sistema
2. ✅ Faça um pagamento real (pequeno valor) para validar
3. ✅ Configure domínio personalizado (opcional)
4. ✅ Configure alertas de downtime no Render
5. ✅ Ative 2FA na conta do Render

---

**© 2025 Wander Pires Silva Coelho - Sistema Protegido**

📧 Dúvidas: wanderpsc@gmail.com
