# ⚡ GUIA RÁPIDO - Sistema de Comunicação Escolar

## 📱 4 Ferramentas Principais

### 1. 🔔 Notificações Automáticas
**O que faz:** Envia lembretes aos professores antes das aulas  
**Como usar:** `/notifications` → Ativar → Configurar tempo → Gerar lembretes  
**Frequência:** Automático (cronjob a cada 1 minuto)

### 2. 💬 Mensagens Instantâneas
**O que faz:** Envio imediato de mensagens (individual/coletivo)  
**Como usar:** `/live-messages` → Selecionar professores → Digitar → Enviar  
**Uso:** Avisos urgentes, mudanças de última hora

### 3. ⚡ Horário Emergencial
**O que faz:** Cria horário provisório quando professor falta  
**Como usar:** `/emergency-schedule` → Selecionar turma e professor ausente → Gerar  
**Uso:** Substituições de última hora, emergências

### 4. 📺 Painel de TV
**O que faz:** Display em tempo real estilo aeroporto  
**Como usar:** `/display-panel` → Deixar aberto na TV (modo tela cheia)  
**Atualização:** Auto-refresh a cada 60 segundos

---

## 🎯 Casos de Uso Práticos

### Caso 1: Professor faltou hoje
```
1. Acesse /emergency-schedule
2. Selecione turma e professor ausente
3. Clique "Gerar Horário Emergencial"
4. Revise substituições
5. Clique "Notificar Todos os Envolvidos"
✅ Professores substitutos recebem SMS/WhatsApp instantâneo
```

### Caso 2: Reunião urgente em 15 minutos
```
1. Acesse /live-messages
2. Clique template "Reunião Urgente"
3. Marque "Enviar para Todos"
4. Clique "Enviar Mensagem"
✅ Todos os professores recebem alerta imediato
```

### Caso 3: Lembrar professores de suas aulas amanhã
```
1. Acesse /notifications
2. Configure tempo (ex: 15 minutos antes)
3. Acesse /timetable-generator
4. Clique "Gerar Lembretes" no horário
✅ Sistema envia lembretes automaticamente amanhã
```

### Caso 4: Exibir horário do dia na TV da sala dos professores
```
1. Ligue a TV
2. Abra navegador
3. Acesse http://localhost:3001/display-panel
4. Pressione F11 (tela cheia)
✅ Professores veem horário atualizado em tempo real
```

---

## 📊 Fluxograma Simplificado

```
┌─────────────────────────────────────────────────┐
│         SISTEMA DE COMUNICAÇÃO ESCOLAR          │
└─────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
   │ AGENDADO│     │ URGENTE │     │ VISUAL  │
   └────┬────┘     └────┬────┘     └────┬────┘
        │                │                │
   🔔 Notif.       💬 Msg Vivo      📺 Painel TV
   Automática      Instantânea      Tempo Real
        │                │                │
   ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
   │15min    │     │Agora    │     │60s      │
   │antes    │     │         │     │refresh  │
   │da aula  │     │         │     │         │
   └────┬────┘     └────┬────┘     └────┬────┘
        │                │                │
   ┌────▼────────────────▼────────────────▼────┐
   │     SMS/WhatsApp via Twilio/Simulação     │
   └───────────────────────────────────────────┘
                         │
                    ┌────▼────┐
                    │PROFESSOR│
                    └─────────┘
```

---

## 🎨 Código de Cores

### Notificações
- ⚪ **Cinza** - Pendente (aguardando horário)
- 🟢 **Verde** - Enviada com sucesso
- 🔴 **Vermelho** - Falha no envio
- 🟡 **Amarelo** - Cancelada

### Display Panel
- 🟢 **Verde** - Aula EM ANDAMENTO (horário atual)
- 🟡 **Amarelo** - Próxima aula (< 30 minutos)
- 🔵 **Azul** - Aulas futuras (> 30 minutos)
- ⚫ **Cinza** - Aulas concluídas

