# 🚀 CONFIGURAR DEPLOY NO RENDER - COPIE E COLE

## 📋 PASSO A PASSO NO RENDER:

### 1️⃣ No Dashboard do Render:
1. Clique em **"New +"** (botão azul no topo)
2. Selecione **"Web Service"**
3. Conecte sua conta GitHub (se ainda não conectou)
4. Busque: **criador-horario-backend**
5. Clique em **"Connect"**

---

### 2️⃣ CONFIGURAÇÕES (copie exatamente):

**Name (Nome):**
```
criador-horario-backend
```

**Region (Região):**
```
Oregon (US West)
```

**Branch:**
```
master
```

**Root Directory:**
```
backend
```

**Runtime:**
```
Node
```

**Build Command:**
```
npm install && npm run build
```

**Start Command:**
```
node dist/server.js
```

**Instance Type:**
```
Free
```

---

### 3️⃣ VARIÁVEIS DE AMBIENTE (clique em "Advanced" ou "Environment"):

**Adicione estas 5 variáveis** (copie uma por uma):

**NODE_ENV**
```
production
```

**PORT**
```
10000
```

**MONGODB_URI**
```
mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority
```

**JWT_SECRET**
```
wbpA05luZmNcJvaOikjLTQ69t4hGnVWRUgC2HBrM1Xz8x3f7
```

**FRONTEND_URL**
```
https://criador-horario-aula.surge.sh
```

---

### 4️⃣ CRIAR O WEB SERVICE:
1. Clique em **"Create Web Service"**
2. Aguarde o build (5-10 minutos)
3. Quando terminar, você verá: ✅ **"Your service is live at..."**

---

### 5️⃣ COPIAR A URL:
Quando o deploy completar, copie a URL que aparecerá, algo como:
```
https://criador-horario-backend.onrender.com
```

**ME ENVIE ESSA URL!** Eu vou atualizar o frontend automaticamente.

---

## ⏱️ TEMPO ESTIMADO:
- Configuração: 3-5 minutos
- Build no Render: 5-10 minutos
- **Total: ~10-15 minutos**

---

## 🔍 O QUE OBSERVAR DURANTE O BUILD:

Você verá logs assim:
```
==> Cloning from https://github.com/Wanderpsc/criador-horario-backend...
==> Running 'npm install && npm run build'
==> Installing dependencies...
==> Building application...
==> Your service is live 🎉
```

---

## ✅ QUANDO ESTIVER PRONTO:
Digite aqui a URL do seu backend, algo como:
```
https://criador-horario-backend.onrender.com
```

Vou configurar o frontend para apontar para essa URL e redesployar!

---

© 2025 Wander Pires Silva Coelho | wanderpsc@gmail.com
