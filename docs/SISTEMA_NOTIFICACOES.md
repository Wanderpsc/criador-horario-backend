# Sistema de Notificações por Email - EduSync-PRO

© 2025 Wander Pires Silva Coelho  
wanderpsc@gmail.com

---

## 📧 Visão Geral

Sistema completo de notificações automáticas por email para gerenciamento de licenças, mantendo clientes informados sobre:
- ✅ Criação de nova licença
- ⏰ Vencimento próximo (7 dias antes)
- ❌ Licença expirada
- 🔄 Renovação bem-sucedida

---

## 🔧 Configuração Inicial

### 1. Configurar Credenciais de Email

Edite o arquivo `backend/.env`:

```env
# Email Configuration (Gmail)
EMAIL_USER=seu-email@gmail.com
EMAIL_PASSWORD=sua-senha-app-16-caracteres
```

### 2. Gerar Senha de App do Gmail

1. Acesse: https://myaccount.google.com/apppasswords
2. Selecione:
   - **App**: Mail
   - **Dispositivo**: Outro (Servidor Node)
3. Copie a senha gerada (16 caracteres sem espaços)
4. Cole em `EMAIL_PASSWORD` no arquivo `.env`

⚠️ **IMPORTANTE**: Use "Senha de App", NÃO a senha normal da sua conta!

---

## 📬 Tipos de Notificações

### 1. 🎉 Licença Criada
**Quando**: Imediatamente após criar nova licença  
**Enviado para**: Email fornecido no formulário de criação  
**Conteúdo**:
- Chave da licença
- Data de vencimento
- Número máximo de escolas
- Valor pago (se informado)
- Link para acessar o sistema

**Trigger**: Automático ao criar licença com `userEmail` preenchido

---

### 2. ⏰ Vencimento Próximo
**Quando**: 7 dias antes do vencimento  
**Enviado para**: Email do usuário associado à licença  
**Conteúdo**:
- Alerta de vencimento iminente
- Data de vencimento
- Dias restantes
- Instruções para renovação
- Link para contato

**Trigger**: Verificação diária automática (implementar cron job)

---

### 3. ❌ Licença Expirada
**Quando**: No dia do vencimento  
**Enviado para**: Email do usuário associado à licença  
**Conteúdo**:
- Aviso de expiração
- Data da expiração
- Informação sobre suspensão temporária
- Prazo de 30 dias para recuperação
- Link para renovação

**Trigger**: Verificação diária automática + desativa a licença

---

### 4. ✅ Renovação Confirmada
**Quando**: Após renovação bem-sucedida  
**Enviado para**: Email do usuário  
**Conteúdo**:
- Confirmação de renovação
- Nova data de vencimento
- Valor pago
- Acesso reativado

**Trigger**: Manual ou após processo de pagamento

---

## 🖥️ Como Usar (Interface Admin)

### Criar Licença com Notificação

1. Acesse **Licenças** no menu
2. Clique em **Nova Licença**
3. Preencha:
   - **Email do Cliente** ✉️ (opcional)
   - **Nome do Cliente** 👤 (opcional)
   - **Data de Validade** 📅 (obrigatório)
   - **Máximo de Escolas** 🏫 (obrigatório)
   - **Valor** 💰 (opcional)
4. Clique em **Criar**
5. ✅ Email será enviado automaticamente se email fornecido

---

### Enviar Notificação Manual

Para cada licença na lista:

1. Clique no botão **📧** (Email)
2. Digite o tipo de notificação:
   - `created` - Criação
   - `expiring` - Vencendo em breve
   - `expired` - Expirada
   - `renewed` - Renovada
3. Confirme

⚠️ **Requerimento**: Licença deve estar associada a um usuário com email válido

---

### Verificar Vencimentos (Manual)

1. Clique no botão **🔔 Verificar Vencimentos**
2. Sistema verifica:
   - Licenças expirando em 7 dias → Envia notificação
   - Licenças expiradas hoje → Desativa e envia notificação
3. Resultado exibido: "X expirando, Y expiradas"

---

## 🔌 Endpoints da API

### POST `/api/licenses/:id/notify`
Envia notificação manual para uma licença

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**:
```json
{
  "type": "created" | "expiring" | "expired" | "renewed"
}
```

**Resposta**:
```json
{
  "success": true,
  "message": "Notificação enviada com sucesso"
}
```

---

### POST `/api/licenses/check/expiring`
Verifica licenças expirando e expiradas (execução manual)

**Headers**:
```
Authorization: Bearer <token>
```

**Resposta**:
```json
{
  "success": true,
  "message": "Verificação concluída",
  "result": {
    "expiring": 2,
    "expired": 1
  }
}
```

---

## ⚙️ Verificação Automática (Cron Job)

### Opção 1: Node-Cron (Recomendado)

Instalar dependência:
```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

Adicionar em `backend/src/server.ts`:

```typescript
import cron from 'node-cron';
import * as licenseNotificationService from './services/licenseNotificationService';

