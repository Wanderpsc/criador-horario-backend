# Correção: Aulas Previstas Zeradas no Relatório Anual

**Data:** 11/02/2026  
**Problema:** No relatório anual de frequência, a coluna "Aulas Previstas" estava aparecendo como 0 para todos os professores.

## Causa do Problema

O cálculo de aulas previstas tinha 3 problemas principais:

### 1. **Dependência de Registros de Frequência**
A lógica antiga só calculava aulas previstas para professores que já tinham registros de frequência salvos. Se um professor não tinha nenhum registro, ele não aparecia nas estatísticas.

### 2. **Falta de Busca Proativa de Disciplinas**
O sistema não buscava ativamente quais disciplinas cada professor leciona. Dependia apenas dos registros de frequência existentes.

### 3. **Logs Insuficientes**
Não havia logs detalhados para diagnosticar por que o cálculo estava retornando 0.

## Solução Implementada

### Arquivo: `backend/src/routes/teacherAttendance.ts`

#### Mudanças no Endpoint `/statistics`

**ANTES:**
```typescript
// Coletava disciplinas apenas dos registros de frequência existentes
records.forEach(record => {
  if (!teacherStats[record.teacherId]) {
    // Criava entrada apenas se houvesse registro
  }
});
```

**DEPOIS:**
```typescript
// Busca TODOS os professores ativos primeiro
const allActiveTeachers = await Teacher.find({ schoolId, isActive: true });

// Inicializa estatísticas para TODOS
for (const teacher of allActiveTeachers) {
  teacherStats[teacherId] = {
    teacherId,
    teacherName: teacher.name,
    totalScheduledClasses: 0,
    // ...
  };
}

// Busca disciplinas dos HORÁRIOS GERADOS
const timetables = await GeneratedTimetable.find({ school: schoolId });
for (const timetable of timetables) {
  // Extrai disciplinas de cada professor dos slots
}
```

#### Melhorias na Função `calculateExpectedClassesFromAnnualWorkload`

**Logs Adicionados:**
- Detalhes da disciplina (workload, workloadHours, hours, weeklyHours)
- Quantidade de dias letivos no ano
- Quantidade de dias letivos no período
- Cálculo passo a passo
- Alertas quando não há dados cadastrados

**Fallbacks Melhorados:**
- Se não há `workload` anual, usa `weeklyHours × 40 semanas`
- Se não há dias letivos cadastrados, usa padrão de 200 dias
- Logs claros indicando quando cada fallback é usado

## Pré-requisitos para Funcionamento

Para o cálculo funcionar corretamente, é necessário:

### 1. **Disciplinas com Carga Horária**
Cada disciplina deve ter preenchido:
- `workload` (carga anual em aulas), OU
- `workloadHours` (carga anual em horas), OU
- `hours` (campo alternativo), OU
- `weeklyHours` (como fallback)

### 2. **Calendário Letivo Configurado**
- Dias letivos devem estar cadastrados no SchoolDay
- Campo `isSchoolDay: true` para dias letivos
- Campo `dayType: 'regular'` ou `'saturday'`

### 3. **Horários Gerados**
- Pelo menos um horário deve ter sido gerado
- Os slots devem ter `teacherId` e `subjectId` preenchidos

### 4. **Professores Ativos**
- Professores devem ter `isActive: true`

## Como Diagnosticar Problemas

### 1. Verificar Logs do Backend
```bash
# Procurar por logs específicos:
grep "CARGA ANUAL" logs.txt
grep "statistics" logs.txt
```

**Logs importantes:**
- `📖 [CARGA ANUAL] Disciplina "Nome"` - Mostra dados da disciplina
- `📅 [CARGA ANUAL] Dias letivos no ano` - Quantidade de dias cadastrados
- `⚠️ [CARGA ANUAL] Nenhum dia letivo cadastrado` - Alerta crítico
- `✅ [CARGA ANUAL] Resultado` - Cálculo final

### 2. Verificar Disciplinas
```javascript
// No MongoDB ou via API
db.subjects.find({ schoolId: "ID_DA_ESCOLA" }).forEach(s => {
  print(`${s.name}: workload=${s.workload}, weeklyHours=${s.weeklyHours}`);
});
```

### 3. Verificar Calendário Letivo
```javascript
// Contar dias letivos de 2026
db.schooldays.count({
  schoolId: "ID_DA_ESCOLA",
  date: { $gte: "2026-01-01", $lte: "2026-12-31" },
  isSchoolDay: true
});
```

### 4. Verificar Horários Gerados
```javascript
// Contar horários da escola
db.generatedtimetables.count({
  school: "ID_DA_ESCOLA"
});
```

## Exemplo de Cálculo

**Cenário:**
- Disciplina: Matemática
- Carga horária anual: 160 aulas
- Dias letivos cadastrados em 2026: 200 dias
- Período do relatório: 01/01/2026 a 31/12/2026 (200 dias)

**Cálculo:**
```
Aulas Previstas = (160 aulas ÷ 200 dias) × 200 dias = 160 aulas
```

**Cenário com período parcial:**
- Mesmo acima, mas período: 01/01/2026 a 31/03/2026
- Dias letivos no período: 50 dias

**Cálculo:**
```
Aulas Previstas = (160 aulas ÷ 200 dias) × 50 dias = 40 aulas
```

## Testando a Correção

1. **Fazer Deploy do Backend**
```bash
cd backend
npm run build
# Deploy para o Render
```

2. **Acessar Relatório Anual**
- Ir para "Frequência de Professores"
- Clicar em "Relatórios de Frequência"
- Selecionar "Anual"
- Escolher período: 01/01/2026 a 31/12/2026

3. **Verificar Logs**
- Abrir console do navegador (F12)
- Ver requisições para `/teacher-attendance/statistics`
- Verificar logs do backend no Render

4. **Resultados Esperados**
- "Aulas Previstas" deve mostrar um número > 0 para professores que:
  - Têm horários gerados
  - Lecionam disciplinas com carga horária definida
  - Está no período selecionado

## Possíveis Problemas Restantes

Se ainda aparecer 0, verificar:

1. **Não há disciplinas com carga horária**
   - Solução: Cadastrar `workload` ou `weeklyHours` nas disciplinas

2. **Não há dias letivos no calendário de 2026**
   - Solução: Importar/cadastrar calendário letivo de 2026
   - Sistema usará fallback de 200 dias, mas é recomendado ter o calendário correto

3. **Não há horários gerados**
   - Solução: Gerar horários em "Gerar Horários"

4. **Professor não tem disciplinas atribuídas no horário**
   - Solução: Verificar se o professor está nos slots dos horários gerados

## Arquivos Modificados

- `backend/src/routes/teacherAttendance.ts`
  - Função `calculateExpectedClassesFromAnnualWorkload()` (linha ~56)
  - Endpoint `/statistics` (linha ~859)

## Próximos Passos

- [ ] Fazer deploy do backend corrigido
- [ ] Testar com dados reais
- [ ] Verificar logs para confirmar funcionamento
- [ ] Documentar no CHANGELOG.md
