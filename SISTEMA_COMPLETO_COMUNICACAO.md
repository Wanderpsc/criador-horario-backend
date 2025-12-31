# 🚨 Sistema Completo de Comunicação e Emergências

## 📝 Visão Geral

Sistema integrado com 4 módulos principais para comunicação escolar e gerenciamento de emergências:

### ✅ Módulos Implementados

#### 1. ⏰ **Sistema de Notificações e Lembretes**
Envia lembretes automáticos aos professores sobre suas aulas.

**Recursos:**
- ✅ Configuração de tempo de antecedência (5-60 minutos)
- ✅ Templates personalizáveis com variáveis dinâmicas
- ✅ Envio via SMS/WhatsApp (integração Twilio)
- ✅ Histórico completo de notificações
- ✅ Estatísticas (enviadas, pendentes, falhas)
- ✅ Cronjob automático (processa a cada 1 minuto)
- ✅ Geração em massa para horários

**Página:** `/notifications`

**Endpoints API:**
- `GET /api/notifications` - Listar notificações
- `POST /api/notifications` - Criar notificação manual
- `GET /api/notifications/config` - Obter configurações
- `PUT /api/notifications/config` - Atualizar configurações
- `POST /api/notifications/generate-reminders` - Gerar lembretes em massa
- `DELETE /api/notifications/:id` - Cancelar notificação

---

#### 2. 📺 **Painel de Avisos para TV (Display Panel)**
Display em tempo real estilo aeroporto para TVs nas salas dos professores.

**Recursos:**
- ✅ Design tipo aeroporto (fontes grandes, cores vibrantes)
- ✅ Relógio em tempo real (atualização a cada 1 segundo)
- ✅ Auto-refresh (recarrega dados a cada 60 segundos)
- ✅ Código de cores por status:
  - 🟢 Verde: Aula em andamento (horário atual)
  - 🟡 Amarelo: Próxima aula (< 30 minutos)
  - 🔵 Azul: Aulas agendadas (> 30 minutos)
  - ⚫ Cinza: Aulas concluídas
- ✅ Indicador de conexão (ícone WiFi)
- ✅ Rota pública (não requer login)
- ✅ Otimizado para telas grandes (TVs, monitores)

**Página:** `/display-panel` ou `/display-panel/:scheduleId`

**Endpoint API:**
- `GET /api/generated-timetables/:id` - Obter horário específico
- `GET /api/generated-timetables` - Listar todos os horários

---

#### 3. 📤 **Mensagens ao Vivo (Live Messaging)**
Envio instantâneo de mensagens individuais ou coletivas aos professores.

**Recursos:**
- ✅ Textarea para mensagem personalizada (até 500 caracteres)
- ✅ Templates rápidos pré-definidos:
  - 🔴 Reunião Urgente
  - 🔔 Lembrete de Evento
  - 👨‍🏫 Professor Ausente
  - ⏸️ Suspensão de Aulas
- ✅ Seleção de destinatários:
  - Individual (checkboxes)
  - Coletivo (toggle "Enviar para Todos")
  - Botões "Selecionar Todos" / "Desmarcar Todos"
- ✅ Contador de caracteres em tempo real
- ✅ Painel de status (sistema ativo, total de professores)
- ✅ Seção de dicas e boas práticas
- ✅ Aviso sobre envio imediato (sem desfazer)
- ✅ Validação: requer mensagem E (destinatários OU enviar p/ todos)

**Página:** `/live-messages`

**Endpoints API:**
- `GET /api/live-messages/teachers` - Listar professores ativos com telefone
- `POST /api/live-messages/send` - Enviar mensagem instantânea
  ```json
  {
    "recipientIds": ["id1", "id2"],
    "message": "Texto da mensagem",
    "sendToAll": false
  }
  ```
- `POST /api/live-messages/alert-vacant` - Alertar sobre vaga
- `GET /api/live-messages/vacant-slots` - Detectar horários vagos (stub)

---

#### 4. ⚡ **Horário Emergencial (Emergency Schedule)**
Criação rápida de horários provisórios quando professor falta.

**Recursos:**
- ✅ Formulário simplificado:
  - 📅 Seleção de data (exibe dia da semana)
  - 🎓 Turma afetada (dropdown)
  - 👨‍🏫 Professor ausente (dropdown)
  - ℹ️ Motivo da ausência (opcional)