// Executar diariamente às 8:00 AM
cron.schedule('0 8 * * *', async () => {
  console.log('[Cron] Iniciando verificação de licenças...');
  try {
    await licenseNotificationService.runDailyCheck();
    console.log('[Cron] Verificação concluída com sucesso');
  } catch (error) {
    console.error('[Cron] Erro na verificação:', error);
  }
});
```

---

### Opção 2: Tarefa Agendada do Windows

Criar arquivo `check-licenses.ps1`:
```powershell
$uri = "http://localhost:5000/api/licenses/check/expiring"
$token = "SEU_TOKEN_ADMIN"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers
    Write-Host "Verificação concluída: $($response.result.expiring) expirando, $($response.result.expired) expiradas"
} catch {
    Write-Error "Erro na verificação: $_"
}
```

Agendar no Windows:
```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\caminho\check-licenses.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 8am
Register-ScheduledTask -TaskName "EduSync-CheckLicenses" -Action $action -Trigger $trigger
```

---

## 🎨 Templates de Email

Todos os emails incluem:
- ✅ Design responsivo e profissional
- 🎨 Gradientes coloridos por tipo
- 📱 Compatível com todos os clientes de email
- 🔗 Links diretos para ações
- ©️ Copyright e informações de contato

### Cores por Tipo:
- **Criação**: Roxo/Azul (#667eea → #764ba2)
- **Vencimento**: Rosa/Vermelho (#f093fb → #f5576c)
- **Expiração**: Vermelho (#eb3349 → #f45c43)
- **Renovação**: Verde (#11998e → #38ef7d)

---

## 🧪 Testando o Sistema

### 1. Teste Manual de Email

```typescript
// No console do backend
import * as licenseEmailService from './services/licenseEmailService';

await licenseEmailService.sendLicenseCreatedEmail({
  userEmail: 'seu-email-teste@gmail.com',
  userName: 'Teste',
  key: 'ABC123DEF456',
  expiresAt: new Date('2025-12-31'),
  maxSchools: 5,
  price: 299.90
});
```

---

### 2. Testar Via API

**Criar licença com notificação**:
```bash
curl -X POST http://localhost:5000/api/licenses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "teste@exemplo.com",
    "userName": "João Silva",
    "expiryDate": "2025-12-31",
    "maxSchools": 3,
    "price": 199.90
  }'
```

**Enviar notificação manual**:
```bash
curl -X POST http://localhost:5000/api/licenses/LICENSE_ID/notify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "expiring"}'
```

**Verificar vencimentos**:
```bash
curl -X POST http://localhost:5000/api/licenses/check/expiring \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔍 Troubleshooting

### Email não está enviando

1. **Verificar credenciais**:
   ```bash
   # No console do backend
   console.log(process.env.EMAIL_USER);
   console.log(process.env.EMAIL_PASSWORD ? 'Configurado' : 'NÃO configurado');
   ```

2. **Verificar logs**:
   - Backend exibe erros no console
   - Frontend exibe toast de erro

3. **Testar conexão Gmail**:
   - Acesse: https://mail.google.com
   - Verifique se a conta está ativa
   - Confirme autenticação de dois fatores habilitada
   - Regenere senha de app se necessário

---

### Licença não tem usuário

**Problema**: `Licença não está associada a um usuário`

**Solução**: Associar licença a um usuário no banco:
```javascript
// MongoDB
db.licenses.updateOne(
  { _id: ObjectId("LICENSE_ID") },
  { $set: { userId: ObjectId("USER_ID") } }
);
```

---

### Verificação automática não funciona

1. **Se usando node-cron**: 
   - Verificar se o servidor está rodando 24/7
   - Checar logs do console para erros

2. **Se usando Task Scheduler**:
   - Abrir "Agendador de Tarefas" do Windows
   - Verificar se a tarefa está habilitada
   - Checar histórico de execuções
   - Testar manualmente: `.\check-licenses.ps1`

---

## 📊 Monitoramento

### Logs a Observar

```
[Notificação] Encontradas 2 licenças expirando em 7 dias
[Notificação] Email de vencimento enviado para usuario@exemplo.com
[Notificação] Encontradas 1 licenças expiradas hoje
[Notificação] Email de expiração enviado para usuario2@exemplo.com
[Notificação] Verificação completa: 2 expirando, 1 expiradas
```

---

## 🚀 Próximos Passos

### Melhorias Futuras

1. **Dashboard de Notificações**:
   - Histórico de emails enviados
   - Taxa de entrega/abertura
   - Erros de envio

2. **Múltiplos Lembretes**:
   - 30 dias antes
   - 15 dias antes
   - 7 dias antes
   - 3 dias antes
   - No dia

3. **Personalização**:
   - Templates customizáveis por cliente
   - Logo da escola no email
   - Cores personalizadas

4. **Outros Canais**:
   - SMS (Twilio)
   - WhatsApp (API Business)
   - Push notifications

---

## 📞 Suporte

Para dúvidas ou problemas:

**Email**: wanderpsc@gmail.com  
**Sistema**: EduSync-PRO  
**Desenvolvedor**: Wander Pires Silva Coelho

---

© 2025 Wander Pires Silva Coelho - Todos os direitos reservados
