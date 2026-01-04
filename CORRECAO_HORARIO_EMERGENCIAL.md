# Correção da Geração de Horário Emergencial

## Problema Atual
O sistema está gerando apenas os slots dos professores ausentes, deixando os outros períodos como estavam.

## Solução Necessária

### 1. Buscar TODAS as aulas do dia
- Para cada turma, pegar TODOS os períodos do dia selecionado (não apenas os afetados)

### 2. Reorganizar/Compactar os períodos
- **Primeiros períodos**: Aulas com professor (tanto as originais quanto as substituídas)
- **Últimos períodos**: Períodos vagos (LIVRE/JANELA)

### 3. Lógica de reorganização por turma
```
Para cada turma:
  1. Buscar todos os períodos do dia (1 a 8)
  2. Separar em dois grupos:
     - COM PROFESSOR: períodos que têm professor (original ou substituto)
     - VAGOS: períodos sem professor (LIVRE)
  3. Renumerar os períodos:
     - Aulas com professor: períodos 1, 2, 3, 4...
     - Períodos vagos: últimos períodos (6, 7, 8...)
  4. Manter os horários (startTime/endTime) originais de cada período
```

### 4. Exemplo Prático

**Horário Original (8 períodos):**
```
Período 1: Professor A - Matemática
Período 2: Professor B (AUSENTE) - Português
Período 3: Professor C - História
Período 4: Professor D - Geografia
Período 5: Professor E (AUSENTE) - Ciências
Período 6: Professor F - Educação Física
Período 7: Professor G - Arte
Período 8: Professor H - Inglês
```

**Horário Emergencial Compactado:**
```
Período 1 (07:00-08:00): Professor A - Matemática
Período 2 (08:00-09:00): Professor C - História (substitui Prof B)
Período 3 (09:00-10:00): Professor C - História
Período 4 (10:00-11:00): Professor D - Geografia
Período 5 (11:00-12:00): Professor F - Educação Física
Período 6 (13:00-14:00): Professor G - Arte
Período 7 (14:00-15:00): LIVRE/JANELA (era aula do Prof B)
Período 8 (15:00-16:00): LIVRE/JANELA (era aula do Prof E)
```

**Resultado:** Alunos saem 2 períodos mais cedo (às 15:00 ao invés de 17:00)

### 5. Alterações no Código

**Arquivo:** `frontend/src/pages/EmergencySchedule.tsx`

**Função:** `handleGenerateEmergency`

**Mudanças:**
1. Após gerar `emergencySlots` com substituições
2. Para cada turma:
   - Separar slots em: `comProfessor` e `vagos`
   - Ordenar `comProfessor` por período original
   - Renumerar: `comProfessor` recebe períodos 1, 2, 3... e `vagos` recebe os últimos períodos
3. Manter os horários (startTime/endTime) de cada período original

### 6. Benefícios
- ✅ Alunos saem mais cedo nos dias de emergência
- ✅ Períodos vagos concentrados no final
- ✅ Melhor aproveitamento do tempo
- ✅ Fácil visualização no painel de TV
- ✅ Todos os horários disponíveis para todas as turmas

