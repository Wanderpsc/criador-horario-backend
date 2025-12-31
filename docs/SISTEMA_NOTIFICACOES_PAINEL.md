# 📱 Sistema de Notificações e Painel de Avisos

## Visão Geral

Sistema completo de lembretes automáticos para professores e painel de avisos em tempo real estilo aeroporto.

---

## 🎯 Funcionalidades Implementadas

### 1. **Sistema de Lembretes Automáticos**
- ✅ Envio de lembretes via SMS/WhatsApp
- ✅ Configuração de tempo de antecedência (padrão: 15 minutos)
- ✅ Templates personalizáveis de mensagem
- ✅ Cronjob automático executando a cada minuto
- ✅ Suporte para integração Twilio
- ✅ Histórico completo de notificações

### 2. **Painel de Avisos Estilo Aeroporto**
- ✅ Design moderno tipo painel de aeroporto
- ✅ Atualização em tempo real (auto-refresh)
- ✅ Cores diferentes por status:
  - 🟢 **Verde**: Aula em andamento
  - 🟡 **Amarelo**: Próxima aula (30 min)
  - 🔵 **Azul**: Aulas agendadas
  - ⚫ **Cinza**: Aulas concluídas
- ✅ Relógio em tempo real
- ✅ Informações completas: professor, turma, disciplina, horário
- ✅ Responsivo para diferentes tamanhos de tela

### 3. **Página de Configuração**
- ✅ Interface intuitiva de configuração
- ✅ Ativar/desativar lembretes
- ✅ Configurar tempo de antecedência
- ✅ Editar template de mensagem
- ✅ Escolher método de envio (SMS/WhatsApp)
- ✅ Configurar credenciais Twilio
- ✅ Gerar lembretes com um clique
- ✅ Enviar mensagem de teste
- ✅ Visualizar histórico e estatísticas

---

## 📋 Estrutura dos Arquivos

### Backend
```
backend/src/
├── models/
│   ├── Notification.ts              # Modelo de notificação
│   └── NotificationConfig.ts        # Configurações de notificação
├── services/
│   ├── notification.service.ts      # Lógica de negócio
│   └── notification.cron.ts         # Cronjob automático
└── routes/
    └── notification.routes.ts       # Rotas da API
```

### Frontend
```
frontend/src/pages/
├── NotificationSettings.tsx         # Página de configuração
└── DisplayPanel.tsx                 # Painel de avisos (TV)
```

---

## 🚀 Como Usar

### 1. **Instalação das Dependências**

```bash
# Backend
cd backend
npm install node-cron @types/node-cron

# Frontend (sem dependências extras necessárias)
```

### 2. **Configurar Notificações**

1. Acesse o menu **"Notificações e Lembretes"**
2. Ative os lembretes automáticos
3. Configure o tempo de antecedência (ex: 15 minutos)
4. Personalize o template da mensagem
5. Escolha o método de envio (WhatsApp/SMS)
6. Salve as configurações

### 3. **Gerar Lembretes**

1. Na página de notificações, clique em **"Gerar Lembretes"**
2. O sistema criará lembretes para todas as aulas dos horários cadastrados
3. Os lembretes serão enviados automaticamente no horário agendado

### 4. **Visualizar Painel de Avisos**

1. Acesse `/display-panel` no navegador
2. O painel mostra aulas do dia em tempo real
3. Atualizações automáticas a cada 60 segundos
4. Ideal para exibir em TVs nas salas dos professores

**Dica**: Use o modo tela cheia (F11) para melhor visualização

---

## 🔧 Configuração do Twilio (Opcional)

Para envio **real** de mensagens SMS/WhatsApp:

