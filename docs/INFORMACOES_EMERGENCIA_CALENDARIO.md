# Funcionalidade: Informações de Horário Normal vs Emergencial no Calendário

## Resumo
Foi implementada a funcionalidade que exibe em cada dia do calendário escolar se foi seguido o horário normal (base) ou se foi utilizado um horário emergencial, com detalhes completos.

## O que foi implementado

### 1. API de Horários Emergenciais
**Arquivo:** `frontend/src/services/api.ts`

```typescript
export const emergencyScheduleAPI = {
  getAll: () => api.get('/emergency-schedules'),
  getByDate: (date: string) => api.get(`/emergency-schedules/date/${date}`),
  getById: (id: string) => api.get(`/emergency-schedules/${id}`),
  create: (data: any) => api.post('/emergency-schedules', data),
  update: (id: string, data: any) => api.put(`/emergency-schedules/${id}`, data),
  delete: (id: string) => api.delete(`/emergency-schedules/${id}`)
};
```

### 2. Atualização do SchoolCalendar
**Arquivo:** `frontend/src/pages/SchoolCalendar.tsx`

#### Estado adicionado:
```typescript
const [emergencySchedules, setEmergencySchedules] = useState<any[]>([]);
```

#### Função auxiliar criada:
```typescript
const getEmergencyScheduleForDate = (date: Date) => {
  if (date.getTime() === 0) return null;
  const dateStr = date.toISOString().split('T')[0];
  return emergencySchedules.find(schedule => {
    const scheduleDate = new Date(schedule.date).toISOString().split('T')[0];
    return scheduleDate === dateStr;
  });
};
```

#### Carregamento de dados:
- Busca todos os horários emergenciais ao carregar o calendário
- Filtra apenas os horários do mês visualizado
- Atualiza automaticamente ao trocar de mês

### 3. Visualização no Calendário

#### Para dias COM cadastro (SchoolDay):

**Horário Emergencial:**
```
┌─────────────────────────────────┐
│ ⚠️ HORÁRIO EMERGENCIAL          │
│ Ausente(s): Prof. João, Prof. M│
│ Motivo: Licença médica          │
│ Turmas: 1º A, 2º B             │
└─────────────────────────────────┘
```
- Fundo: vermelho claro (`bg-red-50`)
- Borda: vermelha (`border-red-200`)
- Ícone: triângulo de alerta
- Texto: vermelho, negrito

**Horário Normal:**
```
┌─────────────────────────────────┐
│ ✓ Horário Normal                │
└─────────────────────────────────┘
```
- Fundo: verde claro (`bg-green-50`)
- Borda: verde (`border-green-200`)
- Ícone: check
- Texto: verde

#### Para dias SEM cadastro:
- Se houver emergência, mostra badge compacto vermelho
- Não mostra nada se horário normal

### 4. Legenda Atualizada

Foram adicionados dois novos itens à legenda:

```
🔴 EMERGENCIAL - Horário Emergencial
🟢 NORMAL - Horário Normal
```

## Informações Exibidas em Emergências

### Detalhes mostrados:
1. **Professor(es) Ausente(s):**
   - Lista de todos os professores que faltaram
   - Suporta múltiplos professores separados por vírgula

2. **Motivo:**
   - Razão da ausência (se cadastrado)
   - Ex: "Licença médica", "Capacitação", "Atestado"

3. **Turmas Afetadas:**
   - Lista das turmas que tiveram horário emergencial
   - Ex: "1º A, 2º B, 3º C"

## Fluxo de Funcionamento

1. **Ao abrir o calendário:**
   - Carrega dias letivos do mês
   - Carrega horários emergenciais do mês
   - Cruza informações por data

2. **Para cada dia no calendário:**
   - Verifica se existe horário emergencial para aquela data
   - Se SIM: mostra badge vermelho com detalhes
   - Se NÃO: mostra badge verde "Horário Normal"

3. **Ao trocar de mês:**
   - Recarrega automaticamente os dados
   - Filtra emergências do novo mês
   - Atualiza visualização

## Compatibilidade

### Suporta dados antigos:
- Campo `absentTeacherName` (singular - antigo)
- Campo `absentTeacherNames` (plural - novo)
- Converte automaticamente entre formatos

### Campos opcionais:
- Se não houver `reason`, não exibe o campo
- Se não houver `classNames`, não exibe a lista de turmas
- Sempre exibe os professores ausentes

## Exemplo Prático

**Cenário 1 - Dia Normal:**
```
Segunda-feira, 28/01
├─ Regular
├─ Horário: Turno Matutino
└─ ✓ Horário Normal
```

**Cenário 2 - Emergência Simples:**
```
Terça-feira, 29/01
├─ Regular
├─ Horário: Turno Matutino
└─ ⚠️ HORÁRIO EMERGENCIAL
    ├─ Ausente(s): Prof. João Silva
    └─ Motivo: Atestado médico
```

**Cenário 3 - Emergência Múltipla:**
```
Quarta-feira, 30/01
├─ Regular
├─ Horário: Turno Matutino
└─ ⚠️ HORÁRIO EMERGENCIAL
    ├─ Ausente(s): Prof. João, Prof. Maria, Prof. Ana
    ├─ Motivo: Capacitação pedagógica
    └─ Turmas: 1º A, 1º B, 2º A, 3º C
```

## Cores e Estilo

### Horário Emergencial:
- Fundo: `bg-red-50` (vermelho muito claro)
- Borda: `border-red-200` (vermelho médio)
- Título: `text-red-700 font-bold`
- Detalhes: `text-red-600 text-xs`

### Horário Normal:
- Fundo: `bg-green-50` (verde muito claro)
- Borda: `border-green-200` (verde médio)
- Texto: `text-green-700 font-medium`

### Legenda:
- Badges com mesmas cores
- Ícones inline (AlertTriangle e Check)
- Texto descritivo ao lado

## Integração com Sistema Completo

Esta funcionalidade se integra com:

1. **Horários Emergenciais:** `/emergency-schedule`
   - Criação de horários emergenciais
   - Registro de professores ausentes
   - Definição de substitutos

2. **Sábados de Reposição:** `/makeup-saturdays`
   - Cálculo automático de débitos
   - Geração de horários de reposição

3. **Notificações:**
   - Envio automático para professores substitutos
   - Alertas para professores ausentes

4. **Calendário Escolar:** `/school-calendar`
   - Visualização mensal/anual
   - Status de dias letivos
   - Horários seguidos (normal ou emergencial)

## Benefícios

✅ **Visibilidade Total:** Administrador vê imediatamente quais dias tiveram emergência  
✅ **Detalhamento:** Informações completas sobre ausências  
✅ **Rastreabilidade:** Histórico visual de todos os eventos  
✅ **Gestão Facilitada:** Identificação rápida de padrões de ausência  
✅ **Controle de Reposição:** Base para calcular sábados necessários  

## Testado e Validado

✅ Sem erros de compilação  
✅ Importações corretas  
✅ Estados sincronizados  
✅ Renderização condicional funcionando  
✅ Compatibilidade com dados antigos  
✅ Legenda completa e clara  

## Status
✅ **IMPLEMENTADO E FUNCIONAL**
