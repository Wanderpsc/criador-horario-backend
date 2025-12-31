# ✅ CHECKLIST RÁPIDO - Render.com Deploy

---

## 🎯 MISSÃO: Colocar Backend Online

**Tempo estimado:** 10-15 minutos  
**Custo:** R$ 0,00  
**Dificuldade:** ⭐⭐ Fácil

---

## 📝 PASSOS

### ☐ 1. Criar Conta
- [ ] Acessar https://render.com
- [ ] Clicar em "Get Started"
- [ ] Fazer cadastro (use GitHub se possível)

### ☐ 2. Novo Web Service
- [ ] Dashboard → "New +" → "Web Service"
- [ ] Conectar repositório ou usar Git público

### ☐ 3. Configurar Service

**Copie e cole:**

```
Name: criador-horario-backend
Region: Oregon (US West)
Root Directory: backend
Runtime: Node
Build Command: npm install && npm run build
Start Command: node dist/server.js
Plan: Free
```

### ☐ 4. Variáveis de Ambiente

Clique em "Environment Variables" e adicione:

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority
JWT_SECRET=wbpA05luZmNcJvaOikjLTQ69t4hGnVWRUgC2HBrM1Xz8x3f7
FRONTEND_URL=https://criador-horario-aula.surge.sh
```

### ☐ 5. Criar Service
- [ ] Clicar em "Create Web Service"
- [ ] Aguardar 2-5 minutos
- [ ] Esperar aparecer "Live" com ✅ verde

### ☐ 6. Copiar URL
- [ ] Copiar URL (ex: https://criador-horario-backend.onrender.com)
- [ ] Testar: abrir /health no navegador

### ☐ 7. Atualizar Frontend
- [ ] Abrir `frontend/.env.production`
- [ ] Colocar: `VITE_API_URL=https://criador-horario-backend.onrender.com/api`
- [ ] Salvar

### ☐ 8. Redeploy Frontend
```powershell
cd "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\frontend"
npm run build
surge dist --domain criador-horario-aula.surge.sh
```

### ☐ 9. TESTAR!
- [ ] Abrir https://criador-horario-aula.surge.sh
- [ ] Login: admin@edusync-pro.com / admin123
- [ ] Navegar pelo sistema
- [ ] Criar um professor de teste
- [ ] 🎉 FUNCIONOU!

---

## 🚨 Problemas Comuns

**"Build failed"**  
→ Verifique logs, provavelmente falta alguma variável

**"Application failed to respond"**  
→ Verifique MONGODB_URI e PORT=10000

**Frontend não conecta**  
→ Confirme VITE_API_URL em .env.production

**Primeira requisição demora**  
→ Normal! Free tier hiberna após 15 min

---

## 📞 URLs Finais

**Frontend:** https://criador-horario-aula.surge.sh  
**Backend:** https://criador-horario-backend.onrender.com  
**Health:** https://criador-horario-backend.onrender.com/health

---

## 🎓 Dicas

💡 Primeira requisição após hibernar demora ~30 segundos  
💡 Logs em tempo real: Dashboard → Logs  
💡 Auto-deploy: Settings → Enable Auto-Deploy  
💡 Upgrade para não hibernar: $7/mês (opcional)

---

**Precisa de ajuda detalhada?** → [RENDER_DEPLOY.md](RENDER_DEPLOY.md)
