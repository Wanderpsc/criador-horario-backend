# Guia Rápido: Gerar Horário Emergencial com Importação Automática

## 🚀 Início Rápido (3 Passos)

### Passo 1: Marcar Frequência
1. Acesse: **Controle de Frequência** no menu
2. Selecione a **data da falta**
3. Selecione o **professor** na lista
4. Escolha o **dia da semana** (ex: Segunda-feira)
5. Selecione o **horário/período**
6. Clique em **"Ausente"** (botão vermelho)
7. Sistema salva automaticamente ✅

### Passo 2: Gerar Horário Emergencial
1. Acesse: **Horário Emergencial** no menu
2. Selecione a **mesma data** da falta
3. Sistema mostra automaticamente:
   - ✅ Professores ausentes
   - ✅ Quantidade de aulas
   - ✅ Detalhes de cada aula
4. Selecione a **turma afetada**
5. Selecione o **horário base** (template)
6. (Opcional) Adicione um **motivo**
7. Clique em **"Gerar Horário Emergencial"**

### Passo 3: (Opcional) Horário de Sábado
1. Na mesma tela, role até **"Horário do Sábado"**
2. Configure:
   - Data inicial do período
   - Data final do período
   - Data do sábado
   - Quantidade de aulas
3. Marque quais professores **confirmarão presença**
4. Clique em **"Gerar Horário do Sábado"**

---

## 📱 Interface Visual

### ✅ Quando Sistema Encontra Ausentes

```
╔════════════════════════════════════════════════════╗
║ 🔄 Professor(es) Ausente(s)      [🔄 Atualizar]   ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║ ℹ️ Importação Automática Ativada                  ║
║ Dados carregados do Controle de Frequência        ║
║                                                    ║
║ ✅ 2 professor(es) ausente(s) importados          ║
║ Total: 5 aula(s) ausentes                         ║
║                                                    ║
║ ┌──────────────────────────────────────┐         ║
║ │ 👨‍🏫 João Silva          [AUSENTE]     │         ║
║ │ 3 aula(s) ausente(s)                 │         ║
║ │                                       │         ║
║ │ 📚 AULAS:                             │         ║
║ │ • 1º Período (07:30-08:20)           │         ║
║ │   Matemática - 1º A                  │         ║
║ │ • 2º Período (08:20-09:10)           │         ║
║ │   Física - 2º B                      │         ║
║ └──────────────────────────────────────┘         ║
╚════════════════════════════════════════════════════╝
```

### ⚠️ Quando NÃO Há Ausentes

```
╔════════════════════════════════════════════════════╗
║ 🔄 Professor(es) Ausente(s)      [🔄 Atualizar]   ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║                  ⚠️                                ║
║                                                    ║
║ Nenhum professor ausente registrado                ║
║                                                    ║
║ Marque as faltas no Controle de Frequência        ║
║ para a data: 10/02/2026                           ║
║                                                    ║
║      [👤 Ir para Controle de Frequência]         ║
║                                                    ║
╚════════════════════════════════════════════════════╝
```

---

## 🎯 Exemplo Prático Completo

### Situação:
**Professor João Silva faltou na Segunda-feira (10/02/2026)**
- 1º Período: Matemática na turma 1º A
- 3º Período: Física na turma 2º B
- 5º Período: Química na turma 3º C

### Solução Passo a Passo:

#### 1️⃣ Marcar Frequência (Controle de Frequência)

**1.1** Acesse o menu e clique em "Controle de Frequência"

**1.2** Preencha:
```
Data: 10/02/2026
Professor: João Silva ▼
```

**1.3** Marque as ausências:
```
Segunda-feira
├─ 1º Período (07:30-08:20) → Clique [Ausente]
├─ 3º Período (09:20-10:10) → Clique [Ausente]
└─ 5º Período (11:00-11:50) → Clique [Ausente]
```

**1.4** Sistema salva automaticamente e mostra:
```
✅ Frequência registrada com sucesso!
```

---

#### 2️⃣ Gerar Horário Emergencial

**2.1** Acesse "Horário Emergencial" no menu

**2.2** Data do Evento:
```
Data: 10/02/2026 (mesma data da falta)
```

**2.3** Sistema carrega automaticamente:
```
✅ 1 professor(es) ausente(s) importado(s)
Total: 3 aula(s) ausentes

┌─────────────────────────────────────┐
│ João Silva                [AUSENTE] │
│ 3 aula(s) ausente(s)                │
│                                      │
│ DETALHAMENTO DAS AULAS:              │
│ • 1º Período - Matemática - 1º A    │
│ • 3º Período - Física - 2º B        │
│ • 5º Período - Química - 3º C       │
└─────────────────────────────────────┘
```

**2.4** Configure:
```
Selecione a Turma: 1º A ▼
Selecione o Horário Base: Horário Regular 2026 ▼
Motivo (opcional): Professor João Silva em atestado médico
```

**2.5** Clique em:
```
[⚡ Gerar Horário Emergencial]
```

