# 🔧 Correção: Erro 404 no QR Code PIX

© 2025 Wander Pires Silva Coelho

---

## ❌ Problema Identificado:

O frontend estava tentando se conectar ao backend local (`localhost:5000`) ao invés do backend em produção no Render.

### Erro observado:
```
Failed to load resource: the server responded with a status of 404
```

### Causa:
O arquivo `.env.production` estava configurado com URL incorreta:
- ❌ **Antes**: `https://criador-horario-backend-1.onrender.com/api`
- ✅ **Depois**: `https://criador-horario-backend.onrender.com/api`

---

## ✅ Solução Implementada:

### Arquivo corrigido: `frontend/.env.production`

```env
# API URL para produção
# Backend deployado no Render.com
VITE_API_URL=https://criador-horario-backend.onrender.com/api
```

---

## 🚀 Deploy Realizado:

- ✅ Build do frontend concluído
- ✅ Deploy no GitHub Pages realizado
- ⏱️ Aguarde 1-2 minutos para propagação

---

## 🧪 Como Testar o QR Code PIX:

### 1. Aguarde 1-2 minutos para propagação

### 2. Acesse a página de pagamento:
```
https://wanderpsc.github.io/criador-horario-backend/payment-checkout?plan=basico&email=escola@teste.com&schoolName=Escola%20Teste
```

Ou acesse pelo fluxo normal:
1. Cadastro de escola: https://wanderpsc.github.io/criador-horario-backend/register-school
2. Preencha o formulário
3. Será redirecionado para página de pagamento

### 3. Na página de pagamento:
- Selecione um plano (Básico ou Profissional)
- Escolha a duração (1, 3, 6 ou 12 meses)
- **Selecione PIX como forma de pagamento**
- Clique em **"Gerar Pagamento PIX"**

### 4. O que deve acontecer:
- ✅ Loading aparece
- ✅ Requisição vai para: `https://criador-horario-backend.onrender.com/api/payments/create-public`
- ✅ QR Code deve aparecer
- ✅ Código PIX Copia e Cola disponível

---

## 🔍 Debug (F12 - Console):

### Se funcionar corretamente, você verá:
```
📤 POST https://criador-horario-backend.onrender.com/api/payments/create-public
📥 Response: { success: true, qrCode: "...", qrCodeBase64: "..." }
```

### Se ainda der erro 404:
```
❌ POST https://criador-horario-backend.onrender.com/api/payments/create-public
Status: 404 Not Found
```

**Possíveis causas:**
1. Backend do Render está inativo (free tier dorme após inatividade)
2. URL do backend mudou
3. Rota não existe no backend

---

## ⚠️ Importante sobre Render Free Tier:

O backend no Render **free tier** pode:
- 🕒 **Dormir** após 15 minutos de inatividade
- ⏱️ **Demorar ~30-60 segundos** para acordar na primeira requisição
- ❄️ **Parecer não responder** inicialmente

### Se o backend estiver dormindo:
1. A primeira requisição pode dar timeout
2. Aguarde 1 minuto
3. Tente novamente
4. O backend vai "acordar" e funcionar

### Como evitar que o backend durma:
Você pode usar serviços de ping gratuitos:
- https://uptimerobot.com
- https://cron-job.org

Configure para fazer ping no backend a cada 10 minutos:
```
https://criador-horario-backend.onrender.com/health
```

---

## 🔧 Verificar se Backend está Online:

### Teste manual no navegador:
```
https://criador-horario-backend.onrender.com/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-14T..."
}
```

### Se retornar 404 ou erro:
1. Acesse: https://dashboard.render.com
2. Verifique o status do serviço
3. Veja os logs para erros
4. Pode precisar fazer redeploy manual

---

## 📋 Checklist de Teste:

- [ ] Aguardado 1-2 minutos após deploy
- [ ] Página de pagamento acessada
- [ ] Plano selecionado
- [ ] PIX selecionado como pagamento
- [ ] Botão "Gerar Pagamento PIX" clicado
- [ ] Backend responde (não dá 404)
- [ ] QR Code aparece na tela
- [ ] Código Copia e Cola disponível
- [ ] Console não mostra erros

---

## 🎯 Resultado Esperado:

### Antes da correção:
```
❌ POST http://localhost:5000/api/payments/create-public
❌ Failed to load resource: 404
```

### Depois da correção:
```
✅ POST https://criador-horario-backend.onrender.com/api/payments/create-public
✅ Status: 200 OK
✅ QR Code: ████████ (imagem aparece)
✅ Código: 00020126...
```

---

## 📞 Se o Problema Persistir:

### 1. Limpe o cache do navegador:
- Ctrl + Shift + Delete
- Selecione "Cache" e "Cookies"
- Limpe os últimos 7 dias

### 2. Teste em aba anônima:
- Ctrl + Shift + N (Chrome)
- Ctrl + Shift + P (Firefox)

### 3. Verifique a URL do backend:
Abra o console (F12) e digite:
```javascript
console.log(import.meta.env.VITE_API_URL)
```

Deve mostrar:
```
https://criador-horario-backend.onrender.com/api
```

### 4. Aguarde o backend acordar:
Se for a primeira requisição em 15+ minutos:
- Aguarde 30-60 segundos
- Tente novamente
- Backend levará tempo para iniciar

---

## 🚨 Nota sobre Mercado Pago:

Para o QR Code PIX funcionar **completamente**, o Mercado Pago precisa:

1. ✅ Chave PIX cadastrada na conta
2. ✅ Token de acesso válido
3. ✅ Conta verificada

Se o QR Code não aparecer, pode ser problema na configuração do Mercado Pago, não do frontend.

Consulte: [SOLUCIONAR_ERRO_PIX.md](./SOLUCIONAR_ERRO_PIX.md)

---

## ✅ Deploy Completo:

- ✅ `.env.production` corrigido
- ✅ Frontend buildado
- ✅ Deploy no GitHub Pages realizado
- ✅ URL do backend atualizada
- ⏱️ Aguardando propagação (1-2 minutos)

---

© 2025 Wander Pires Silva Coelho
E-mail: wanderpsc@gmail.com
