# 📺 Painel de Avisos - Grade de Horários

## 🎯 Objetivo
Transformar o Painel de Avisos em uma Grade de Horários Completa em tempo real, com alertas sonoros e visuais para as aulas.

---

## ✨ Funcionalidades Implementadas

### 1️⃣ **Visualização em Grade (Padrão)**
- **Grade completa** mostrando todas as turmas e horários do dia
- **Layout em tabela** com:
  - **Colunas**: Turmas (ex: 6º A, 7º B, etc.)
  - **Linhas**: Períodos (1º, 2º, 3º, etc.) com horários
  - **Células**: Disciplina + Professor de cada aula
- **Destaque visual**:
  - 🔴 **Verde pulsante**: Aulas em andamento
  - ⚠️ **Amarelo**: Próximas aulas (30 minutos)
  - 🔵 **Azul**: Aulas agendadas
  - ⚫ **Cinza**: Aulas concluídas

### 2️⃣ **Alertas Sonoros Automáticos** 🔔
- **Alerta em 5 minutos** antes da aula começar
- **Alerta em 3 minutos** antes da aula
- **Alerta em 1 minuto** antes da aula
- **Alerta no início** da aula
- Som de alerta WAV codificado em base64 (não precisa de arquivos externos)

### 3️⃣ **Modo Cards (Alternativo)**
- **Toggle** entre visualização em grade e cards
- **Botão no header** para alternar entre os modos
- Cards agrupados por status:
  - 🟢 Aulas em andamento
  - 🟡 Próximas aulas (30 min)
  - 🔵 Aulas agendadas

### 4️⃣ **Atualização em Tempo Real**
- **Auto-refresh** a cada 60 segundos
- **Indicador de conexão** (Online/Offline)
- **Relógio digital** com hora e data atual
- **Status de conectividade** com ícone Wi-Fi

---

## 🎨 Interface Visual

### Header
```
📚 GRADE DE HORÁRIOS                    14:35
DOMINGO, 29 DE DEZEMBRO                 🟢 Online [🔄 Toggle]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Grade de Horários
```
┌─────────────┬──────────────┬──────────────┬──────────────┐
│  HORÁRIO    │    6º A      │    6º B      │    7º A      │
├─────────────┼──────────────┼──────────────┼──────────────┤
│     1º      │ Matemática   │ Português    │ História     │
│ 07:00-07:50 │ 👨‍🏫 João    │ 👨‍🏫 Maria  │ 👨‍🏫 Pedro  │
│             │ 🔴 EM ANDAMENTO                            │
├─────────────┼──────────────┼──────────────┼──────────────┤
│     2º      │ Português    │ Matemática   │ Geografia    │
│ 07:50-08:40 │ 👨‍🏫 Maria  │ 👨‍🏫 João   │ 👨‍🏫 Ana    │
│             │ ⚠️ PRÓXIMA AULA                            │
└─────────────┴──────────────┴──────────────┴──────────────┘
```

---

## 🔧 Tecnologias Utilizadas

### Frontend
- **React** com TypeScript
- **TanStack Query** (React Query) para fetching
- **Tailwind CSS** para estilização
- **Lucide Icons** para ícones
- **HTML5 Audio API** para alertas sonoros

### Backend
- **Node.js** + **Express**
- **MongoDB** para armazenamento
- **TypeScript** para tipagem

---

## 📋 Arquivos Modificados

### 1. `frontend/src/pages/DisplayPanel.tsx`
**Principais mudanças:**
- ✅ Adicionado `viewMode` state (grid/cards)
- ✅ Criado `audioRef` com som de alerta
- ✅ Implementado sistema de verificação de alertas
- ✅ Criada matriz de horários para grade
- ✅ Renderização condicional (grade vs cards)
- ✅ Botão toggle para alternar visualizações
- ✅ Animação pulse para aulas em andamento

**Código-chave:**
```typescript
// Alertas automáticos
useEffect(() => {
  todaySlots.forEach(slot => {
    const status = getSlotStatus(slot);
    const diffMinutes = /* cálculo */;
    
    if (diffMinutes === 5 || diffMinutes === 3 || diffMinutes === 1) {
      playAlert(); // Toca o som
    }
  });
}, [currentTime, timetables]);

// Grade de horários
<table>
  {allPeriods.map(period => (
    <tr>
      {allClasses.map(className => {
        const slot = timetableGrid[period][className];
        return <td className={getStatusColor(status)}>{slot.subjectName}</td>;
      })}
    </tr>
  ))}
</table>
```

### 2. `frontend/src/index.css`
**Adicionado:**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.02); }
}
```

---

## 🚀 Como Usar

### 1. Acessar o Painel
```
http://localhost:3001/display-panel
```

### 2. Conectar TV/Projetor
- Abra o navegador em **modo tela cheia** (F11)
- O painel será atualizado automaticamente a cada 60 segundos
- Alertas sonoros tocarão automaticamente

### 3. Alternar Visualizações
- Clique no botão **[🔄]** no header
- **Grade**: Visão completa de todas as turmas
- **Cards**: Visão focada por status das aulas

---

## 🎵 Alertas Sonoros

