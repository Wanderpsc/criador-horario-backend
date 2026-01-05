# 🔧 CORREÇÃO DE ERRO CORS - RENDER

## ❌ Erro Atual
```
Access to XMLHttpRequest at 'https://criador-horario-backend-1.onrender.com/api/notifications' 
from origin 'https://criador-horario-aula.surge.sh' has been blocked by CORS policy
```

## ✅ Solução

O backend está configurado corretamente, mas o **Render precisa da variável de ambiente** `FRONTEND_URL`.

### Passo 1: Acessar Render Dashboard
1. Acesse: https://dashboard.render.com
2. Entre na sua conta
3. Clique no serviço: **criador-horario-backend-1**

### Passo 2: Adicionar Variável de Ambiente
1. No menu lateral, clique em **"Environment"**
2. Clique em **"Add Environment Variable"**
3. Preencha:
   - **Key**: `FRONTEND_URL`
   - **Value**: `https://criador-horario-aula.surge.sh`
4. Clique em **"Save Changes"**

### Passo 3: Aguardar Redeploy
- O Render fará redeploy automático (leva 2-3 minutos)
- Aguarde até o status ficar **"Live"**

### Passo 4: Testar
Acesse: https://criador-horario-aula.surge.sh

**Login de teste:**
- Email: escola@ceti.com
- Senha: Ceti2025@

Os componentes curriculares devem aparecer normalmente.

---

## 🔍 Verificação Técnica

O backend já está preparado para aceitar o Surge:

```typescript
// backend/src/server.ts
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'https://criador-horario-aula.surge.sh',  // ✅ Já configurado
  process.env.FRONTEND_URL                  // ❌ Faltando no Render
];
```

## ⏱️ Tempo Estimado
- Configuração: 1 minuto
- Redeploy automático: 2-3 minutos
- **Total: ~5 minutos**

---

## 🚨 Se Persistir o Erro

1. **Verificar logs do Render:**
   - Dashboard → criador-horario-backend-1 → Logs
   - Procure por: `❌ CORS bloqueado para origem:`

2. **Verificar variáveis:**
   - Dashboard → Environment
   - Confirme que `FRONTEND_URL` está presente

3. **Forçar redeploy manual:**
   - Dashboard → Manual Deploy → Deploy Latest Commit

---

## ✅ Após Correção

Os seguintes erros devem desaparecer:
- ❌ Access to XMLHttpRequest blocked by CORS
- ❌ No 'Access-Control-Allow-Origin' header
- ❌ Failed to load resource: net::ERR_FAILED

E os componentes curriculares voltarão a aparecer! 🎉