- ✅ Botão "Gerar Horário Emergencial"
- ✅ Tabela de horário gerado:
  - Horário | Início | Fim | Disciplina | Professor Substituto | Ações
  - Botão "Alertar" por período individual
- ✅ Ações em massa:
  - 💾 Salvar como Horário do Dia
  - 📢 Notificar Todos os Envolvidos
- ✅ Guia de uso passo a passo
- ✅ Estatísticas (turmas, professores, disciplinas)
- ✅ Dicas de boas práticas
- ✅ Alerta sobre temporariedade do horário

**Página:** `/emergency-schedule`

**Endpoints API:**
Utiliza os endpoints de:
- `/api/classes` - Buscar turmas
- `/api/teachers` - Buscar professores
- `/api/subjects` - Buscar disciplinas
- `/api/live-messages/alert-vacant` - Enviar alerta de vaga

---

#### 5. 📅 **Alertas Automáticos de Calendário** ⚠️ (Parcialmente Implementado)

Sistema de alertas baseados no calendário letivo.

**Status:** ⏳ Aguardando modelo `SchoolCalendar` no banco

**Recursos Planejados:**
- 📆 Notificar sobre feriados (1 dia de antecedência)
- 🏖️ Alertar sobre recessos escolares
- 👥 Lembrete de reuniões de professores
- 👨‍👩‍👧 Avisos de reuniões de pais
- 📝 Alertas de períodos de avaliação
- 📊 Resumo semanal de eventos (toda segunda-feira)

**Cronjobs Configurados:**
- 🕗 20:00 (8 PM) - Verificar eventos do próximo dia
- 🕕 06:00 (6 AM) - Verificar dias não letivos

**Service:** `calendar.alerts.service.ts`
**Cronjob:** `calendar.alerts.cron.ts`

**Nota:** Funções criadas mas inativas até implementação do modelo `SchoolCalendar`.

---

## 🏗️ Arquitetura Técnica

### Backend

**Tecnologias:**
- Node.js + Express + TypeScript
- MongoDB Atlas (Mongoose)
- node-cron (v3.0.3) - Cronjobs
- Twilio API (opcional, configurável)

**Estrutura:**
```
backend/src/
├── models/
│   ├── Notification.ts         # Armazena todas as notificações
│   ├── NotificationConfig.ts   # Configurações por usuário
├── routes/
│   ├── notification.routes.ts  # Rotas de notificações
│   ├── liveMessage.routes.ts   # Rotas de mensagens ao vivo
├── services/
│   ├── notification.service.ts         # Lógica de negócio
│   ├── notification.cron.ts            # Cronjob (1 minuto)
│   ├── calendar.alerts.service.ts      # Alertas de calendário
│   └── calendar.alerts.cron.ts         # Cronjob de calendário
└── server.ts
```

**Modelos:**

1. **Notification** (backend/src/models/Notification.ts)
```typescript
{
  userId: ObjectId,
  type: 'class_reminder' | 'schedule_change' | 'general_announcement',
  recipientType: 'teacher' | 'coordinator' | 'admin',
  recipientId: ObjectId,
  recipientPhone: string,
  message: string,
  status: 'pending' | 'sent' | 'failed' | 'cancelled',
  scheduledFor: Date,
  sentAt?: Date,
  error?: string,
  metadata: {
    teacherName, subjectName, className, period, day, startTime, endTime
  },
  createdAt: Date
}
```

**Índices:**
- `status + scheduledFor` (otimizado para cronjob)
- `recipientId + createdAt` (histórico do professor)
- `userId + createdAt` (histórico do usuário)

2. **NotificationConfig** (backend/src/models/NotificationConfig.ts)
```typescript
{
  userId: ObjectId (unique),
  reminderEnabled: boolean,
  reminderMinutesBefore: number (default 15),
  messageTemplate: string,
  sendToWhatsApp: boolean,
  sendToSMS: boolean,
  twilioAccountSid?: string,
  twilioAuthToken?: string,
  twilioPhoneNumber?: string
}
```

**Cronjobs:**
- `notification.cron.ts`: Executa a cada 1 minuto
  - Busca notificações com status='pending' e scheduledFor <= now
  - Processa via `NotificationService.processPendingNotifications()`
  