### Menu
- 🟡 **Amarelo** - Notificações e Lembretes
- 🟢 **Verde** - Mensagens ao Vivo (URGENTE)
- 🔴 **Vermelho** - Horário Emergencial (URGENTE)
- 🟣 **Roxo** - Painel de Avisos (TV)

---

## 🔢 Estatísticas Rápidas

```
┌──────────────────────────────────────────────┐
│  PAINEL DE NOTIFICAÇÕES                      │
├──────────────────────────────────────────────┤
│  📤 Enviadas:     1.234                      │
│  ⏳ Pendentes:       45                      │
│  ❌ Falhas:          12                      │
│  📈 Taxa Sucesso: 99.2%                      │
└──────────────────────────────────────────────┘
```

---

## ⏱️ Tempos de Resposta

| Ação                          | Tempo         |
|-------------------------------|---------------|
| Mensagem instantânea          | < 5 segundos  |
| Notificação agendada          | Exato no horário |
| Gerar horário emergencial     | < 10 segundos |
| Auto-refresh display panel    | 60 segundos   |
| Cronjob processar notifs      | 1 minuto      |

---

## 🚦 Status do Sistema

### ✅ Funcional
- [x] Notificações automáticas
- [x] Display panel estilo aeroporto
- [x] Mensagens instantâneas
- [x] Horário emergencial
- [x] Cronjobs configurados
- [x] API REST completa
- [x] Frontend integrado

### ⏳ Em Desenvolvimento
- [ ] Alertas de calendário (aguardando modelo)
- [ ] Detecção avançada de vagas
- [ ] Integração real com Twilio
- [ ] Relatórios e analytics

---

## 📞 Contato

**Desenvolvedor:** Wander Pires Silva Coelho  
**E-mail:** wanderpsc@gmail.com  
**Versão:** 1.0 (22/12/2024)

---

## 🆘 Resolução de Problemas

### Notificações não estão sendo enviadas
1. Verificar se cronjob está rodando (console do backend)
2. Verificar configuração em `/notifications`
3. Verificar se professores têm telefones cadastrados
4. Verificar logs no console

### Display panel não atualiza
1. Verificar conexão com internet
2. Verificar se horário foi gerado
3. Pressionar F5 para forçar refresh
4. Verificar console do navegador (F12)

### Mensagem instantânea não foi entregue
1. Verificar se professores têm telefones
2. Verificar se há mensagem de erro (toast)
3. Verificar histórico em `/notifications`
4. Verificar logs do backend

### Horário emergencial não gerou
1. Verificar se turma tem horário normal
2. Verificar se há professores disponíveis
3. Verificar se disciplinas estão cadastradas
4. Verificar console (F12) para erros

---

## 💡 Dicas de Boas Práticas

✅ **Sempre testar** notificações com seu próprio número primeiro  
✅ **Revisar horário emergencial** antes de notificar professores  
✅ **Usar templates** para mensagens comuns (mais rápido)  
✅ **Configurar TV** em local visível na sala dos professores  
✅ **Manter telefones atualizados** no cadastro de professores  
✅ **Monitorar estatísticas** semanalmente para detectar problemas  
✅ **Documentar substituições** no campo "Motivo"  

---

## 🔐 Segurança

- 🔒 Autenticação JWT (todas as rotas privadas)
- 🔒 Credenciais Twilio criptografadas no banco
- 🔒 Display panel público (apenas leitura)
- 🔒 Validação de inputs (XSS prevention)
- 🔒 Rate limiting (prevenir spam)

---

## 📚 Documentação Completa

Para mais detalhes, consulte:
- **SISTEMA_COMPLETO_COMUNICACAO.md** - Documentação técnica completa
- **SISTEMA_NOTIFICACOES.md** - Detalhes do sistema de notificações
- **README.md** - Documentação geral do projeto
