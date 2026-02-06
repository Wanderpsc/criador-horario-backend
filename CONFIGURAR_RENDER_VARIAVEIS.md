# ⚙️ Configurar Variáveis de Ambiente no Render

## 🚨 PROBLEMA ATUAL
O login no Surge está falhando porque o backend Render não tem as variáveis de ambiente configuradas.

## 📋 Passos para Corrigir

### 1. Acesse o Painel do Render
👉 https://dashboard.render.com/

### 2. Selecione seu Serviço
- Clique em **criador-horario-backend-1**

### 3. Vá em "Environment"
- No menu lateral, clique em **"Environment"**

### 4. Adicione as Variáveis
Clique em **"Add Environment Variable"** e adicione cada uma:

```env
MONGODB_URI=mongodb+srv://wanderpsc:Wpsc2026@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority

JWT_SECRET=wanderpsc2025horarioescolar_secret_key_change_in_production

JWT_EXPIRE=7d

NODE_ENV=production

PORT=5000

CORS_ORIGIN=https://edusync-pro.surge.sh,https://wanderpsc.github.io

FRONTEND_URL=https://wanderpsc.github.io/criador-horario-backend

EMAIL_USER=wanderpsc@gmail.com

EMAIL_PASSWORD=yvquefknpprdohwk
```

### 5. Salve e Aguarde
- Clique em **"Save Changes"**
- O Render vai reiniciar automaticamente (leva ~2 minutos)

### 6. Teste o Login
Após o deploy, teste novamente:
👉 https://edusync-pro.surge.sh
- Email: `escola@ceti.com`
- Senha: `Ceti@2026`

---

## 🎯 SOLUÇÃO ALTERNATIVA

Enquanto o Render não é configurado, use o **GitHub Pages**:

👉 **https://wanderpsc.github.io/criador-horario-backend**

Aguarde 2-3 minutos para o cache do CDN atualizar e o vídeo de demonstração aparecerá!

---

## ✅ Como Saber se Funcionou

Teste o endpoint de health:
```bash
curl https://criador-horario-backend-1.onrender.com/api/health
```

Deve retornar:
```json
{
  "message": "API funcionando",
  "timestamp": "..."
}
```

Teste o login:
```bash
curl -X POST https://criador-horario-backend-1.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"escola@ceti.com","password":"Ceti@2026"}'
```

Deve retornar um token JWT.

---

© 2025 Wander Pires Silva Coelho