- `calendar.alerts.cron.ts`: Executa diariamente
  - 20:00 (8 PM): Verifica eventos do próximo dia
  - 06:00 (6 AM): Verifica dias não letivos

---

### Frontend

**Tecnologias:**
- React 18 + TypeScript
- Vite (build tool)
- TanStack Query (React Query) - Estado do servidor
- React Hook Form - Formulários
- react-hot-toast - Notificações
- lucide-react - Ícones

**Estrutura:**
```
frontend/src/
├── pages/
│   ├── NotificationSettings.tsx   # Configuração de notificações
│   ├── DisplayPanel.tsx           # Painel de TV
│   ├── LiveMessaging.tsx          # Mensagens ao vivo
│   └── EmergencySchedule.tsx      # Horário emergencial
├── components/
│   └── Layout.tsx                 # Menu atualizado
└── App.tsx                        # Rotas
```

**Rotas:**
- `/notifications` - Configuração de notificações (privada)
- `/display-panel` - Painel de TV (pública)
- `/display-panel/:scheduleId` - Painel de horário específico (pública)
- `/live-messages` - Mensagens ao vivo (privada)
- `/emergency-schedule` - Horário emergencial (privada)

**Menu:**
- 🔔 **Notificações e Lembretes** (amarelo, badge NOVO)
- 💬 **Mensagens ao Vivo** (verde, badge NOVO, destaque)
- ⚡ **Horário Emergencial** (vermelho, badge NOVO, destaque)
- 📺 **Painel de Avisos (TV)** (roxo, badge NOVO, abre em nova aba)

---

## 🔄 Fluxo de Funcionamento

### 1. Notificações Automáticas

```
1. Usuário cria horário na página "Gerar Horário"
2. Clica em "Gerar Lembretes para Este Horário"
3. Sistema cria notificações para cada aula:
   - scheduledFor = dataAula - reminderMinutesBefore
   - status = 'pending'
4. Cronjob verifica a cada 1 minuto:
   - Busca notificações pendentes onde scheduledFor <= agora
   - Envia via Twilio (ou simula)
   - Atualiza status para 'sent' ou 'failed'
5. Professor recebe SMS/WhatsApp:
   "🔔 Lembrete de Aula
   📚 Disciplina: Matemática
   🎓 Turma: 1º Ano A
   📅 Dia: Segunda-feira
   ⏰ Horário: 07:00 - 07:50
   🏫 Sala: 101"
```

### 2. Mensagens Instantâneas

```
1. Coordenador acessa /live-messages
2. Seleciona professores ou marca "Enviar para Todos"
3. Digita mensagem (ou usa template rápido)
4. Clica em "Enviar Mensagem"
5. Sistema:
   - Valida input (mensagem não vazia, tem destinatários)
   - Cria notificação para cada professor:
     * scheduledFor = agora (envio imediato)
     * status = 'pending'
   - Retorna confirmação
6. Cronjob detecta notificações novas (scheduledFor <= agora)
7. Envia imediatamente
8. Toast de sucesso exibido
```

### 3. Horário Emergencial

```
1. Coordenador acessa /emergency-schedule
2. Preenche:
   - Data: 15/12/2024 (Segunda-feira)
   - Turma: 2º Ano B
   - Professor Ausente: João Silva
   - Motivo: Doença
3. Clica em "Gerar Horário Emergencial"
4. Sistema:
   - Busca horário normal do 2º Ano B (segunda-feira)
   - Identifica aulas do professor João Silva
   - Sugere professores substitutos (mesma disciplina, disponíveis)
   - Gera tabela de substituições
5. Coordenador revisa e clica em "Notificar Todos os Envolvidos"
6. Sistema envia mensagem via /api/live-messages/send:
   "🚨 SUBSTITUIÇÃO DE EMERGÊNCIA
   📅 Data: 15/12/2024
   🎓 Turma: 2º Ano B
   👨‍🏫 Professor ausente: João Silva
   ℹ️ Motivo: Doença
   
   Horário:
   1º horário (07:00-07:50) - Matemática - Prof. Maria Santos
   2º horário (07:50-08:40) - Física - Prof. Carlos Lima"
7. Todos os professores envolvidos recebem SMS/WhatsApp
```

### 4. Display Panel para TV

