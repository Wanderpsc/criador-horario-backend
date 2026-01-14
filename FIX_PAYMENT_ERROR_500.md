# 🔧 Corrigir Erro 500 em /api/payments/create-public

© 2025 Wander Pires Silva Coelho

## 🔴 Problema Identificado

O erro 500 está ocorrendo porque o **token do Mercado Pago** não está configurado ou está expirado no Render.

## ✅ Solução Passo a Passo

### 1️⃣ Verificar Token do Mercado Pago

Acesse: **https://www.mercadopago.com.br/developers/panel/app**

1. Faça login no Mercado Pago
2. Vá em **"Suas integrações"** → **"Suas aplicações"**
3. Selecione sua aplicação ou crie uma nova
4. Copie o **"Access Token"** de **PRODUÇÃO**
   - Deve começar com `APP_USR-`
   - Exemplo: `APP_USR-8624658040903889-010322-4f9240f477d96f3a7539c751a2cf3d53-58356`

### 2️⃣ Configurar no Render

1. Acesse: **https://dashboard.render.com**
2. Selecione seu serviço: **criador-horario-backend**
3. Vá em **"Environment"** (menu lateral)
4. Procure pela variável: **`MERCADO_PAGO_ACCESS_TOKEN`**

**Se a variável NÃO EXISTE:**
   - Clique em **"Add Environment Variable"**
   - Key: `MERCADO_PAGO_ACCESS_TOKEN`
   - Value: Cole o token que você copiou
   - Clique em **"Save Changes"**

**Se a variável JÁ EXISTE:**
   - Clique no ícone de **editar** (lápis)
   - Cole o novo token
   - Clique em **"Save Changes"**

### 3️⃣ Reiniciar o Serviço

Após salvar, o Render automaticamente reiniciará o serviço.

**OU** faça manualmente:
1. Vá em **"Manual Deploy"**
2. Clique em **"Deploy latest commit"**

### 4️⃣ Verificar Logs

1. Vá em **"Logs"** no Render
2. Procure por:

✅ **Logs de sucesso:**
```
✅ [MP] Mercado Pago inicializado
🔑 [MP] Token presente: APP_USR-8624658...
```

❌ **Logs de erro:**
```
⚠️ [MP] ACCESS_TOKEN não configurado!
⚠️ [MP] Configure MERCADO_PAGO_ACCESS_TOKEN no arquivo .env
```

### 5️⃣ Testar o Pagamento

1. Acesse seu site: https://criador-horario-backend.onrender.com
2. Tente fazer um cadastro de escola
3. Verifique se o QR Code PIX é gerado corretamente

---

## 🔍 Variáveis Obrigatórias no Render

Certifique-se de que **TODAS** estas variáveis estão configuradas:

```bash
# Banco de Dados
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=seu_secret_aqui
JWT_EXPIRE=7d

# URLs
FRONTEND_URL=https://criador-horario-backend.onrender.com
CORS_ORIGIN=https://criador-horario-backend.onrender.com

# Email
EMAIL_USER=wanderpsc@gmail.com
EMAIL_PASSWORD=sua_senha_app_gmail

# MERCADO PAGO ⚠️ CRÍTICO
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-seu-token-aqui

# Webhook (opcional em desenvolvimento)
WEBHOOK_URL=https://criador-horario-backend.onrender.com

# WhatsApp (opcional)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_ACCESS_TOKEN=
```

---

## 🆘 Se Ainda Não Funcionar

### Opção A: Gerar Novo Token

Se o token atual expirou:

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Vá em **"Credenciais de produção"**
3. Clique em **"Gerar novo token"**
4. Copie o novo token
5. Atualize no Render

### Opção B: Modo Fallback

O sistema agora tem um **modo fallback** que permite o cadastro mesmo se o Mercado Pago estiver offline:

- ✅ Cadastro da escola é salvo
- ✅ Usuário recebe instruções para contato manual
- ✅ Pagamento pode ser processado manualmente

**Quando isso acontece:**
```json
{
  "success": false,
  "fallbackMode": true,
  "message": "⚠️ Sistema de pagamento temporariamente indisponível",
  "instructions": [
    "Seu cadastro foi registrado com sucesso",
    "Entre em contato: wanderpsc@gmail.com",
    "Referência: PAY-1234567890-abc"
  ]
}
```

---

## 📊 Melhorias Implementadas

✅ **Logs detalhados** no serviço do Mercado Pago  
✅ **Verificação de token** antes de fazer requisições  
✅ **Tratamento de erro melhorado** na rota `/create-public`  
✅ **Modo fallback** para quando o Mercado Pago está offline  
✅ **Mensagens de erro mais informativas** para o usuário  

---

## 🔄 Deploy das Correções

Para aplicar as correções no Render:

### Opção 1: Via Git (Recomendado)

```powershell
# No seu terminal local
git add .
git commit -m "fix: Melhorar tratamento de erro no pagamento e logs do Mercado Pago"
git push origin main
```

O Render detectará automaticamente e fará o deploy.

### Opção 2: Manual

1. Acesse o Render Dashboard
2. Vá em **"Manual Deploy"**
3. Clique em **"Clear build cache & deploy"**

---

## 📞 Suporte

Se o problema persistir, entre em contato:
- **Email:** wanderpsc@gmail.com
- **Informações necessárias:**
  - Print dos logs do Render
  - Mensagem de erro completa
  - Horário do erro

---

**Status:** ✅ Correções implementadas e prontas para deploy
**Data:** 14/01/2026
