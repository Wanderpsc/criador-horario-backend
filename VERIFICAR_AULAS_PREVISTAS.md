# Script de Verificação - Aulas Previstas no Relatório Anual

**Como usar:** Execute estes comandos no console do MongoDB ou via API para verificar se os dados necessários existem.

## 1. Verificar Disciplinas com Carga Horária

```javascript
// Contar disciplinas SEM carga horária
db.subjects.count({
  $and: [
    { workload: { $in: [null, 0, undefined] } },
    { workloadHours: { $in: [null, 0, undefined] } },
    { hours: { $in: [null, 0, undefined] } },
    { weeklyHours: { $in: [null, 0, undefined] } }
  ]
})

// Mostrar disciplinas SEM carga horária
db.subjects.find({
  $and: [
    { workload: { $in: [null, 0, undefined] } },
    { workloadHours: { $in: [null, 0, undefined] } },
    { hours: { $in: [null, 0, undefined] } },
    { weeklyHours: { $in: [null, 0, undefined] } }
  ]
}, { name: 1, workload: 1, weeklyHours: 1 })

// Listar TODAS as disciplinas com suas cargas
db.subjects.find({}, { 
  name: 1, 
  workload: 1, 
  workloadHours: 1, 
  hours: 1, 
  weeklyHours: 1 
}).sort({ name: 1 })
```

## 2. Verificar Calendário Letivo de 2026

```javascript
// Contar dias letivos de 2026
db.schooldays.count({
  date: { 
    $gte: ISODate("2026-01-01"), 
    $lte: ISODate("2026-12-31") 
  },
  isSchoolDay: true
})

// Mostrar primeiros 10 dias letivos de 2026
db.schooldays.find({
  date: { 
    $gte: ISODate("2026-01-01"), 
    $lte: ISODate("2026-12-31") 
  },
  isSchoolDay: true
}).limit(10).sort({ date: 1 })

// Contar por tipo de dia
db.schooldays.aggregate([
  {
    $match: {
      date: { 
        $gte: ISODate("2026-01-01"), 
        $lte: ISODate("2026-12-31") 
      }
    }
  },
  {
    $group: {
      _id: "$dayType",
      count: { $sum: 1 }
    }
  }
])
```

## 3. Verificar Horários Gerados

```javascript
// Contar horários gerados
db.generatedtimetables.count()

// Verificar se há slots com professores e disciplinas
db.generatedtimetables.aggregate([
  { $unwind: "$slots" },
  { 
    $group: {
      _id: null,
      totalSlots: { $sum: 1 },
      slotsComProfessor: { 
        $sum: { 
          $cond: [{ $ne: ["$slots.teacherId", null] }, 1, 0] 
        } 
      },
      slotsComDisciplina: { 
        $sum: { 
          $cond: [{ $ne: ["$slots.subjectId", null] }, 1, 0] 
        } 
      }
    }
  }
])
```

## 4. Verificar Professores Ativos

```javascript
// Contar professores ativos
db.teachers.count({ isActive: true })

// Listar professores ativos
db.teachers.find(
  { isActive: true }, 
  { name: 1, weeklyWorkload: 1 }
).sort({ name: 1 })
```

## 5. Teste Completo via API

Use o Postman, Insomnia ou curl:

```bash
# Substituir SEU_TOKEN e SEU_SCHOOL_ID
TOKEN="seu_token_jwt_aqui"
SCHOOL_ID="seu_school_id_aqui"
API_URL="https://criador-horario-backend.onrender.com"

# Testar endpoint de estatísticas
curl -X GET "$API_URL/api/teacher-attendance/statistics?startDate=2026-01-01&endDate=2026-12-31" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

## 6. Verificar Logs do Render

1. Acesse: https://dashboard.render.com
2. Selecione o serviço backend
3. Vá em "Logs"
4. Procure por:
   - `📖 [CARGA ANUAL] Disciplina` - Dados das disciplinas
   - `📊 [statistics] Encontrados X professores ativos`
   - `📚 [statistics] Encontrados X horários gerados`
   - `⚠️` - Alertas/warnings

## 7. Checklist de Dados Necessários

- [ ] Pelo menos 1 disciplina tem `workload` ou `weeklyHours` > 0
- [ ] Calendário de 2026 tem dias letivos cadastrados (mínimo 100 dias)
- [ ] Pelo menos 1 horário foi gerado
- [ ] Pelo menos 1 professor está ativo
- [ ] Horários gerados têm slots com `teacherId` e `subjectId`

## 8. Solução Rápida se NÃO Houver Dados

### Se não houver CARGA HORÁRIA nas disciplinas:

```javascript
// Atualizar Matemática com 160 aulas/ano
db.subjects.updateOne(
  { name: "Matemática" },
  { $set: { workload: 160 } }
)

// Ou atualizar com weeklyHours (4 aulas/semana)
db.subjects.updateOne(
  { name: "Matemática" },
  { $set: { weeklyHours: 4 } }
)
```

### Se não houver CALENDÁRIO de 2026:

Opção 1: Importar do frontend (Calendário Letivo)
Opção 2: Cadastrar manualmente alguns dias

```javascript
// Exemplo: cadastrar janeiro de 2026
// (Executar em loop ou script)
db.schooldays.insertOne({
  schoolId: ObjectId("SEU_SCHOOL_ID"),
  date: ISODate("2026-01-06"),
  dayType: "regular",
  isSchoolDay: true
})
```

## Resultado Esperado

Após verificar todos os pontos acima e garantir que há dados:

1. **No frontend:**
   - Ir em "Frequência de Professores"
   - Clicar em "Relatórios de Frequência"
   - Selecionar "Anual"
   - Datas: 01/01/2026 a 31/12/2026

2. **Resultado:**
   - A coluna "Aulas Previstas" deve mostrar números > 0
   - Exemplo: Claudia - 160 aulas previstas

3. **Se ainda aparecer 0:**
   - Verificar logs do Render
   - Executar os scripts de verificação acima
   - Confirmar que o deploy foi bem-sucedido

## Contato

Se após todas as verificações o problema persistir, envie:
- Screenshots dos logs do Render
- Resultados dos scripts de verificação acima
- Screenshot do relatório anual
