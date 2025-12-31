# 📱 Configuração do WhatsApp Business API (Meta Cloud API)

**Seu número WhatsApp Business:** (89) 98139-8723

Este guia detalha como configurar a integração oficial do WhatsApp Business com o sistema de notificações.

---

## 🎯 Pré-requisitos

- ✅ Número de WhatsApp Business: **(89) 98139-8723**
- ✅ Conta do Facebook (pessoal ou business)
- ✅ Meta Business Suite configurada
- ⏱️ Tempo estimado: **15-20 minutos**

---

## 📋 Passo a Passo Completo

### **1. Criar App no Meta for Developers**

1. Acesse: https://developers.facebook.com/apps
2. Clique em **"Criar App"**
3. Escolha o tipo: **"Business"**
4. Preencha:
   - **Nome do App:** "Sistema de Horário Escolar"
   - **E-mail de contato:** wanderpsc@gmail.com
   - **Conta de Negócios:** Criar nova ou selecionar existente
5. Clique em **"Criar App"**

---

### **2. Adicionar Produto WhatsApp**

1. No painel do app, role até **"Adicionar produtos"**
2. Encontre **"WhatsApp"** e clique em **"Configurar"**
3. Selecione sua conta de negócios ou crie uma nova

---

### **3. Configurar Número de Telefone**

#### **Opção A: Usar Número de Teste (Desenvolvimento)**
- A Meta fornece um número de teste gratuito
- Limite: 5 destinatários pré-aprovados
- **Ideal para testar antes de ir para produção**

#### **Opção B: Usar Seu Número (89) 98139-8723 (Produção)**

1. No painel WhatsApp, clique em **"Add phone number"**
2. Selecione **"Use your own phone number"**
3. Insira: **+55 89 98139-8723**
4. Escolha método de verificação:
   - **SMS:** Você receberá um código via SMS
   - **Chamada de voz:** Código via ligação automática
5. Digite o código de 6 dígitos recebido
6. Aguarde aprovação (geralmente instantânea)

⚠️ **IMPORTANTE:** 
- Este número será desvinculado do WhatsApp normal
- Use um número exclusivo para o sistema ou mantenha dois chips

---

### **4. Obter Credenciais da API**

#### **4.1. Phone Number ID**

1. No painel WhatsApp, vá para **"API Setup"**
2. Encontre a seção **"Phone number ID"**
3. Copie o valor (exemplo: `123456789012345`)
4. Salve em `.env`:
   ```env
   WHATSAPP_PHONE_NUMBER_ID=123456789012345
   ```

#### **4.2. Temporary Access Token (Para Testes)**

1. Na mesma tela, encontre **"Temporary access token"**
2. Clique em **"Copy"**
3. Este token expira em 24 horas
4. Use para testes iniciais:
   ```env
   WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxx
   ```

#### **4.3. Permanent Access Token (Para Produção)**

Para token permanente, você precisa criar um **System User**:

1. Acesse: https://business.facebook.com/settings/system-users
2. Clique em **"Add"**
3. Preencha:
   - **Nome:** "API Sistema Escolar"
   - **Role:** "Admin"
4. Clique em **"Create System User"**
5. Na lista, clique em **"Generate New Token"**
6. Selecione:
   - **App:** Seu app criado anteriormente
   - **Permissões:** 
     - ✅ `whatsapp_business_messaging`
     - ✅ `whatsapp_business_management`
7. Clique em **"Generate Token"**
8. **COPIE E SALVE IMEDIATAMENTE** (não será mostrado novamente)
9. Adicione ao `.env`:
   ```env
   WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

### **5. Configurar Variáveis de Ambiente**

Edite o arquivo `backend/.env`:

```env
# WhatsApp Business API (Meta Cloud API)
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_API_VERSION=v18.0
WHATSAPP_BUSINESS_NUMBER=5589981398723
```

---

### **6. Adicionar Destinatários (Modo Desenvolvimento)**

Se estiver usando número de teste, você precisa adicionar números permitidos:

1. No painel WhatsApp, vá para **"API Setup"**
2. Seção **"To"** (destinatário)
3. Clique em **"Manage phone number list"**
4. Adicione os números dos professores no formato internacional:
   ```
   +55 89 98765-4321  →  5589987654321
   +55 89 91234-5678  →  5589912345678
   ```

⚠️ **Limite:** Máximo 5 números no modo desenvolvimento

Para enviar para números ilimitados, seu app precisa passar pela **Revisão do Facebook** (Business Verification).

---

### **7. Testar Integração**

#### **Teste Manual via cURL:**

```bash
curl -X POST \
  'https://graph.facebook.com/v18.0/SEU_PHONE_NUMBER_ID/messages' \
  -H 'Authorization: Bearer SEU_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5589981398723",
    "type": "text",
    "text": {
      "body": "✅ Teste de integração WhatsApp Business!"
    }
  }'
