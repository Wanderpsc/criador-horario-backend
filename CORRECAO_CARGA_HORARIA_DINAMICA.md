# Correção: Carga Horária Dinâmica

**Data:** 12/02/2026  
**Tipo:** Correção/Melhoria

## 🎯 Problema Identificado

Os cálculos de carga horária diária, semanal e mensal estavam **fixos**, usando valores estimados que não refletiam a realidade do calendário escolar e do horário de aulas:

- **40 semanas letivas** (fixo) - não considerava o calendário escolar real
- **5 dias letivos por semana** (fixo) - não considerava o horário geral configurado
- **12 meses** (divisão simples) - não considerava distribuição real

## ✅ Solução Implementada

### 1. Cálculo Dinâmico de Semanas Letivas

Criada função `totalSchoolWeeks` que:
- Analisa o calendário escolar completo do ano
- Considera feriados e recessos cadastrados
- Conta apenas dias úteis (segunda a sexta)
- Calcula o número real de semanas letivas

```typescript
const totalSchoolWeeks = useMemo(() => {
  // Conta dias úteis no ano excluindo feriados e recessos
  // Converte em semanas (dias ÷ 5)
  return Math.floor(workingDaysInYear / 5);
}, [calendarData]);
```

### 2. Cálculo Dinâmico de Dias Letivos por Semana

Criada função `schoolDaysPerWeek` que:
- Analisa o horário geral selecionado
- Identifica quais dias da semana têm aulas
- Retorna o número real de dias com aulas

```typescript
const schoolDaysPerWeek = useMemo(() => {
  // Analisa schedule e identifica dias com aulas
  // Pode ser 3, 4, 5 ou 6 dias por semana
  return daysWithClasses.size || 5;
}, [selectedTimetableData]);
```

### 3. Cálculos Proporcionais Atualizados

**Antes:**
```typescript
const annualHours = weeklyHours * 40; // FIXO
const monthlyHours = annualHours / 12; // FIXO
const dailyHours = weeklyHours / 5; // FIXO
```

**Depois:**
```typescript
const annualHours = weeklyHours * totalSchoolWeeks; // DINÂMICO
const monthlyHours = annualHours / 12; // Proporcional ao ano real
const dailyHours = weeklyHours / schoolDaysPerWeek; // DINÂMICO
```

## 📊 Benefícios

### ✅ Precisão nos Cálculos
- Carga horária anual reflete semanas letivas reais
- Carga horária diária reflete dias com aulas reais
- Carga horária mensal proporcional ao ano letivo

### ✅ Transparência para o Usuário
Adicionado indicador visual mostrando:
```
📊 Parâmetros de Cálculo Atuais:
  📅 38 semanas letivas/ano
  🗓️ 5 dias letivos/semana
* Baseado no calendário escolar e horário geral selecionado
```

### ✅ Atualização Automática
- Alterações no calendário escolar atualizam os cálculos
- Mudanças no horário geral refletem nas cargas
- Valores sempre sincronizados com a configuração atual

## 📋 Arquivos Modificados

### `frontend/src/pages/TeacherAttendance.tsx`

1. **Adicionadas funções de cálculo dinâmico:**
   - `totalSchoolWeeks` (linhas ~425-450)
   - `schoolDaysPerWeek` (linhas ~453-475)
   - Atualizado `workingDaysInPeriod` para usar novos parâmetros

2. **Atualizada query `teacherWorkloadData`:**
   - Query key inclui `totalSchoolWeeks` e `schoolDaysPerWeek`
   - Cálculos usam valores dinâmicos
   - Enabled condicional aos parâmetros

3. **Atualizada documentação na interface:**
   - Textos explicativos refletem cálculos dinâmicos
   - Adicionado indicador visual de parâmetros
   - Removidas referências a valores fixos

## 🧪 Como Testar

### Cenário 1: Calendário com Feriados Extras
1. Adicione feriados municipais no calendário escolar
2. Acesse "Frequência de Professores"
3. Verifique que a carga horária anual diminuiu proporcionalmente

### Cenário 2: Horário com 4 Dias de Aula
1. Crie um horário geral com aulas em 4 dias da semana
2. Selecione esse horário em "Frequência de Professores"
3. Verifique que a carga horária diária aumentou (dividida por 4, não 5)

### Cenário 3: Comparação Antes/Depois
- **Antes:** 10h/semana = 400h/ano (fixo: 10 × 40)
- **Depois:** 10h/semana = 380h/ano (dinâmico: 10 × 38, exemplo)

## 📈 Impacto

### Módulos Afetados
- ✅ Frequência de Professores (cálculos corrigidos)
- ✅ Relatórios de Carga Horária
- ✅ Cálculo de Déficit/Saldo
- ✅ Pagamentos (baseados em CH real)

### Retrocompatibilidade
- ✅ Valores padrão caso calendário não configurado
- ✅ Fallback para 40 semanas e 5 dias se necessário
- ✅ Não quebra funcionalidades existentes

## 🔄 Próximas Melhorias Sugeridas

1. **ClassSubjects.tsx:** Atualizar estimativa inicial de 40 semanas
2. **Backend:** Adicionar validação de calendário ao salvar lotações
3. **Dashboard:** Mostrar resumo de semanas letivas restantes
4. **Relatórios:** Adicionar comparativo anual vs executado

## 📝 Notas Técnicas

- Cálculos em `useMemo` para otimização de performance
- Dependencies corretas para re-cálculo automático
- Tratamento de casos onde calendário/horário não existe
- Valores arredondados apropriadamente (toFixed) na UI

---

**Status:** ✅ Implementado e Testado  
**Desenvolvedor:** Wander Pires Silva Coelho  
**Aprovação:** Pendente de testes em produção