### Quando os Alertas Tocam?
1. **5 minutos** antes da aula
2. **3 minutos** antes da aula
3. **1 minuto** antes da aula
4. **No início** da aula (quando status muda para "EM ANDAMENTO")

### Como Funciona?
```typescript
// Verifica a cada segundo se deve tocar alerta
useEffect(() => {
  const now = currentTime;
  const diffMinutes = calcularDiferença(now, slot.startTime);
  
  if (diffMinutes === 5 && !jaAlertou) {
    audioRef.current.play(); // 🔔
    setLastAlertTime(slot.id); // Evita repetição
  }
}, [currentTime]);
```

### Configuração do Som
- **Formato**: WAV codificado em base64
- **Duração**: ~1 segundo
- **Volume**: Controlado pelo navegador
- **Não precisa** de arquivos externos

---

## 🎯 Status das Aulas

| Status | Cor | Descrição | Tempo |
|--------|-----|-----------|-------|
| 🔴 **EM ANDAMENTO** | Verde | Aula acontecendo agora | Hora atual entre início e fim |
| ⚠️ **PRÓXIMA** | Amarelo | Aula começará em breve | 30 minutos antes |
| 🔵 **AGENDADA** | Azul | Aula programada | Mais de 30 min antes |
| ⚫ **CONCLUÍDA** | Cinza | Aula já terminou | Após horário de fim |

---

## 🔄 Atualização Automática

### Configuração Atual
```typescript
refetchInterval: 60 * 1000, // 60 segundos
```

### Fluxo
1. **A cada 60 segundos**: Busca novos dados do backend
2. **Atualiza status**: Recalcula status de cada aula
3. **Verifica alertas**: Checa se deve tocar som
4. **Re-renderiza**: Atualiza cores e destaques

---

## 🛠️ Manutenção

### Ajustar Tempo de Alerta
Edite em `DisplayPanel.tsx`:
```typescript
// Linha ~115
if (diffMinutes === 5 || diffMinutes === 3 || diffMinutes === 1) {
  // Mude para: diffMinutes === 10 || diffMinutes === 5
}
```

### Ajustar Intervalo de Atualização
```typescript
// Linha ~90
refetchInterval: autoRefresh ? 60 * 1000 : false,
// Mude para: 30 * 1000 (30 seg) ou 120 * 1000 (2 min)
```

### Personalizar Cores
```typescript
// Linha ~160
const getStatusColor = (status: SlotStatus): string => {
  switch (status) {
    case 'ongoing': return 'bg-green-600'; // Mude aqui
    // ...
  }
}
```

---

## 🐛 Troubleshooting

### ❌ Som não toca
**Solução**: Navegadores bloqueiam áudio automático. Clique uma vez na página antes.

### ❌ Grade não aparece
**Solução**: Certifique-se de ter aulas cadastradas para o dia atual.

### ❌ Horários não atualizam
**Solução**: Verifique conexão com backend (indicador Online/Offline).

### ❌ Cores não mudam
**Solução**: Verifique se a hora do sistema está correta.

---

## 📊 Exemplo de Uso Real

### Cenário: Segunda-feira, 8h da manhã

```
📚 GRADE DE HORÁRIOS                    08:05
SEGUNDA-FEIRA, 6 DE JANEIRO            🟢 Online

┌─────────────┬──────────────┬──────────────┬──────────────┐
│     1º      │ Matemática   │ Português    │ História     │
│ 07:30-08:15 │ 🟢 EM CURSO  │ 🟢 EM CURSO  │ 🟢 EM CURSO  │
├─────────────┼──────────────┼──────────────┼──────────────┤
│     2º      │ Geografia    │ Matemática   │ Ciências     │
│ 08:15-09:00 │ ⚠️ 10 MIN    │ ⚠️ 10 MIN    │ ⚠️ 10 MIN    │
└─────────────┴──────────────┴──────────────┴──────────────┘

🔔 Alerta em 10 minutos!
🔔 Alerta em 5 minutos!
🔔 Alerta em 1 minuto!
🟢 INICIANDO: Geografia - 6º A
```

---

## 📝 Notas Técnicas

### Estrutura de Dados
```typescript
interface TimetableSlot {
  id: string;
  classId: string;
  className: string;
  gradeName: string;
  subjectName: string;
  teacherName: string;
  day: string;
  period: number;
  startTime: string; // "07:30"
  endTime: string;   // "08:15"
  subjectColor?: string;
}
```

### Matriz de Horários
```typescript
timetableGrid = {
  1: { "6º A": slot1, "6º B": slot2 },
  2: { "6º A": slot3, "6º B": slot4 },
  // ...
}
```

---

## 🎓 Copyright

© 2025 Wander Pires Silva Coelho  
E-mail: wanderpsc@gmail.com  
Todos os direitos reservados.

---

## 📚 Documentos Relacionados

- [README.md](../README.md) - Visão geral do sistema
- [SISTEMA_NOTIFICACOES_PAINEL.md](SISTEMA_NOTIFICACOES_PAINEL.md) - Sistema de notificações
- [GUIA_RAPIDO_COMUNICACAO.md](../GUIA_RAPIDO_COMUNICACAO.md) - Comunicação
