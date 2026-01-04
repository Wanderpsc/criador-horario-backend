# Como Configurar Mercado Pago no Sistema

## 🔑 Passo 1: Obter Credenciais

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Faça login com sua conta Mercado Pago
3. Crie uma aplicação ou selecione uma existente
4. Vá em **Credenciais de Produção**
5. Copie o **Access Token** (começa com `APP_USR-...`)

## 📝 Passo 2: Configurar no Backend

### Criar arquivo .env no backend (se não existir)

```bash
cd backend
```

Edite ou crie o arquivo `.env` com:

```env
# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-seu-token-aqui

# URLs para callbacks
FRONTEND_URL=http://localhost:3002
WEBHOOK_URL=http://localhost:5000

# Database
MONGODB_URI=sua-connection-string

# JWT
JWT_SECRET=seu-segredo-jwt

# Email (opcional - para notificações)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
```

## 🔐 Passo 3: Configurar Chave PIX

1. No Mercado Pago, vá em **Seu Perfil** → **Dados Bancários**
2. Adicione a chave PIX: **wanderpsc2006@yahoo.com.br**
3. Confirme a chave PIX

## 🔄 Passo 4: Reiniciar Backend

Após configurar o `.env`:

```powershell
cd backend
npm start
```

## ✅ Testando

Após configurar, teste o fluxo de pagamento:

1. Acesse: http://localhost:3002/register-school
2. Cadastre uma escola de teste
3. Será redirecionado para pagamento
4. Clique em "Gerar PIX"
5. Deve aparecer o QR Code do PIX

## 🚨 Ambiente de Testes

Para **testar** antes de usar em produção:

1. Use as **Credenciais de Teste** (não produção)
2. Teste com valores pequenos
3. Use cartões de teste do Mercado Pago

### Cartões de Teste

```
Aprovado: 5031 4332 1540 6351
CVV: 123
Validade: qualquer data futura
Nome: APRO
```

## 📊 Webhooks (Opcional - para produção)

Para receber notificações automáticas de pagamento:

1. Configure uma URL pública (ex: https://seudominio.com)
2. No Mercado Pago, configure o webhook:
   - URL: `https://seudominio.com/api/payments/webhook`
   - Eventos: `payment.created`, `payment.updated`

## 🔧 Troubleshooting

### Erro "UNAUTHORIZED"
- Verifique se o Access Token está correto no `.env`
- Confirme que não há espaços extras
- Use credenciais de **Produção** para pagamentos reais

### Erro "PIX não configurado"
- Adicione uma chave PIX válida na sua conta Mercado Pago
- Aguarde aprovação da chave (pode levar alguns minutos)

### Pagamento não detectado
- Verifique se o webhook está configurado
- Confira os logs do backend para ver se recebeu a notificação
- Teste manualmente consultando status: `GET /api/payments/:id`

## 📖 Documentação Oficial

- Mercado Pago Developers: https://www.mercadopago.com.br/developers
- API Reference: https://www.mercadopago.com.br/developers/pt/reference
- SDKs: https://www.mercadopago.com.br/developers/pt/docs/sdks-library/landing

---

**© 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com**

## 🎯 Fluxo Atual do Sistema

Enquanto o Mercado Pago não estiver configurado:

1. ✅ Escola se cadastra
2. ⚠️ Tenta gerar pagamento → Recebe mensagem: "Entre em contato com wanderpsc@gmail.com"
3. 📧 Você recebe email da escola
4. 👨‍💼 Você como admin:
   - Acessa http://localhost:3002/admin-dashboard
   - Vê escolas pendentes de aprovação
   - Aprova manualmente após confirmar pagamento via PIX/Transferência

### Para Aprovar Escola Manualmente:

```powershell
# 1. Login como admin
$admin = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body (@{
    email = "wanderpsc@gmail.com"
    password = "Wpsc2025@"
} | ConvertTo-Json)

# 2. Listar escolas pendentes
$schools = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/schools" -Headers @{
    Authorization = "Bearer $($admin.token)"
}

$schools.data | Where-Object { $_.approvedByAdmin -eq $false } | Select-Object _id, email, schoolName

# 3. Aprovar escola (substitua SCHOOL_ID)
$approval = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/schools/SCHOOL_ID/approve" -Method PUT -ContentType "application/json" -Headers @{
    Authorization = "Bearer $($admin.token)"
} -Body (@{
    licenseExpiryDate = "2026-12-31"
    maxUsers = 50
    adminNotes = "Pagamento confirmado manualmente"
} | ConvertTo-Json)

Write-Host "✅ Escola aprovada!"
```
