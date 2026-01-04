# 🔐 GUIA: Como Gerar Access Token do Mercado Pago

## ❌ PROBLEMA IDENTIFICADO
O Access Token atual está **INVÁLIDO** ou **EXPIRADO**.

**Token atual:** `APP_USR-8097707897846582-010320-95aefba2f7087fc56272b15bad37d6e2-58356`

**Erro retornado:**
```
error: 'resource not found'
message: 'Si quieres conocer los recursos de la API que se encuentran disponibles'
```

---

## ✅ SOLUÇÃO: Gerar Novo Access Token

### Passo 1: Acessar o Painel do Mercado Pago
1. Acesse: https://www.mercadopago.com.br/developers
2. Faça login com sua conta Mercado Pago

### Passo 2: Suas Integrações
1. No menu lateral, clique em **"Suas integrações"**
2. Clique em **"Criar nova aplicação"** (ou selecione uma existente)

### Passo 3: Criar/Editar Aplicação
1. Nome da aplicação: **"Sistema Criador de Horário"**
2. Modelo de integração: **"Pagamentos online"**
3. Clique em **"Criar aplicação"**

### Passo 4: Obter Access Token
1. Na página da aplicação, vá em **"Credenciais"**
2. Selecione o ambiente:
   - **PRODUÇÃO** (para pagamentos reais)
   - **TESTE** (para desenvolvimento)

3. Copie o **"Access Token"**
   - Começa com: `APP_USR-...`
   - Tem formato: `APP_USR-XXXXXXXX-XXXXXX-XXXX-XXXX-XXXX`

### Passo 5: Atualizar .env
1. Abra o arquivo `backend/.env`
2. Substitua a linha:
   ```env
   MERCADO_PAGO_ACCESS_TOKEN=APP_USR-8097707897846582-010320-95aefba2f7087fc56272b15bad37d6e2-58356
   ```

3. Pelo novo token:
   ```env
   MERCADO_PAGO_ACCESS_TOKEN=APP_USR-SEU_NOVO_TOKEN_AQUI
   ```

### Passo 6: Configurar Webhook (Opcional)
Se quiser notificações automáticas de pagamento:

1. Na aplicação, vá em **"Webhooks"** ou **"Notificações"**
2. Adicione a URL: `https://seudominio.com/api/payments/webhook`
3. Eventos: Selecione **"Pagamentos"**

### Passo 7: Testar Novamente
```bash
cd backend
node test-mercadopago-connection.js
```

Se aparecer:
```
✅ Token válido! Usuário: seu-email@example.com
✅ PREFERÊNCIA CRIADA COM SUCESSO!
```

**Está funcionando!** 🎉

---

## 📋 CHECKLIST

- [ ] Acessei https://www.mercadopago.com.br/developers
- [ ] Criei ou selecionei uma aplicação
- [ ] Copiei o Access Token (Produção ou Teste)
- [ ] Atualizei o arquivo `backend/.env`
- [ ] Executei: `node test-mercadopago-connection.js`
- [ ] Vi mensagem de sucesso ✅

---

## 🆘 PROBLEMAS COMUNS

### 1. "resource not found"
- ❌ Token inválido, expirado ou copiado incorretamente
- ✅ Gere um novo token e copie novamente

### 2. "invalid credentials"
- ❌ Token de ambiente errado (teste vs produção)
- ✅ Verifique se está usando o token correto

### 3. "forbidden"
- ❌ Aplicação sem permissões
- ✅ Recrie a aplicação com modelo "Pagamentos online"

---

## 📞 SUPORTE

**Documentação oficial:**
https://www.mercadopago.com.br/developers/pt/docs

**Painel de aplicações:**
https://www.mercadopago.com.br/developers/panel/app

---

## ⏭️ PRÓXIMOS PASSOS (Após gerar novo token)

1. ✅ Atualizar `.env` com novo token
2. ✅ Testar conexão: `node test-mercadopago-connection.js`
3. ✅ Testar PIX: `node test-card-payment.js` (mudar para 'pix')
4. ✅ Testar Cartão: `node test-card-payment.js`
5. ✅ Reiniciar backend: `npm start`
6. ✅ Testar no frontend: http://localhost:3001/payment-checkout

---

**© 2025 Wander Pires Silva Coelho**
**E-mail:** wanderpsc@gmail.com
