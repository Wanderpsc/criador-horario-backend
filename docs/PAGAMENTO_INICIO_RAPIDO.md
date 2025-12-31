# 💳 Sistema de Pagamento - Início Rápido

## ⚡ Configuração em 5 Minutos

### 1. Obter Access Token do Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel
2. Crie uma aplicação ou use existente
3. Copie o **Access Token de Produção**

### 2. Configurar .env

Edite `backend/.env` e adicione:

```env
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-XXXXXX-XXXXXX-XXXXXX
WEBHOOK_URL=https://seu-dominio.com
FRONTEND_URL=http://localhost:3001
```

### 3. Iniciar Sistema

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run dev
```

### 4. Testar

1. Registre uma escola: http://localhost:3001/register-school
2. Vá para: http://localhost:3001/payment-checkout
3. Selecione um plano e método de pagamento
4. Teste com PIX ou cartão

## 🎯 Fluxo Rápido

```
Cliente → Checkout → PIX/Cartão → Pagamento → Webhook → Licença Ativa ✅
```

## 🔔 Webhook (Importante!)

Configure no painel do Mercado Pago:
```
URL: https://seu-dominio.com/api/payments/webhook
Eventos: Payments, Merchant Orders
```

## 🧪 Testar Localmente

Use **ngrok** para expor webhook:

```bash
ngrok http 5000
# Copie URL HTTPS e configure no Mercado Pago
```

## 📊 Painel Admin

http://localhost:3001/payments-management

- Ver todas as transações
- Filtrar por status
- Acompanhar receita

## 💰 Planos e Preços

| Plano | Preço | Desconto 12 meses |
|-------|-------|-------------------|
| Básico | R$ 99/mês | 15% OFF |
| Profissional | R$ 199/mês | 15% OFF |
| Personalizado | R$ 450 + R$ 150/horário | - |

## 🆘 Problemas Comuns

**Pagamento não ativa licença?**
- Webhook configurado no MP?
- URL pública acessível?
- Logs do backend: procure por "📨 Webhook recebido"

**QR Code não aparece?**
- Access Token correto?
- Erro no console?

## 📞 Suporte

**Wander Pires Silva Coelho**  
wanderpsc@gmail.com  
PIX: wanderpsc2006@yahoo.com.br

---

**Documentação completa:** [docs/SISTEMA_PAGAMENTO.md](./SISTEMA_PAGAMENTO.md)
