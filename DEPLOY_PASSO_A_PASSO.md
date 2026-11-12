# 🚀 PASSO A PASSO PARA DEPLOY NO RENDER

## ✅ JÁ PREPARADO:
- Git inicializado com código compilado (backend/dist/)
- render.yaml configurado
- Variáveis de ambiente documentadas

---

## 📋 AGORA SIGA ESTES PASSOS:

### 1️⃣ CRIAR REPOSITÓRIO NO GITHUB (5 minutos)

Vá para: **https://github.com/new**

```
Repository name: criador-horario-backend
Description: Sistema de criação de horários escolares - Backend
Visibility: ✓ Public (para deploy gratuito no Render)
Initialize: ✗ NÃO marcar nenhuma opção
```

**Crie o repositório** → Copie a URL que aparecerá (algo como `https://github.com/SEU_USUARIO/criador-horario-backend.git`)

---

### 2️⃣ FAZER PUSH PARA GITHUB

Execute estes comandos no PowerShell (substitua SEU_USUARIO pelo seu):

```powershell
cd "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA"

git remote add origin https://github.com/SEU_USUARIO/criador-horario-backend.git

git push -u origin master
```

**Digite suas credenciais GitHub quando solicitado**

---

### 3️⃣ DEPLOY NO RENDER

1. Acesse: **https://render.com**
2. Faça login/crie conta (pode usar GitHub)
3. Clique em **"New +"** → **"Web Service"**
4. Conecte seu repositório GitHub: `criador-horario-backend`
5. Configure:

```
Name: criador-horario-backend
Region: Oregon (US West)
Branch: master
Root Directory: backend
Runtime: Node
Build Command: npm install && npm run build
Start Command: node dist/server.js
Plan: Free
```

6. **Adicione as variáveis de ambiente** (seção "Environment"):

```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://<usuario>:<senha>@<cluster>.mongodb.net/<banco>
JWT_SECRET=wbpA05luZmNcJvaOikjLTQ69t4hGnVWRUgC2HBrM1Xz8x3f7
FRONTEND_URL=https://criador-horario-aula.surge.sh
```

7. Clique em **"Create Web Service"**

⏱️ Aguarde 5-10 minutos para o build completar.

---

### 4️⃣ COPIAR URL DO BACKEND

Quando o deploy terminar, você verá:
```
✓ Your service is live at https://criador-horario-backend.onrender.com
```

**Copie essa URL!**

---

### 5️⃣ ME ENVIE A URL

Quando tiver a URL do backend, digite aqui:
```
A URL é: https://criador-horario-backend.onrender.com
```

Eu vou atualizar o frontend e fazer o último deploy!

---

## 🆘 PRECISA DE AJUDA?

Se tiver dúvida em QUALQUER passo, me pergunte antes de continuar!

---

© 2025 Wander Pires Silva Coelho | wanderpsc@gmail.com
