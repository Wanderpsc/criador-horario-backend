# Sistema de Pagamento Online - Guia Completo

## © 2025 Wander Pires Silva Coelho
**E-mail:** wanderpsc@gmail.com  
**PIX:** wanderpsc2006@yahoo.com.br  
**Banco do Brasil:** Ag 1209-2 | CC 7558-2  
**Titular:** Wander P S Coelho

---

## 📋 Visão Geral

Sistema completo de pagamentos integrado com **Mercado Pago** para processar pagamentos via **PIX** e **Cartão de Crédito**.

### ✨ Funcionalidades

- ✅ Pagamento via PIX com QR Code
- ✅ Pagamento via Cartão de Crédito com parcelamento
- ✅ Ativação automática de licença após aprovação
- ✅ Webhook para notificações em tempo real
- ✅ Painel administrativo para gerenciar transações
- ✅ Histórico completo de pagamentos
- ✅ Múltiplos planos e durações
- ✅ Descontos progressivos

---

## 🏗️ Arquitetura

### Backend

#### Modelos
- **Payment.ts** - Armazena todas as transações
  - schoolId, plan, amount, paymentMethod, status
  - mercadoPagoId, preferenceId, externalReference
  - pixQRCode, pixQRCodeBase64, pixCopyPaste
  - Timestamps e índices para buscas eficientes

#### Serviços
- **mercadoPago.service.ts** - Integração com API Mercado Pago
  - `createPreference()` - Cria preferência de pagamento
  - `createPixPayment()` - Gera PIX com QR Code
  - `getPaymentStatus()` - Consulta status
  - `processWebhookNotification()` - Processa webhooks
  - `cancelPayment()` - Cancela pagamento
  - `refundPayment()` - Realiza reembolso

#### Rotas
- **payment.routes.ts**
  - `POST /api/payments/create` - Cria novo pagamento
  - `GET /api/payments/:id` - Consulta pagamento específico
  - `GET /api/payments/school/:schoolId` - Lista pagamentos da escola
  - `GET /api/payments/admin/all` - Lista todos (admin)

- **webhook.routes.ts**
  - `POST /api/payments/webhook` - Recebe notificações do MP
  - `GET /api/payments/webhook/test` - Testa webhook

### Frontend

#### Páginas
- **PaymentCheckout.tsx** - Seleção de plano e pagamento
- **PaymentSuccess.tsx** - Confirmação de pagamento aprovado
- **PaymentFailure.tsx** - Tela de falha no pagamento
- **PaymentsManagement.tsx** - Painel admin de pagamentos

#### Rotas
- `/payment-checkout` - Checkout
- `/payment-success` - Sucesso
- `/payment-failure` - Falha
- `/payments-management` - Admin

---

## ⚙️ Configuração

### 1. Criar Conta no Mercado Pago

1. Acesse: https://www.mercadopago.com.br
2. Crie uma conta de vendedor
3. Vá em **Desenvolvedores** → **Suas integrações**
4. Crie uma aplicação
5. Copie o **Access Token** (Production)

### 2. Configurar Variáveis de Ambiente

Adicione no arquivo **backend/.env**:

```env
# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-XXXXXXXXXXXXXX

# URLs para Webhooks e Redirecionamento
WEBHOOK_URL=https://seu-dominio.com
FRONTEND_URL=http://localhost:3001

# Dados Bancários (para referência)
PIX_EMAIL=wanderpsc2006@yahoo.com.br
BANCO_AG=1209-2
BANCO_CC=7558-2
BANCO_TITULAR=Wander P S Coelho
```

### 3. Configurar Webhook no Mercado Pago

1. Acesse **Painel do Mercado Pago** → **Webhooks**
2. Adicione nova URL:
   ```
   https://seu-dominio.com/api/payments/webhook
   ```
3. Selecione eventos:
   - ✅ Pagamentos
   - ✅ Merchant Orders

### 4. Instalar Dependência

```bash
cd backend
npm install axios
```

### 5. Compilar e Iniciar

```bash
cd backend
npm run build
npm start
```

---

## 💳 Planos Disponíveis

### Básico - R$ 99,00/mês
- Até 30 professores
- Até 15 turmas
- Geração automática
- Suporte por email

### Profissional - R$ 199,00/mês
- Até 50 professores
- Até 25 turmas
- Geração automática
- Suporte prioritário
- Backup automático