```
1. Instalar TV na sala dos professores
2. Abrir navegador em modo quiosque
3. Acessar: http://localhost:3001/display-panel
   (ou URL pública após deploy)
4. Display exibe:
   - Relógio em tempo real (atualiza a cada 1 segundo)
   - Data e dia da semana
   - Lista de aulas do dia com cores:
     * Verde: aula em andamento (horário atual)
     * Amarelo: próxima aula (< 30 min)
     * Azul: aulas futuras (> 30 min)
     * Cinza: aulas concluídas
5. Auto-refresh a cada 60 segundos
6. Indicador de conexão (WiFi icon)
```

---

## 📊 Estatísticas e Monitoramento

**Página de Notificações** exibe:
- 📤 Total de notificações enviadas
- ⏳ Notificações pendentes
- ❌ Notificações falhadas
- 📈 Taxa de sucesso

**Tabela de Histórico:**
- Data/hora de envio
- Destinatário
- Tipo de notificação
- Status (badge colorido)
- Mensagem completa
- Ações (visualizar detalhes)

---

## 🔧 Configuração e Uso

### 1. Ativar Notificações

1. Acesse `/notifications`
2. Marque "Ativar lembretes de aulas"
3. Ajuste "Minutos de antecedência" (5-60)
4. Personalize template com variáveis:
   - `{{teacherName}}` - Nome do professor
   - `{{subjectName}}` - Nome da disciplina
   - `{{className}}` - Nome da turma
   - `{{period}}` - Número do horário
   - `{{day}}` - Dia da semana
   - `{{startTime}}` - Hora de início
   - `{{endTime}}` - Hora de término
5. Configure Twilio (opcional):
   - Account SID
   - Auth Token
   - Telefone Twilio
6. Clique em "Salvar Configurações"

### 2. Gerar Lembretes para Horário

1. Acesse `/timetable-generator`
2. Crie um horário normalmente
3. Na lista de horários gerados, clique em "Gerar Lembretes"
4. Sistema cria notificações para todas as aulas do horário
5. Toast de confirmação exibido

### 3. Enviar Mensagem Instantânea

1. Acesse `/live-messages`
2. Opção A - Template rápido:
   - Clique em um dos 4 templates
   - Edite se necessário
3. Opção B - Mensagem personalizada:
   - Digite no textarea (até 500 caracteres)
4. Selecione destinatários:
   - Marque checkboxes individuais OU
   - Ative toggle "Enviar para Todos"
5. Clique em "Enviar Mensagem"
6. Confirme no dialog (mensagem é imediata e irreversível)

### 4. Criar Horário Emergencial

1. Acesse `/emergency-schedule`
2. Preencha formulário:
   - Data do evento
   - Turma afetada
   - Professor ausente
   - Motivo (opcional)
3. Clique em "Gerar Horário Emergencial"
4. Revise tabela de substituições
5. Ajuste se necessário (futuro: edição inline)
6. Clique em "Salvar como Horário do Dia"
7. Clique em "Notificar Todos os Envolvidos"

### 5. Configurar Painel de TV

1. Instale TV na sala dos professores
2. Conecte à internet (WiFi/Cabo)
3. Abra navegador (Chrome/Firefox recomendado)
4. Acesse URL do display:
   - Desenvolvimento: `http://localhost:3001/display-panel`
   - Produção: `https://seudominio.com/display-panel`
5. Pressione F11 para modo tela cheia
6. Configure navegador para:
   - Iniciar automaticamente ao ligar TV
   - Abrir URL específica
   - Desativar proteção de tela
   - Desativar timeout de inatividade

---

## 🚀 Próximas Implementações

### 1. Alertas Automáticos de Calendário ⏳

**Status:** Aguardando modelo `SchoolCalendar`

**Criar modelo:**
```typescript
// backend/src/models/SchoolCalendar.ts
{
  userId: ObjectId,
  date: Date,
  type: 'holiday' | 'recess' | 'school-event' | 'teacher-meeting' | 'parent-meeting' | 'exam-period',
  title: string,
  description?: string,
  createdAt: Date
}
```

**Ativar cronjobs:**
- Já criados em `calendar.alerts.cron.ts`
- Apenas precisam do modelo para funcionar

**Funcionalidades:**
- Notificar feriados (1 dia antes)
- Alertar recessos escolares
- Lembrar reuniões de professores
- Avisar reuniões de pais
- Alertar períodos de avaliação

---

### 2. Detecção Avançada de Horários Vagos

