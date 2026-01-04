# 🔧 Solução: Erro "UNAUTHORIZED" no PIX

## ❌ Erro Atual
```
At least one policy returned UNAUTHORIZED
```

## ✅ Soluções (em ordem de prioridade)

### 1️⃣ **Configure a Chave PIX** (OBRIGATÓRIO)

O Mercado Pago não pode gerar QR Code sem uma chave PIX configurada.

**Passos:**
1. Acesse: https://www.mercadopago.com.br
2. Faça login
3. Vá em: **Seu Negócio** → **Configurações** → **Dados bancários**
4. Clique em **"Chaves PIX"**
5. Adicione a chave: **wanderpsc2006@yahoo.com.br**
6. Confirme o código enviado por email
7. **Aguarde até 24h** para ativação completa

---

### 2️⃣ **Verifique se o Token é de PRODUÇÃO**

Tokens de teste não funcionam para pagamentos reais.

**Como verificar:**
- Token de **PRODUÇÃO**: `APP_USR-` (você tem ✅)
- Token de **TESTE**: `TEST-`

Seu token atual: `APP_USR-34454e51-7058-4263-a963-1d3874dcfc57` ✅

---

### 3️⃣ **Verifique Permissões da Aplicação**

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Selecione sua aplicação
3. Vá em **"Credenciais"**
4. Verifique se estas permissões estão ativas:
   - ✅ **Processar pagamentos**
   - ✅ **Gerenciar vendas e recebimentos**
   - ✅ **Ler dados de pagamentos**

---

### 4️⃣ **Verifique Status da Conta**

**Conta deve estar:**
- ✅ Verificada (CPF/CNPJ confirmado)
- ✅ Ativa (não suspensa)
- ✅ Com dados bancários completos

**Como verificar:**
1. https://www.mercadopago.com.br/settings/account
2. Confira se todos os dados estão completos
3. Se houver pendências, resolva-as

---

### 5️⃣ **Teste com Token de Teste (Desenvolvimento)**

Para testar sem configurar tudo:

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Copie o **"Access Token de TESTE"** (começa com TEST-)
3. Substitua no arquivo `.env`:
```env
MERCADO_PAGO_ACCESS_TOKEN=TEST-seu-token-aqui
```
4. Reinicie o backend

⚠️ **Atenção**: Token de teste só funciona em ambiente sandbox!

---

## 🧪 Como Testar se Resolveu

Depois de configurar a chave PIX:

```powershell
# Teste rápido via PowerShell
$body = @{
  plan = "basico"
  durationMonths = 1
  paymentMethod = "pix"
  email = "teste@escola.com"
  schoolName = "Escola Teste"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/payments/create-public" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**Resultado esperado:**
```json
{
  "success": true,
  "qrCode": "00020126...", 
  "qrCodeBase64": "iVBORw0KGgo...",
  "amount": 119.90
}
```

---

## 📱 Ou Teste Visualmente

1. Acesse: http://localhost:3002/register-school
2. Cadastre uma escola
3. Clique em **"Gerar PIX"**
4. O QR Code deve aparecer! 🎉

---

## ⚠️ Se Ainda Não Funcionar

Entre em contato com o suporte do Mercado Pago:
- 📞 Tel: 4020-7888 (capitais) / 0800 275 2070 (outras regiões)
- 💬 Chat: https://www.mercadopago.com.br/ajuda
- 📧 Desenvolvedores: https://www.mercadopago.com.br/developers/pt/support

Envie:
- ID da sua aplicação
- Mensagem de erro: "At least one policy returned UNAUTHORIZED"
- Pergunta: "Por que não consigo gerar pagamentos PIX?"

---

## ✨ Status Atual do Sistema

✅ **Código implementado corretamente**
✅ **Token configurado no backend**
✅ **Frontend preparado para exibir QR Code**
⚠️ **Aguardando configuração da chave PIX**

Assim que a chave PIX for ativada, o sistema funcionará perfeitamente!