```

#### **Teste via Sistema:**

1. Compile o backend:
   ```bash
   cd backend
   npm run build
   ```

2. Inicie o backend:
   ```bash
   npm start
   ```

3. No frontend, vá para **"Mensagens ao Vivo"**
4. Selecione um professor com número válido
5. Marque **"WhatsApp"**
6. Digite: "Teste de integração"
7. Clique em **"Enviar"**
8. Verifique o console do backend para logs

---

## 🚀 Próximos Passos (Produção)

### **Business Verification (Verificação de Negócio)**

Para enviar mensagens ilimitadas, você precisa verificar sua conta:

1. Acesse: https://business.facebook.com/settings/info
2. Clique em **"Start verification"**
3. Envie documentos:
   - 📄 CNPJ ou CPF
   - 📄 Comprovante de endereço
   - 📄 Documentos da empresa
4. Aguarde aprovação (2-5 dias úteis)

### **Solicitar Permissões Avançadas**

1. No painel do app, vá para **"App Review"**
2. Solicite permissão para:
   - **`whatsapp_business_messaging`** (enviar mensagens)
3. Preencha o formulário explicando o uso:
   ```
   "Sistema de notificações escolares para enviar lembretes 
   de aulas e alterações de horário para professores"
   ```
4. Aguarde aprovação (geralmente 24-48h)

---

## 📊 Limites e Custos

### **Modo Gratuito (Grátis sempre):**
- ✅ 1.000 conversas iniciadas pelo negócio/mês
- ✅ Mensagens ilimitadas dentro das conversas
- ✅ Mensagens de resposta (quando o usuário inicia) são grátis

### **Conversação Paga:**
- 💰 Após 1.000 conversas gratuitas
- 💰 ~R$ 0,30 por conversa (varia por país)
- 💰 Janela de 24h conta como 1 conversa

### **Definição de Conversa:**
- Uma "conversa" é uma janela de 24 horas após a primeira mensagem
- Múltiplas mensagens na mesma janela = 1 conversa
- **Exemplo:** Enviar 10 mensagens para o mesmo professor no mesmo dia = 1 conversa

---

## 🔒 Segurança

### **Proteger Access Token:**

**NUNCA** commite o `.env` no git:

```bash
# Verificar se .env está no .gitignore
cat .gitignore | grep .env
```

Se não estiver, adicione:

```bash
echo ".env" >> .gitignore
```

### **Rotacionar Tokens:**

Recomendado rotacionar tokens a cada 60-90 dias:

1. Gere novo token no System User
2. Atualize `.env`
3. Reinicie o backend
4. Revogue o token antigo

---

## 🐛 Troubleshooting

### **Erro: "Invalid access token"**
- ✅ Verifique se copiou o token completo
- ✅ Token temporário expira em 24h - use token permanente
- ✅ Verifique espaços em branco no `.env`

### **Erro: "Phone number not registered"**
- ✅ Confirme que o Phone Number ID está correto
- ✅ Verifique se o número foi verificado com sucesso
- ✅ Aguarde alguns minutos após verificação

### **Erro: "Recipient phone number not valid"**
- ✅ Formato deve ser internacional: `5589981398723`
- ✅ Remova caracteres: `() - espaços`
- ✅ Inclua código do país (55 para Brasil)

### **Erro: "Message failed to send"**
- ✅ Verifique se destinatário tem WhatsApp ativo
- ✅ No modo teste, destinatário deve estar na lista de permitidos
- ✅ Verifique limites de taxa (não envie mais de 1 msg/segundo)

### **Mensagem não chega:**
- ✅ Verifique o console do backend para erros
- ✅ Teste com seu próprio número primeiro
- ✅ Verifique se o número está bloqueado/inválido
- ✅ Aguarde alguns minutos (delay da Meta)

---

## 📞 Suporte

### **Documentação Oficial:**
- 📚 https://developers.facebook.com/docs/whatsapp/cloud-api
- 📚 https://developers.facebook.com/docs/whatsapp/business-management-api

### **Meta Business Help Center:**
- 🆘 https://www.facebook.com/business/help

### **Contato do Desenvolvedor:**
- 👨‍💻 Wander Pires Silva Coelho
- 📧 wanderpsc@gmail.com
- 📱 WhatsApp: (89) 98139-8723

---

## ✅ Checklist Final

Antes de colocar em produção:

- [ ] App criado no Meta for Developers
- [ ] WhatsApp adicionado como produto
- [ ] Número (89) 98139-8723 verificado
- [ ] Phone Number ID obtido
- [ ] Access Token permanente gerado
- [ ] Variáveis no `.env` configuradas
- [ ] Backend compilado e rodando
- [ ] Teste de envio realizado com sucesso
- [ ] Business Verification iniciada (para produção)
- [ ] Permissões avançadas solicitadas
- [ ] `.env` no `.gitignore`
- [ ] Documentação salva em local seguro

---

**© 2025 Wander Pires Silva Coelho - Sistema de Horário Escolar**
