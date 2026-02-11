# Correção de Erros de Comunicação Frontend-Backend

**Data:** 11/02/2026  
**Status:** ✅ Logs Melhorados - Aguardando Diagnóstico

---

## 🐛 Erros Reportados

### Console do Navegador:
```
❌ Erro na resposta: /school Object
Erro ao buscar dados da escola: Ke
❌ Erro na resposta: /notifications Network Error
```

---

## 🔍 Diagnóstico Realizado

### 1. **Configuração da API**

**Frontend (.env):**
```
VITE_API_URL=https://criador-horario-backend-1.onrender.com/api
```

**Rotas Backend (server.ts):**
```typescript
app.use('/api/schools', schoolRoutes);
app.use('/api/school', schoolRoutes); // ✅ Atalho singular
app.use('/api/notifications', notificationRoutes);
```

✅ **Rotas estão corretamente registradas no backend**

### 2. **Origem do Erro**

**TeacherAttendance.tsx (linha 177):**
```tsx
const response = await api.get('/school');
```

**NotificationSettings.tsx e NotificationCenter.tsx:**
```tsx
const response = await api.get('/notifications');
```

✅ **Endpoints corretos sendo chamados**

---

## 🛠️ Correções Implementadas

### ✅ **Melhorias nos Interceptores de Erro**

#### Antes:
```typescript
(error) => {
  console.error('❌ Erro na resposta:', error.config?.url, error.response?.data || error.message);
  return Promise.reject(error);
}
```

#### Depois:
```typescript
(error) => {
  // Log detalhado de erro
  console.error('❌ [AXIOS ERROR] Erro na resposta:');
  console.error('   URL:', error.config?.url);
  console.error('   Method:', error.config?.method?.toUpperCase());
  console.error('   Status:', error.response?.status);
  console.error('   Status Text:', error.response?.statusText);
  console.error('   Response Data:', error.response?.data);
  console.error('   Error Message:', error.message);
  
  // Verificar se é erro de rede (backend offline ou CORS)
  if (error.message === 'Network Error') {
    console.error('🌐 ERRO DE REDE: Backend pode estar offline ou há problema de CORS');
    console.error('   Base URL configurada:', api.defaults.baseURL);
  }
  
  if (error.response?.status === 401) {
    console.warn('⚠️ Token expirado ou inválido. Redirecionando para login...');
    localStorage.removeItem('auth-storage');
    window.location.href = '/login';
  }
  
  return Promise.reject(error);
}
```

### ✅ **Arquivos Modificados:**
1. `frontend/src/lib/axios.ts` - Interceptor principal
2. `frontend/src/services/api.ts` - Interceptor secundário

---

## 📊 Possíveis Causas do Erro

### 1. **Backend Offline/Sleep Mode (Render.com)**
- ⚠️ **Render.com:** Free tier coloca app em sleep após inatividade
- ⏱️ **Despertar:** Primeira requisição pode levar 30-60 segundos
- 🔄 **Solução:** Aguardar ou fazer ping periódico

**Teste rápido:**
```bash
curl https://criador-horario-backend-1.onrender.com/health
```

### 2. **Problema de CORS**
- ❌ Se origem do frontend não estiver na whitelist
- 📋 **Origens permitidas (backend):**
  ```typescript
  const allowedOrigins = [
    'https://criador-horario-aula.surge.sh',
    'https://horario-escolar.surge.sh',
    'https://edusync-pro.surge.sh',
    'https://wanderpsc.github.io',
    // ...
  ];
  ```

### 3. **Token de Autenticação Inválido**
- 🔑 Token expirado ou malformado
- 🚫 Backend retorna 401 Unauthorized
- 🔄 Frontend agora remove token e redireciona para login

### 4. **Problema de Rede Local**
- 🌐 Firewall bloqueando requisições HTTPS
- 📡 DNS não resolvendo domínio
- 🔌 Conexão de internet instável

---

## 🧪 Como Diagnosticar com Novos Logs

### Agora você verá no console:

#### **Erro de Rede (Backend Offline):**
```
❌ [AXIOS ERROR] Erro na resposta:
   URL: /school
   Method: GET
   Status: undefined
   Status Text: undefined
   Response Data: undefined
   Error Message: Network Error
🌐 ERRO DE REDE: Backend pode estar offline ou há problema de CORS
   Base URL configurada: https://criador-horario-backend-1.onrender.com/api
```

