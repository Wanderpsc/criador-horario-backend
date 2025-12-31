# 🚀 Deploy no Render.com - Passo a Passo

© 2025 Wander Pires Silva Coelho

**Plataforma escolhida:** Render.com  
**Plano:** Free (750 horas/mês)  
**Status:** ✅ Recomendado para produção

---

## 📋 PASSO 1: Criar Conta no Render

1. Acesse: **https://render.com**
2. Clique em **"Get Started"** ou **"Sign Up"**
3. Escolha uma opção:
   - **GitHub** (recomendado - mais fácil para deploy automático)
   - **GitLab**
   - **Email**

4. Complete o cadastro

---

## 📦 PASSO 2: Preparar o Código (Já Está Pronto!)

✅ Seu código já está preparado com:
- `render.yaml` configurado
- `Procfile` criado
- CORS configurado para Surge
- Build scripts prontos

---

## 🔧 PASSO 3: Criar Web Service no Render

### Opção A: Deploy via Git (Recomendado)

1. **No Render Dashboard, clique em "New +"**
2. Selecione **"Web Service"**

3. **Conectar repositório:**
   - Se conectou via GitHub: Selecione seu repositório
   - Se não tem no GitHub ainda: Use "Public Git repository"

4. **Configurações do Service:**

   ```
   Name: criador-horario-backend
   Region: Oregon (US West)
   Branch: main (ou master)
   Root Directory: backend
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: node dist/server.js
   ```

5. **Escolha o plano:** **Free** (750 horas/mês)

---

## 🔐 PASSO 4: Configurar Variáveis de Ambiente

No Render, na seção **"Environment Variables"**, adicione:

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority
JWT_SECRET=seu_segredo_jwt_muito_forte_e_aleatorio_12345678
FRONTEND_URL=https://criador-horario-aula.surge.sh
```

**Variáveis Opcionais (adicione depois):**
```env
MERCADOPAGO_ACCESS_TOKEN=seu_token_aqui
WHATSAPP_API_KEY=seu_token_aqui
EMAIL_USER=wanderpsc@gmail.com
EMAIL_PASSWORD=sua_senha_de_aplicativo_gmail
```

### ⚠️ IMPORTANTE: JWT_SECRET
Gere um secret forte. Você pode usar este comando no PowerShell:

```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

## 🚀 PASSO 5: Iniciar Deploy

1. Clique em **"Create Web Service"**
2. O Render vai:
   - ✅ Clonar o repositório
   - ✅ Instalar dependências (npm install)
   - ✅ Fazer build (npm run build)
   - ✅ Iniciar servidor (node dist/server.js)

3. **Aguarde 2-5 minutos** (primeira vez demora mais)

4. Acompanhe os logs em tempo real

---

## ✅ PASSO 6: Verificar Deploy

Quando aparecer: **"Live"** com bolinha verde ✅

1. **Copie a URL gerada:**
   ```
   https://criador-horario-backend.onrender.com
   ```

2. **Teste o health endpoint:**
   Abra no navegador: `https://criador-horario-backend.onrender.com/health`
   
   Deve retornar:
   ```json
   {
     "status": "OK",
     "message": "Sistema Criador de Horário de Aula Escolar - API funcionando"
   }
   ```

---

## 🔄 PASSO 7: Conectar Frontend ao Backend

1. **Abra o arquivo:** `frontend/.env.production`

2. **Atualize com a URL do Render:**
   ```env
   VITE_API_URL=https://criador-horario-backend.onrender.com/api
   ```

3. **Salve o arquivo**

4. **Faça novo deploy do frontend:**
   ```powershell
   cd "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\frontend"
   npm run build
   surge dist --domain criador-horario-aula.surge.sh
   ```

---

## 🎯 PASSO 8: Testar Sistema Completo

1. **Acesse:** https://criador-horario-aula.surge.sh

