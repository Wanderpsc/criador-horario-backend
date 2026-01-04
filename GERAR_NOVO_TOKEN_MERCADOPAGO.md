# 🔑 Como Gerar Novo Token do Mercado Pago

## ❌ Problema Atual
O token `APP_USR-34454e51-7058-4263-a963-1d3874dcfc57` está **inválido**.

Erro: `invalid_token` (400 Bad Request)

---

## ✅ Solução: Gerar Novo Token

### 📋 Passo a Passo Completo

#### 1️⃣ **Acesse o Painel de Desenvolvedores**
```
https://www.mercadopago.com.br/developers/panel
```

#### 2️⃣ **Faça Login**
- Use a conta: **wanderpsc2006@yahoo.com.br**
- Ou a conta que possui a chave PIX configurada

#### 3️⃣ **Crie uma Nova Aplicação** (se não tiver)
1. Clique em **"Suas aplicações"**
2. Clique em **"Criar aplicação"**
3. Preencha:
   - **Nome**: Sistema Horário Escolar
   - **Modelo de integração**: Pagamentos online
   - **Plataforma**: Gateway de pagamento
4. Clique em **"Criar aplicação"**

#### 4️⃣ **Copie as Credenciais**
1. Selecione sua aplicação
2. Vá na aba **"Credenciais de produção"**
3. Você verá:
   - **Public Key**: (começa com APP_USR-)
   - **Access Token**: (começa com APP_USR-) ← **COPIE ESTE!**

#### 5️⃣ **IMPORTANTE: Ative Permissões**
Na mesma página, verifique se está marcado:
- ✅ **Processar pagamentos**
- ✅ **Gerenciar vendas**
- ✅ **Ler dados de pagamentos**
- ✅ **Criar QR Code PIX**

#### 6️⃣ **Configure no Sistema**
1. Copie o novo **Access Token**
2. Cole no arquivo `.env` do backend:

```env
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-seu-novo-token-aqui
```

#### 7️⃣ **Reinicie o Backend**
```powershell
cd backend
npm run build
npm start
```

---

## 🧪 Teste se Funcionou

Execute este comando no PowerShell:

```powershell
$token = "SEU_NOVO_TOKEN_AQUI"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
Invoke-RestMethod -Uri "https://api.mercadopago.com/v1/payment_methods" -Headers $headers
```

**Resultado esperado:**
- ✅ Lista de métodos de pagamento
- ✅ PIX deve estar na lista com status "active"

---

## 🔧 Se o Problema Persistir

### Opção 1: Token de Teste (para desenvolvimento)
Se só quer testar o sistema sem pagamentos reais:

1. Use o **Access Token de TESTE**
2. Começa com `TEST-`
3. Substitua no `.env`:
```env
MERCADO_PAGO_ACCESS_TOKEN=TEST-seu-token-de-teste
```

### Opção 2: Conta Nova
Crie uma conta nova no Mercado Pago:
1. Use outro email
2. Configure chave PIX
3. Crie aplicação
4. Copie novo token

---

## 📱 Suporte Mercado Pago

Se continuar com erro:

**Telefone:**
- 📞 4020-7888 (capitais)
- 📞 0800 275 2070 (demais localidades)

**Chat Online:**
- 💬 https://www.mercadopago.com.br/ajuda

**Email para Desenvolvedores:**
- 📧 Através do painel de desenvolvedores

**Pergunta para fazer:**
> "Estou tentando criar pagamentos PIX via API mas recebo erro 'invalid_token'. Como gerar um Access Token válido com permissões para criar pagamentos PIX?"

---

## ✨ Após Resolver

O QR Code funcionará automaticamente! 🎉

Teste em: http://localhost:3002/register-school