**2.6** Sistema gera:
```
✅ Horário emergencial gerado com sucesso!

Resumo:
• Aulas vagas identificadas: 3
• Substituições sugeridas: 2
• Aulas redistribuídas: 1
```

---

#### 3️⃣ Horário de Sábado (Reposição)

**3.1** Role a página até "Horário do Sábado de Reposição"

**3.2** Configure o período:
```
Data Inicial: 10/02/2026
Data Final: 14/02/2026
Data do Sábado: 15/02/2026
Quantidade de Aulas: 4
Horário de Início: 08:00
Duração da Aula: 60 min
```

**3.3** Sistema mostra aulas do período:
```
📅 Aulas para repor (10/02 a 14/02):

✓ João Silva
  - 3 aulas (Matemática, Física, Química)
  
✓ Maria Santos
  - 2 aulas (Português, Literatura)
```

**3.4** Marque professores que virão:
```
[✓] João Silva (Confirmou presença)
[✗] Maria Santos (Não confirmou)
```

**3.5** Clique em:
```
[📅 Gerar Horário do Sábado (1 professores)]
```

**3.6** Sistema gera:
```
✅ Horário do sábado gerado com 4 período(s)!

Distribuição:
08:00-09:00 → Matemática (1º A)
09:00-10:00 → Física (2º B)
10:00-11:00 → Química (3º C)
11:00-12:00 → Matemática (1º A)
```

---

## 🔄 Atualizar Dados

Se você marcou mais ausências **depois** de abrir o Horário Emergencial:

1. Clique no botão **[🔄 Atualizar Dados]** no canto superior direito
2. Sistema recarrega professores ausentes
3. Novos ausentes aparecem automaticamente

---

## ❓ Perguntas Frequentes

### 1. "Não apareceu nenhum professor ausente"
**Solução:**
- Verifique se marcou a frequência na mesma data
- Clique em "Atualizar Dados"
- Se persistir, clique em "Ir para Controle de Frequência" e marque

### 2. "Professor aparece mas sem aulas"
**Possível causa:**
- Professor está marcado como ausente mas não tem aulas agendadas naquele dia
- Verifique o horário regular para confirmar

### 3. "Quero adicionar um professor manualmente"
**Resposta:**
- Não é mais possível (sistema automático)
- Marque a ausência no Controle de Frequência primeiro
- Depois clique em "Atualizar Dados"

### 4. "Posso remover um professor da lista?"
**Resposta:**
- Se aparecer por engano, corrija no Controle de Frequência
- Marque como "Presente" ao invés de "Ausente"
- Depois clique em "Atualizar Dados" no Horário Emergencial

### 5. "E se mudar a data?"
**Resposta:**
- Sistema busca automaticamente ausentes da nova data
- Não precisa fazer nada, é automático

---

## 💡 Dicas Avançadas

### Dica 1: Organização Semanal
Marque todas as ausências da semana no início da segunda-feira:
```
Segunda: João (3 aulas)
Terça: Maria (2 aulas)
Quarta: Pedro (1 aula)
```
Depois gere os horários emergenciais dia por dia.

### Dica 2: Horário de Sábado Consolidado
Configure um período maior (ex: 1 mês) para consolidar todas as reposições:
```
Período: 01/02/2026 a 28/02/2026
Resultado: Todas as faltas do mês em um único sábado
```

### Dica 3: Salvar Horários
Após gerar, dê um nome personalizado:
```
Nome: "Emergencial Segunda 10-02 João Silva"
```
Facilita encontrar depois.

### Dica 4: Impressão
Use os botões de impressão separados:
- "Imprimir Horário Emergencial" → Para fixar na sala
- "Imprimir Horário do Sábado" → Para professores

---

## ⚡ Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Alt + F` | Abre Controle de Frequência |
| `Alt + E` | Abre Horário Emergencial |
| `Ctrl + R` | Atualizar dados (quando no Horário Emergencial) |
| `Ctrl + P` | Imprimir horário |

---

## 📊 Checklist de Verificação

Antes de finalizar, certifique-se:

- [ ] Todas as ausências foram marcadas no Controle de Frequência
- [ ] Data selecionada está correta
- [ ] Professores ausentes aparecem na lista
- [ ] Turma selecionada está correta
- [ ] Horário base (template) escolhido
- [ ] Horário emergencial foi gerado
- [ ] (Opcional) Horário de sábado gerado
- [ ] Horários foram salvos com nome descritivo
- [ ] Impressões foram feitas (se necessário)
- [ ] Professores substitutos foram notificados

---

## 🆘 Suporte

**Problemas? Contate:**
- 📧 E-mail: wanderpsc@gmail.com
- 📞 Suporte técnico interno da escola
- 📱 WhatsApp: (caso configurado)

**Horário de atendimento:**
- Segunda a Sexta: 8h às 18h
- Sábado: 8h às 12h

---

**Versão do Guia:** 1.0  
**Última Atualização:** 10/02/2026  
**Sistema:** Criador de Horário de Aula Escolar  
**URL:** https://criador-horario-aula.surge.sh