#### **Erro 401 (Token Inválido):**
```
❌ [AXIOS ERROR] Erro na resposta:
   URL: /school
   Method: GET
   Status: 401
   Status Text: Unauthorized
   Response Data: { success: false, message: "Token inválido" }
   Error Message: Request failed with status code 401
⚠️ Token expirado ou inválido. Redirecionando para login...
```

#### **Erro 404 (Rota não encontrada):**
```
❌ [AXIOS ERROR] Erro na resposta:
   URL: /school
   Method: GET
   Status: 404
   Status Text: Not Found
   Response Data: { message: "Rota não encontrada" }
   Error Message: Request failed with status code 404
```

#### **Erro 500 (Backend Error):**
```
❌ [AXIOS ERROR] Erro na resposta:
   URL: /school
   Method: GET
   Status: 500
   Status Text: Internal Server Error
   Response Data: { error: "Erro ao buscar escola" }
   Error Message: Request failed with status code 500
```

---

## ✅ Próximos Passos

### 1. **Verificar se Backend Está Online**

Abra o navegador e acesse:
```
https://criador-horario-backend-1.onrender.com/health
```

**Resposta esperada:**
```json
{
  "status": "OK",
  "message": "Sistema funcionando",
  "timestamp": "2026-02-11T..."
}
```

### 2. **Verificar Logs do Render.com**

1. Acesse [Render Dashboard](https://dashboard.render.com/)
2. Selecione o serviço `criador-horario-backend-1`
3. Vá em "Logs"
4. Procure por erros ou avisos

### 3. **Forçar Despertar do Backend (se em sleep)**

Execute manualmente no navegador:
```javascript
// Acesse o console do navegador (F12)
fetch('https://criador-horario-backend-1.onrender.com/health')
  .then(res => res.json())
  .then(data => console.log('✅ Backend online:', data))
  .catch(err => console.error('❌ Backend offline:', err));
```

### 4. **Verificar Token no LocalStorage**

```javascript
// Console do navegador (F12)
const authStorage = localStorage.getItem('auth-storage');
if (authStorage) {
  const parsed = JSON.parse(authStorage);
  console.log('🔑 Token:', parsed.state?.token ? 'Presente' : 'Ausente');
  console.log('👤 User:', parsed.state?.user);
} else {
  console.log('❌ Sem auth-storage');
}
```

### 5. **Limpar Cache e Testar Novamente**

```javascript
// Limpar todo o localStorage
localStorage.clear();
// Recarregar página
location.reload();
// Fazer login novamente
```

---

## 🚀 Deploy Atualizado

### Frontend compilado com novos logs:
```bash
✅ npm run build - Sucesso
✅ Assets gerados em dist/
✅ Logs detalhados habilitados
```

### Para fazer deploy:
```powershell
# Surge
cd frontend
surge dist --domain criador-horario-aula.surge.sh

# GitHub Pages (se aplicável)
# Push para branch main/master
```

---

## 📝 Checklist de Troubleshooting

- [ ] Backend respondendo em `/health`?
- [ ] Frontend fazendo requisição para URL correta?
- [ ] Token presente no localStorage?
- [ ] Logs detalhados aparecendo no console?
- [ ] Erro específico identificado (Network/401/404/500)?
- [ ] CORS configurado para origem do frontend?
- [ ] Backend no Render ativo (não em sleep)?

---

## 🔧 Configuração de Ambiente

### Frontend (.env):
```env
VITE_API_URL=https://criador-horario-backend-1.onrender.com/api
```

### Backend (Render Environment Variables):
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
FRONTEND_URL=https://criador-horario-aula.surge.sh
```

---

## 📌 Notas Importantes

1. **Render Free Tier:** Backend entra em sleep após 15 minutos de inatividade
2. **Despertar:** Primeira requisição após sleep pode levar 30-60s
3. **CORS:** Se mudar domínio do frontend, atualizar `allowedOrigins` no backend
4. **Token JWT:** Expira em 30 dias (padrão), verificar configuração se diferente

---

## 🔗 Links Úteis

- **Frontend Produção:** https://criador-horario-aula.surge.sh
- **Backend Produção:** https://criador-horario-backend-1.onrender.com
- **Health Check:** https://criador-horario-backend-1.onrender.com/health
- **Render Dashboard:** https://dashboard.render.com/

---

© 2025 Wander Pires Silva Coelho  
📧 wanderpsc@gmail.com  
Todos os direitos reservados.