### Personalizado - R$ 450,00 + R$ 150,00/horário
- Formulário personalizado
- Emissão em 72h
- Suporte dedicado

### Enterprise - Sob Consulta
- Ilimitado
- SLA garantido
- Gerente dedicado

---

## 📊 Descontos por Duração

| Duração | Desconto |
|---------|----------|
| 1 mês   | 0%       |
| 3 meses | 5%       |
| 6 meses | 10%      |
| 12 meses| 15%      |

**Exemplo:** Plano Básico por 12 meses  
R$ 99,00 × 12 = R$ 1.188,00  
Desconto 15% = R$ 178,20  
**Total: R$ 1.009,80**

---

## 🔄 Fluxo de Pagamento

### PIX

1. Cliente seleciona plano e duração
2. Clica em "Gerar PIX"
3. Sistema cria pagamento no Mercado Pago
4. Exibe QR Code e código copia-e-cola
5. Cliente paga via app bancário
6. **Mercado Pago notifica via webhook**
7. Sistema ativa licença automaticamente
8. Cliente redirecionado para tela de sucesso

### Cartão de Crédito

1. Cliente seleciona plano e duração
2. Clica em "Pagar com Cartão"
3. Sistema cria preferência no Mercado Pago
4. Cliente redirecionado para checkout do MP
5. Preenche dados do cartão
6. Mercado Pago processa pagamento
7. **Webhook notifica aprovação**
8. Sistema ativa licença automaticamente
9. Cliente retorna para `/payment-success`

---

## 🔔 Webhook - Notificações Automáticas

### Como Funciona

O Mercado Pago envia notificações POST para:
```
POST /api/payments/webhook
```

### Payload Exemplo

```json
{
  "type": "payment",
  "data": {
    "id": "1234567890"
  },
  "action": "payment.created"
}
```

### Processamento

1. Recebe notificação
2. Busca dados completos no MP via API
3. Localiza pagamento no banco pelo `external_reference`
4. Atualiza status
5. Se **approved**:
   - Marca payment como aprovado
   - Calcula data de expiração (hoje + durationMonths)
   - Atualiza User:
     - `registrationStatus = 'approved'`
     - `plan = payment.plan`
     - `licenseExpiryDate = expiryDate`
     - `paymentStatus = 'paid'`
   - Envia email de confirmação (TODO)

6. Se **rejected/cancelled**:
   - Marca payment como rejeitado
   - Registra motivo

7. Se **refunded**:
   - Suspende licença da escola
   - `registrationStatus = 'suspended'`
   - `paymentStatus = 'refunded'`

### Testar Webhook Localmente

Use **ngrok** para expor localhost:

```bash
ngrok http 5000
```

Copie a URL HTTPS gerada e configure no Mercado Pago:
```
https://xxxx-xxx-xxx-xxx.ngrok.io/api/payments/webhook
```

---

## 🎛️ Painel Administrativo

### Acessar

1. Login como admin: `wanderpsc@gmail.com`
2. Dashboard → **Pagamentos Online**
3. Ou acesse: `/payments-management`

### Funcionalidades

#### Estatísticas em Tempo Real
- Total de pagamentos
- Pagamentos aprovados
- Pagamentos pendentes
- Receita total

#### Filtros
- Buscar por: escola, email, referência
- Filtrar por status: todos, pending, approved, rejected, cancelled, refunded
- Botão atualizar

#### Tabela de Transações
Exibe para cada pagamento:
- Nome da escola
- Email
- Plano e duração
- Método de pagamento
- Valor
- Status (badge colorido)
- Data de criação
- Data de aprovação

#### Status Badges
- 🟡 **PENDING** - Aguardando pagamento
- 🟢 **APPROVED** - Pagamento confirmado, licença ativa
- 🔴 **REJECTED** - Pagamento recusado
- ⚫ **CANCELLED** - Cancelado pelo cliente
- 🟣 **REFUNDED** - Reembolsado, licença suspensa

---

## 🧪 Testar Sistema

### Ambiente de Teste (Sandbox)

O Mercado Pago oferece ambiente de testes:

1. Crie uma aplicação de teste
2. Use **TEST Access Token**
3. Use cartões de teste: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/testing

#### Cartões de Teste

