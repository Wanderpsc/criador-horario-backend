# 📋 INFORMAÇÕES PARA COPIAR NO RENDER.COM

---

## 🔧 CONFIGURAÇÕES DO WEB SERVICE

```
Name: criador-horario-backend
Region: Oregon (US West)
Root Directory: backend
Runtime: Node
Build Command: npm install && npm run build
Start Command: node dist/server.js
Plan: Free
```

---

## 🔐 VARIÁVEIS DE AMBIENTE

**Copie e cole cada linha no Render:**

```
NODE_ENV=production
```

```
PORT=10000
```

```
MONGODB_URI=mongodb+srv://<usuario>:<senha>@<cluster>.mongodb.net/<banco>
```

```
JWT_SECRET=wbpA05luZmNcJvaOikjLTQ69t4hGnVWRUgC2HBrM1Xz8x3f7
```

```
FRONTEND_URL=https://criador-horario-aula.surge.sh
```

---

## ✅ STATUS

- [x] Backend compilado
- [x] Frontend deployado: https://criador-horario-aula.surge.sh
- [x] MongoDB Atlas configurado
- [x] CORS configurado
- [x] Git inicializado (282 arquivos)
- [x] Documentação criada

---

## 🚀 PRÓXIMO PASSO

1. **Acesse:** https://render.com
2. **Crie conta** ou faça login (recomendo usar GitHub)
3. **Siga:** [CHECKLIST_RENDER.md](CHECKLIST_RENDER.md)

---

## 📞 DEPOIS DO DEPLOY

Quando o backend estiver online:

1. Copie a URL do Render (ex: `https://criador-horario-backend.onrender.com`)
2. Atualize `frontend/.env.production`:
   ```
   VITE_API_URL=https://criador-horario-backend.onrender.com/api
   ```
3. Redeploy do frontend:
   ```powershell
   cd frontend
   npm run build
   surge dist --domain criador-horario-aula.surge.sh
   ```

---

**© 2025 Wander Pires Silva Coelho**  
**Email:** wanderpsc@gmail.com
