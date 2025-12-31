# 🚀 Início Rápido - WhatsApp Business

**Seu número:** (89) 98139-8723

## ⚡ 3 Passos Para Começar

### 1️⃣ **Obter Credenciais** (15 minutos)

1. Acesse: https://developers.facebook.com/apps
2. Crie um app → Tipo: **Business**
3. Adicione produto: **WhatsApp**
4. Verifique seu número: **(89) 98139-8723**
5. Copie:
   - **Phone Number ID** (na tela "API Setup")
   - **Access Token** (temporário ou permanente)

---

### 2️⃣ **Configurar Sistema** (2 minutos)

Edite o arquivo `backend/.env`:

```env
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxx  # Cole aqui o token
WHATSAPP_PHONE_NUMBER_ID=123456789012  # Cole aqui o Phone Number ID
```

Salve o arquivo.

---

### 3️⃣ **Testar** (1 minuto)

No terminal:

```bash
cd backend
npx ts-node test-whatsapp.ts
```

Você receberá uma mensagem no seu WhatsApp! 📱

---

## 📖 Documentação Completa

Para configuração detalhada, leia: [WHATSAPP_SETUP.md](../WHATSAPP_SETUP.md)

---

## 🐛 Problemas Comuns

### "WhatsApp não configurado"
→ Adicione as variáveis no `.env`

### "Invalid access token"
→ Token temporário expira em 24h - use token permanente

### "Mensagem não chega"
→ No modo teste, adicione seu número na lista de permitidos

---

## 📞 Ajuda

- 📧 wanderpsc@gmail.com
- 📱 WhatsApp: (89) 98139-8723
- 📚 Docs: [WHATSAPP_SETUP.md](../WHATSAPP_SETUP.md)