2. **Faça login:**
   - Email: `admin@edusync-pro.com`
   - Senha: `admin123`

3. **Teste funcionalidades:**
   - ✅ Login funcionando
   - ✅ Dashboard carregando
   - ✅ Criar/listar professores
   - ✅ Criar/listar turmas
   - ✅ Gerar horário

---

## ⚙️ Configurações Avançadas (Opcional)

### Auto Deploy (Deploy Automático)
No Render, em **Settings**:
- ✅ Habilite **"Auto-Deploy"**
- Toda vez que fizer push no GitHub, deploy automático!

### Custom Domain (Domínio Próprio)
Se tiver um domínio:
1. Vá em **Settings → Custom Domain**
2. Adicione seu domínio
3. Configure DNS conforme instruções

### Health Check
Render já monitora automaticamente em:
```
GET /health
```

---

## 📊 Monitoramento

### Ver Logs em Tempo Real
1. No Render Dashboard
2. Clique no seu service
3. Aba **"Logs"**

### Métricas
- CPU usage
- Memory usage
- Request count
- Response time

---

## 🔴 IMPORTANTE: Free Tier

O plano Free do Render:
- ✅ **750 horas/mês** (suficiente para rodar 24/7)
- ⚠️ **Hiberna após 15 minutos** de inatividade
- ⏱️ **Demora ~30 segundos** para acordar do hibernação
- 🔄 **Primeira requisição após hibernar** pode ser lenta

### Como evitar hibernação (opcional):
- Use serviço de ping (UptimeRobot, Cron-job.org)
- Faça requisição a cada 10 minutos
- Ou upgrade para plano pago ($7/mês)

---

## 🆘 Troubleshooting

### "Build failed"
**Problema:** Build falhou  
**Solução:** 
1. Verifique logs do build
2. Confirme que `backend/package.json` tem `"build": "tsc"`
3. Verifique se `tsconfig.json` está correto

### "Application failed to respond"
**Problema:** Servidor não responde  
**Solução:**
1. Verifique logs em tempo real
2. Confirme MONGODB_URI está correto
3. Confirme PORT=10000
4. Verifique Start Command: `node dist/server.js`

### Erro de CORS
**Problema:** Frontend não consegue acessar backend  
**Solução:**
✅ Já configurado! Mas se der erro:
1. Verifique `backend/src/server.ts`
2. Confirme que Surge URL está no allowedOrigins
3. Faça rebuild do backend

### MongoDB Connection Error
**Problema:** Não conecta ao MongoDB Atlas  
**Solução:**
1. Confirme MONGODB_URI correto
2. No MongoDB Atlas → Network Access → Allow 0.0.0.0/0
3. Confirme senha não tem caracteres especiais (ou encode)

---

## 📝 Checklist Final

- [ ] Conta criada no Render.com
- [ ] Web Service criado
- [ ] Variáveis de ambiente configuradas
- [ ] Build concluído com sucesso
- [ ] Deploy live (bolinha verde)
- [ ] URL copiada
- [ ] Health endpoint testado
- [ ] Frontend .env.production atualizado
- [ ] Frontend re-deployado no Surge
- [ ] Login testado no sistema
- [ ] Todas funcionalidades testadas

---

## 🎉 Sucesso!

Seu sistema está 100% online:
- **Frontend:** https://criador-horario-aula.surge.sh
- **Backend:** https://criador-horario-backend.onrender.com
- **Database:** MongoDB Atlas (cloud)

**Custo total:** R$ 0,00/mês 💰

---

## 📞 Próximos Passos

1. **Configure Mercado Pago** para pagamentos reais
2. **Configure WhatsApp** para notificações
3. **Configure Email** para recuperação de senha
4. **Monitore logs** nos primeiros dias
5. **Adicione mais escolas** no sistema

---

**Dúvidas?** wanderpsc@gmail.com

**Documentação completa:** [GUIA_DEPLOY.md](GUIA_DEPLOY.md)