**Implementar em:** `liveMessage.routes.ts` - GET `/vacant-slots`

**Lógica:**
```typescript
1. Buscar todos os horários gerados (ativo)
2. Para cada slot:
   - Verificar se tem professor atribuído
   - Verificar se professor está ativo (isActive=true)
   - Verificar se não há conflito com outro horário
   - Verificar se professor tem a disciplina cadastrada
3. Slots vazios ou com problemas = VAGA
4. Gerar alerta automático
5. Sugerir professores disponíveis (mesmo horário livre + disciplina compatível)
```

**Adicionar ao cronjob:**
```typescript
// Verificar vagas a cada 1 hora
cron.schedule('0 * * * *', async () => {
  const vacantSlots = await detectVacantSlots();
  if (vacantSlots.length > 0) {
    await notifyCoordinators(vacantSlots);
  }
});
```

---

### 3. Edição Inline de Horário Emergencial

**Adicionar à tabela:**
- Dropdown de professores substitutos (edição inline)
- Dropdown de disciplinas alternativas
- Botão "Salvar Alterações"

---

### 4. Integração Real com Twilio

**Atual:** Simulado (console.log)

**Implementar:**
```typescript
import twilio from 'twilio';

const client = twilio(accountSid, authToken);

await client.messages.create({
  body: message,
  from: twilioPhoneNumber,
  to: recipientPhone
});
```

**Configurar:**
- Criar conta Twilio
- Comprar número de telefone
- Configurar em `/notifications`

---

### 5. Relatórios e Analytics

**Página:** `/reports`

**Gráficos:**
- Notificações enviadas por dia (gráfico de linha)
- Taxa de sucesso vs. falha (gráfico de pizza)
- Professores mais notificados (gráfico de barras)
- Horários de pico de notificações (heatmap)
- Mensagens instantâneas por período
- Emergências por mês

**Exportar:**
- PDF com relatório completo
- Excel com dados brutos
- CSV para análise externa

---

### 6. Aplicativo Mobile (Opcional)

**React Native:**
- Push notifications nativas
- Leitura de QR Code (check-in de professores)
- Visualização offline de horários
- Chat entre professores e coordenação

---

## ⚠️ Pontos de Atenção

### 1. Custos Twilio
- SMS: ~$0.0075/mensagem (Brasil)
- WhatsApp: ~$0.005/mensagem (Brasil)
- Número: ~$1/mês (Brasil)
- **Estimar:** 100 professores x 10 aulas/dia x 22 dias = 22.000 mensagens/mês = ~$165/mês

**Alternativas:**
- Usar apenas WhatsApp (mais barato)
- Implementar sistema de créditos
- Oferecer planos escalonados

### 2. Privacidade LGPD
- ✅ Armazenar apenas telefones necessários
- ✅ Criptografar credenciais Twilio
- ✅ Permitir opt-out de professores
- ❌ Implementar consentimento explícito (TODO)
- ❌ Adicionar política de privacidade (TODO)

### 3. Performance
- ✅ Cronjob otimizado (índices no banco)
- ✅ Display panel com auto-refresh (evita overload)
- ⚠️ Limite de mensagens simultâneas (Twilio: 1/segundo)
- ⚠️ Implementar fila de mensagens (Redis?) se volume alto

### 4. Confiabilidade
- ✅ Status de notificações (pending, sent, failed)
- ✅ Retry automático em falhas
- ⚠️ Logs detalhados (implementar Winston?)
- ⚠️ Monitoring (Sentry? Datadog?)

---

## 📖 Documentação Adicional

- **SISTEMA_NOTIFICACOES.md** - Detalhes do sistema de notificações original
- **SESSAO_22_DEZ_2025.md** - Log da sessão de implementação
- **README.md** - Documentação geral do projeto

---

## 👨‍💻 Implementado por

Wander Pires Silva Coelho  
E-mail: wanderpsc@gmail.com  
© 2025 - Todos os direitos reservados

---

## 📅 Versão

**v1.0** - 22 de dezembro de 2024

**Changelog:**
- ✅ Sistema de notificações completo
- ✅ Painel de TV estilo aeroporto
- ✅ Mensagens ao vivo (individual/coletivo)
- ✅ Horário emergencial com substituições
- ⏳ Alertas de calendário (aguardando modelo)
- ⏳ Detecção avançada de vagas (stub criado)