1. Crie uma conta no [Twilio](https://www.twilio.com)
2. Obtenha suas credenciais:
   - **Account SID**
   - **Auth Token**
   - **Número Twilio** (formato: +5511999999999)
3. Configure na página de Notificações
4. Teste com uma mensagem de prova

**Custo**: Twilio cobra por mensagem enviada (verificar preços)

---

## 📊 API Endpoints

### Notificações

```http
GET    /api/notifications              # Listar notificações
POST   /api/notifications              # Criar notificação manual
DELETE /api/notifications/:id          # Cancelar notificação
GET    /api/notifications/config       # Obter configuração
PUT    /api/notifications/config       # Atualizar configuração
POST   /api/notifications/generate-reminders  # Gerar lembretes
```

### Exemplo de Requisição

```javascript
// Criar notificação manual
POST /api/notifications
{
  "type": "general_announcement",
  "recipientType": "teacher",
  "recipientPhone": "+5511999999999",
  "recipientName": "João Silva",
  "message": "Reunião pedagógica às 14h"
}
```

---

## 🎨 Template de Mensagem

### Variáveis Disponíveis

- `{{teacherName}}` - Nome do professor
- `{{subjectName}}` - Nome da disciplina
- `{{className}}` - Nome da turma
- `{{minutes}}` - Minutos de antecedência
- `{{startTime}}` - Horário de início
- `{{endTime}}` - Horário de término
- `{{period}}` - Número do horário

### Exemplo de Template

```
Olá {{teacherName}}! 

Lembrete: Sua aula de {{subjectName}} na turma {{className}} 
começa em {{minutes}} minutos ({{startTime}}). 

Sala: {{period}}º horário.
```

---

## ⚙️ Cronjob Automático

O sistema executa um cronjob a cada minuto que:

1. Verifica notificações pendentes
2. Identifica quais devem ser enviadas agora
3. Envia as mensagens via Twilio/WhatsApp
4. Atualiza o status das notificações

**Status possíveis**:
- `pending` - Aguardando envio
- `sent` - Enviada com sucesso
- `failed` - Falha no envio
- `cancelled` - Cancelada manualmente

---

## 🖥️ Painel de Avisos - Modos de Exibição

### Aulas em Andamento (Verde)
- Mostra aulas acontecendo **agora**
- Atualiza automaticamente quando a aula termina

### Próximas Aulas (Amarelo)
- Exibe aulas que começam em até **30 minutos**
- Alerta visual para professores se prepararem

### Aulas Agendadas (Azul)
- Lista demais aulas do dia
- Visualização compacta

### Status de Conexão
- Indicador de conexão em tempo real
- Reconexão automática em caso de falha

---

## 📱 Requisitos do Professor

Para receber notificações, o professor deve ter:

1. ✅ Telefone cadastrado no sistema
2. ✅ Formato válido: +5511999999999 (código país + DDD + número)
3. ✅ WhatsApp ativo (para notificações via WhatsApp)

---

## 🎯 Casos de Uso

### Caso 1: Lembrete Automático
1. Professor tem aula às 08:00
2. Sistema agenda lembrete para 07:45 (15 min antes)
3. Às 07:45, cronjob envia mensagem automaticamente
4. Professor recebe no WhatsApp/SMS

### Caso 2: Aviso em TV
1. TV na sala dos professores exibe `/display-panel`
2. Professores veem aulas em andamento e próximas
3. Cores chamam atenção para horários iminentes
4. Atualização automática mantém informações atuais

### Caso 3: Notificação Manual
1. Coordenador acessa "Notificações"
2. Cria aviso para todos os professores
3. Mensagem é enviada imediatamente
4. Histórico registra o envio

---

## 🔒 Segurança

- ✅ Rotas protegidas com autenticação JWT
- ✅ Credenciais Twilio criptografadas no banco
- ✅ Validação de números de telefone
- ✅ Rate limiting para evitar spam
- ✅ Logs de todas as notificações

---

## 🐛 Troubleshooting

### Lembretes não são enviados

**Problema**: Notificações ficam como "pending"

**Soluções**:
1. Verificar se cronjob está rodando:
   ```bash
   # Logs do backend devem mostrar:
   # "✅ Cronjob de notificações iniciado"
   ```
2. Verificar se professor tem telefone cadastrado
3. Verificar se configuração está ativada
4. Verificar credenciais Twilio

### Painel não atualiza

**Problema**: Display Panel não mostra aulas atualizadas

**Soluções**:
1. Verificar conexão de internet
2. Recarregar página (F5)
3. Verificar se há horários gerados
4. Confirmar que data/hora do servidor está correta

### Mensagens não chegam

**Problema**: Status "sent" mas mensagem não recebida

**Soluções**:
1. Verificar formato do número (+5511999999999)
2. Confirmar que número está ativo
3. Verificar saldo/créditos Twilio
4. Testar com mensagem de teste

---

## 📈 Próximas Melhorias

- [ ] Integração nativa WhatsApp Business
- [ ] Push notifications no app mobile
- [ ] Estatísticas detalhadas de entrega
- [ ] Templates prontos de mensagem
- [ ] Agendamento de avisos futuros
- [ ] Grupos de professores
- [ ] Notificações para alunos/pais

---

## 💡 Dicas de Uso

1. **Configure horários realistas**: Use 10-15 minutos de antecedência
2. **Teste antes de usar**: Envie mensagens de teste primeiro
3. **Monitore os custos**: SMS/WhatsApp via Twilio têm custo
4. **Use templates claros**: Mensagens objetivas funcionam melhor
5. **Atualize telefones**: Mantenha cadastro de professores atualizado
6. **TV sempre ligada**: Deixe display panel em tela cheia na TV
7. **Modo simulação**: Sistema funciona sem Twilio (apenas registra)

---

## 📞 Suporte

Para dúvidas ou problemas:
- **Email**: wanderpsc@gmail.com
- **Documentação**: Veja os comentários no código-fonte
- **Logs**: Verifique console do backend para debug

---

## 📄 Licença

© 2025 Wander Pires Silva Coelho - Todos os direitos reservados

---

**Status**: ✅ Sistema completo e funcional (modo simulação)  
**Versão**: 1.0.0  
**Data**: Dezembro 2025