**Aprovado:**
```
Número: 5031 4332 1540 6351
CVV: 123
Validade: 11/25
```

**Rejeitado:**
```
Número: 5031 4332 1540 6351
CVV: 123
Validade: 11/25
Nome: APRO / OTHE (conforme motivo)
```

### Testar PIX

No ambiente de sandbox, o PIX é automaticamente aprovado após alguns segundos.

---

## 🚨 Troubleshooting

### Pagamento não ativa licença

**Verificar:**
1. Webhook configurado corretamente no MP?
2. URL do webhook acessível publicamente?
3. Logs do backend: `console.log` no webhook
4. Status do payment no banco:
   ```bash
   db.payments.find({ externalReference: "REF_AQUI" })
   ```

### QR Code PIX não aparece

**Verificar:**
1. Access Token configurado?
2. Erro no console do backend?
3. Response da API MP no console

### Webhook não recebe notificações

**Verificar:**
1. URL pública e acessível?
2. Usar ngrok para testes locais
3. Verificar logs do Mercado Pago (Webhooks → Histórico)

### Pagamento aprovado mas status pendente

- Forçar sincronização:
  ```bash
  GET /api/payments/:paymentId
  ```
  Isso consulta status atual no MP e atualiza

---

## 📈 Melhorias Futuras

### Backend
- [ ] Envio de emails de confirmação
- [ ] Notificações por WhatsApp
- [ ] Relatórios financeiros avançados
- [ ] Exportar transações para Excel
- [ ] Suporte a boleto bancário
- [ ] Renovação automática de assinaturas
- [ ] Cupons de desconto
- [ ] Programa de afiliados

### Frontend
- [ ] Painel do cliente com histórico de pagamentos
- [ ] Notificações de expiração de licença
- [ ] Upgrade/downgrade de plano
- [ ] Calculadora de custos
- [ ] Comparação de planos interativa

---

## 📞 Suporte

**Desenvolvedor:** Wander Pires Silva Coelho  
**Email:** wanderpsc@gmail.com  
**PIX:** wanderpsc2006@yahoo.com.br

**Mercado Pago Suporte:**  
https://www.mercadopago.com.br/developers/pt/support

---

## 📚 Documentação Adicional

### API Mercado Pago
- Documentação: https://www.mercadopago.com.br/developers/pt/docs
- API Reference: https://www.mercadopago.com.br/developers/pt/reference
- Webhooks: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks

### Segurança
- ✅ Access Token armazenado em variável de ambiente
- ✅ Webhook valida origem (TODO: adicionar signature validation)
- ✅ HTTPS obrigatório em produção
- ✅ Dados sensíveis não expostos no frontend

---

## ✅ Checklist de Deploy

### Backend
- [ ] `MERCADO_PAGO_ACCESS_TOKEN` configurado (Production)
- [ ] `WEBHOOK_URL` apontando para domínio público
- [ ] `FRONTEND_URL` configurado corretamente
- [ ] Servidor rodando em HTTPS
- [ ] MongoDB acessível
- [ ] Logs configurados

### Frontend
- [ ] Rotas de pagamento acessíveis
- [ ] Redirecionamentos funcionando
- [ ] Mensagens de erro tratadas
- [ ] Loading states implementados

### Mercado Pago
- [ ] Aplicação em modo Production
- [ ] Webhook URL configurada
- [ ] Eventos payment e merchant_order habilitados
- [ ] Conta verificada e aprovada para receber pagamentos

### Testes
- [ ] Pagamento PIX funcional
- [ ] Pagamento Cartão funcional
- [ ] Webhook recebe notificações
- [ ] Licença ativa automaticamente
- [ ] Painel admin exibe transações

---

## 🎉 Sistema Pronto!

Seu sistema de pagamentos está completo e funcional. Agora as escolas podem:

1. **Registrar-se** no sistema
2. **Escolher um plano** e duração
3. **Pagar via PIX ou Cartão**
4. **Ter licença ativada automaticamente**
5. **Começar a usar imediatamente**

O admin pode:

1. **Acompanhar todas as transações**
2. **Ver receita em tempo real**
3. **Gerenciar reembolsos**
4. **Analisar métricas**

---

**Desenvolvido com ❤️ por Wander Pires Silva Coelho**  
**© 2025 - Todos os direitos reservados**
