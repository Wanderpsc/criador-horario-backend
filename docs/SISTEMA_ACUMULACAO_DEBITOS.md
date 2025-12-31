# Sistema de Acumulação Automática de Débitos - Sábados de Reposição

## Resumo das Implementações

### 1. Acumulação Automática de Débitos

**Problema Resolvido:** Professores que não comparecem aos sábados de reposição agora têm seus débitos automaticamente acumulados para os próximos sábados.

**Como Funciona:**
- Quando um sábado é marcado como realizado, o sistema identifica automaticamente quais professores estavam agendados mas não compareceram
- Para cada aula não realizada, é criado um novo débito acumulado
- Estes débitos são marcados com `isAccumulated: true` para rastreamento
- Os débitos acumulados são priorizados na próxima geração de horário

### 2. Rastreamento Completo de Carga Horária

**Novos Campos nos Modelos:**

#### TeacherDebtRecord
- `makeupSaturdayIds`: Array com IDs dos sábados onde o débito foi agendado
- `accumulatedFromSaturdayId`: ID do sábado que originou o débito acumulado (se aplicável)
- `isAccumulated`: Booleano indicando se é um débito acumulado de não comparecimento

#### MakeupSaturday
- `absentTeachers`: Array com IDs dos professores que não compareceram
- `status`: 'planned' | 'realized' | 'cancelled'
- `totalScheduledHours`: Total de horas agendadas
- `totalRealizedHours`: Total de horas efetivamente realizadas
- `teacherDebts`: Detalhamento dos débitos que o sábado visa pagar

### 3. Geração Automática Inteligente

**Nova Rota:** `POST /api/saturday-makeup/generate-from-debts`

**Funcionalidades:**
- Busca TODOS os débitos pendentes (originais + acumulados)
- Prioriza débitos acumulados (faltas em sábados anteriores)
- Ordena débitos por antiguidade
- Distribui automaticamente as aulas por turma e período
- Vincula cada slot ao débito correspondente para rastreamento

**Uso no Frontend:**
- Botão "🎯 Gerar Automático (com Acumulados)" na página de Sábados de Reposição
- Não requer seleção de período de busca
- Inclui automaticamente todos os professores com débitos pendentes

### 4. Processamento Pós-Sábado

**Nova Rota:** `POST /api/saturday-makeup/:id/process`

**O que faz:**
1. Identifica professores presentes vs ausentes
2. Dá baixa nos débitos dos professores presentes
3. Cria débitos acumulados para professores ausentes
4. Atualiza estatísticas do sábado (horas realizadas, status, etc.)
5. Mantém histórico completo de presenças

**Uso no Frontend:**
- Botão "Processar" nos sábados salvos (quando há presenças marcadas)
- Confirmação antes de processar mostrando quantos terão baixa e quantos acumularão
- Atualização automática de todas as visualizações após processamento

### 5. Visualização Aprimorada

**Indicadores Visuais:**
- ⚠️ Badge vermelho mostrando débitos acumulados por professor
- ✓ Badge verde mostrando aulas já repostas
- Status visual dos sábados (Planejado/Realizado/Cancelado)
- Marcadores em débitos individuais indicando se são acumulados

**Informações Exibidas:**
- Total de débitos originais vs acumulados
- Histórico de comparecimento em cada sábado salvo
- Checkboxes individuais para marcar presença de cada professor
- Contador de professores presentes/ausentes

## Fluxo Completo

### Cenário 1: Professor falta durante a semana
1. Horário emergencial é criado registrando a falta
2. Sistema cria automaticamente um débito no TeacherDebtRecord
3. Professor aparece na lista "Professores com Aulas a Repor"

### Cenário 2: Criando sábado de reposição
1. Admin seleciona data do sábado
2. Clica em "🎯 Gerar Automático (com Acumulados)"
3. Sistema busca TODOS os débitos pendentes (faltas da semana + acumulados de sábados anteriores)
4. Horário é gerado automaticamente priorizando débitos acumulados
5. Admin pode editar se necessário
6. Salva o horário

### Cenário 3: Após o sábado de reposição
1. Admin marca presença de cada professor individualmente
2. Clica em "Processar" no sábado correspondente
3. Sistema automaticamente:
   - Dá baixa nos débitos dos presentes
   - Cria débitos acumulados para os ausentes
   - Atualiza status para "Realizado"
4. Débitos acumulados aparecem no próximo sábado

### Cenário 4: Professor acumula múltiplas faltas em sábados
1. Professor falta no Sábado 1 → 2 aulas acumuladas
2. Sábado 2 é gerado → Professor é automaticamente incluído com 2 aulas
3. Professor falta novamente no Sábado 2 → Mais 2 aulas acumuladas (total: 4)
4. Sábado 3 é gerado → Professor aparece com 4 aulas prioritariamente

## APIs Disponíveis

### Consultar débitos de um professor
```
GET /api/saturday-makeup/teacher-debts/:teacherId
```

Retorna:
```json
{
  "success": true,
  "data": {
    "debts": [...],
    "totalHoursOwed": 5,
    "totalDebts": 5,
    "originalDebts": 3,
    "accumulatedDebts": 2
  }
}
```

### Gerar horário automaticamente
```
POST /api/saturday-makeup/generate-from-debts
Body: {
  "date": "2025-01-04",
  "maxPeriods": 4
}
```

### Processar sábado realizado
```
POST /api/saturday-makeup/:id/process
```

### Marcar presença individual
```
PUT /api/saturday-makeup/:id/attendance
Body: {
  "teacherId": "...",
  "attended": true/false
}
```

## Benefícios do Sistema

1. **Automação Total:** Não é mais necessário rastrear manualmente quem faltou em sábados
2. **Justiça:** Professores que faltam nos sábados são automaticamente realocados
3. **Transparência:** Todos os débitos são rastreados com origem e histórico
4. **Priorização:** Débitos acumulados são sempre priorizados na geração
5. **Controle:** Admin pode ver exatamente quem está devendo e quanto
6. **Histórico:** Registro completo de todas as reposições e faltas

## Observações Importantes

- Débitos acumulados têm prioridade sobre débitos originais
- O sistema mantém vínculos entre débitos e sábados para auditoria
- Presenças são confirmadas individualmente por professor
- Processamento de sábado só deve ser feito após o evento real
- Uma vez processado, o sábado fica marcado como "Realizado" e não pode ser reprocessado

## Copyright
© 2025 Wander Pires Silva Coelho  
E-mail: wanderpsc@gmail.com  
Todos os direitos reservados.
