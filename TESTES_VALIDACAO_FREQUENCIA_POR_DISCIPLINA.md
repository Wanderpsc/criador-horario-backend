# ✅ TESTE: Validação da Lógica de Frequência por Disciplina

**Data:** 10/02/2026  
**Sistema:** Criador de Horário de Aula

---

## 📋 CENÁRIO DE TESTE

### **Dados de Exemplo:**

**Professor:** Claudia Rodrigues Correia Carvalho  
**Disciplinas:**
- EMT&DMI (2ª Série - Propedêutico-I-A)
- EMR.INTEGRAL (3ª Série - Integral-I-A)
- EMTFDES-SIS (3ª Série - Integral-I-B)
- EMTFDES-SIS (2ª Série - Integral-I-B)

**Calendário Letivo de Fevereiro/2026:**
- Dias letivos: 24 dias (segunda a sexta)
- Sábados de reposição: 3 dias

---

## 🧪 TESTES A REALIZAR

### **1. Teste de Busca de Aulas Agendadas**

**Endpoint:** `GET /api/teacher-attendance/scheduled-classes/2026-02-10`

**Resultado Esperado:**
```json
{
  "date": "2026-02-10",
  "dayOfWeek": "Terça",
  "teachers": [
    {
      "teacherId": "...",
      "teacherName": "Claudia Rodrigues",
      "classes": [
        {
          "period": 1,
          "subjectId": "emtbdmi_id",
          "subjectName": "EMT&DMI",
          "classId": "2a_prop",
          "className": "2ª Série - Propedêutico-I-A",
          "status": "pending"
        },
        {
          "period": 2,
          "subjectId": "emrintegral_id",
          "subjectName": "EMR.INTEGRAL",
          "classId": "3a_integral",
          "className": "3ª Série - Integral-I-A",
          "status": "pending"
        }
        // ... outras aulas
      ]
    }
  ]
}
```

✅ **Validar:**
- Todas as disciplinas do professor estão listadas
- Cada aula tem `subjectId` e `classId` corretos
- Status inicial é `pending`

---

### **2. Teste de Registro de Frequência**

**Endpoint:** `PUT /api/teacher-attendance/class-status`

**Request:**
```json
{
  "teacherId": "claudia_id",
  "date": "2026-02-10",
  "period": 1,
  "status": "present"
}
```

**Resultado Esperado:**
- Aula marcada como `present`
- Campo `markedAt` preenchido
- Totais recalculados automaticamente (via pre-save hook)

✅ **Validar:**
- `totalScheduledClasses` = 5 (exemplo)
- `totalPresentClasses` = 1
- `totalPendingClasses` = 4
- `attendanceRate` = 20%

---

### **3. Teste de Relatório por Disciplina**

**Endpoint:** `GET /api/teacher-attendance/statistics?startDate=2026-02-01&endDate=2026-02-28&bySubject=true`

**Resultado Esperado:**
```json
[
  {
    "subjectId": "emtbdmi_id",
    "subjectName": "EMT&DMI",
    "classId": "2a_prop",
    "className": "2ª Série - Propedêutico-I-A",
    "teacherId": "claudia_id",
    "teacherName": "Claudia Rodrigues",
    "scheduledClasses": 24,
    "givenClasses": 23,
    "absentClasses": 1,
    "pendingClasses": 0,
    "deficit": 1,
    "dates": ["2026-02-15"]
  }
  // ... outras disciplinas
]
```

✅ **Validar:**
- Uma entrada para cada combinação disciplina + turma
- `scheduledClasses` corresponde aos dias letivos × aulas semanais
- `givenClasses` vem dos registros de frequência
- `deficit` = scheduledClasses - givenClasses
- `dates` contém apenas datas de faltas

---

### **4. Teste de Relatório Mensal Completo**

**Endpoint:** `GET /api/teacher-frequency-report/deficit-surplus?month=2&year=2026`

**Resultado Esperado:**
```json
{
  "month": 2,
  "year": 2026,
  "totalTeachers": 25,
  "reports": [
    {
      "teacherId": "claudia_id",
      "teacherName": "Claudia Rodrigues",
      "weeklyWorkload": 26,
      "totalPredictedClasses": 104,
      "totalGivenClasses": 99,
      "totalDeficit": 5,
      "totalSurplus": 0,
      "subjectClassDetails": [
        {
          "subjectId": "emtbdmi_id",
          "subjectName": "EMT&DMI",
          "classId": "2a_prop",
          "className": "2ª Série - Propedêutico-I-A",
          "predictedClasses": 24,
          "givenClasses": 23,
          "deficit": 1,
          "surplus": 0
        }
        // ... outras disciplinas
      ]
    }
  ]
}
```

✅ **Validar:**
- `totalPredictedClasses` = soma de `predictedClasses` de todas as disciplinas
- `totalGivenClasses` = soma de `givenClasses` de todas as disciplinas
- `totalDeficit` = soma dos déficits individuais
- Cada disciplina tem cálculo independente

---

## 🔍 CASOS ESPECIAIS A TESTAR

### **A. Sábado de Reposição:**

**Cenário:**
- Dia: 08/02/2026 (sábado)
- Seguindo: segunda-feira
- Aulas esperadas: as mesmas de segunda-feira

**Teste:**
```
GET /api/teacher-attendance/scheduled-classes/2026-02-08
```

**Resultado Esperado:**
- `dayOfWeek`: "Segunda" (não "Sábado")
- Aulas idênticas às de segunda-feira normal

---

### **B. Professor com Múltiplas Disciplinas na Mesma Turma:**

**Cenário:**
- Professor: João Silva
- Turma: 1ª Série A
- Disciplinas: Matemática, Física

**Teste:**
```
GET /api/teacher-frequency-report/deficit-surplus?month=2&year=2026
```

**Resultado Esperado:**
- Duas entradas separadas em `subjectClassDetails`
- Cálculos independentes para cada disciplina

---

### **C. Dia Não Cadastrado no Calendário:**

**Cenário:**
- Data: 20/02/2026
- Não existe em `SchoolDay`

**Teste:**
```
GET /api/teacher-attendance/scheduled-classes/2026-02-20
```

**Resultado Esperado:**
```json
{
  "warning": true,
  "message": "Usando horário padrão do dia da semana...",
  "teachers": [...]
}
```

---

### **D. Professor Sem Aulas no Dia:**

**Cenário:**
- Professor: Eunice Maria
- Dia: domingo (não letivo)

**Teste:**
```
GET /api/teacher-attendance/scheduled-classes/2026-02-09
```

**Resultado Esperado:**
```json
{
  "teachers": [
    {
      "teacherId": "eunice_id",
      "teacherName": "Eunice Maria",
      "classes": []
    }
  ]
}
```

✅ **Validar:**
- Professor aparece na lista
- Array de classes vazio
- Mensagem: "Sem aulas agendadas neste dia"

---

## 🛠️ COMANDOS DE TESTE

### **Via Postman/Insomnia:**

```http
### 1. Buscar aulas do dia
GET https://seu-backend.com/api/teacher-attendance/scheduled-classes/2026-02-10
Authorization: Bearer {{token}}

### 2. Marcar presença
PUT https://seu-backend.com/api/teacher-attendance/class-status
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "teacherId": "...",
  "date": "2026-02-10",
  "period": 1,
  "status": "present"
}

### 3. Relatório por disciplina
GET https://seu-backend.com/api/teacher-attendance/statistics?startDate=2026-02-01&endDate=2026-02-28&bySubject=true
Authorization: Bearer {{token}}

### 4. Relatório mensal completo
GET https://seu-backend.com/api/teacher-frequency-report/deficit-surplus?month=2&year=2026
Authorization: Bearer {{token}}
```

---

### **Via Frontend:**

1. Acessar: https://criador-horario-aula.surge.sh/#/teacher-attendance
2. Selecionar data: 10/02/2026
3. Verificar lista de professores
4. Clicar em "Claudia Rodrigues Correia Carvalho"
5. Verificar aulas exibidas (com disciplina e turma)
6. Marcar presença/ausência
7. Salvar frequência
8. Visualizar relatório por disciplina (abaixo)

---

## ✅ CRITÉRIOS DE SUCESSO

- [ ] Backend compila sem erros TypeScript
- [ ] Todas as rotas retornam status 200
- [ ] Cálculos de aulas previstas batem com calendário letivo
- [ ] Cálculos de aulas dadas refletem registros de frequência
- [ ] Déficit/saldo calculado corretamente por disciplina
- [ ] Frontend exibe dados por disciplina/turma
- [ ] Relatórios exportam em PDF/Excel com dados corretos
- [ ] Performance aceitável (< 2s para buscar aulas do dia)

---

## 📊 EXEMPLO DE RESULTADO FINAL

### **Relatório Esperado - Claudia Rodrigues:**

| Disciplina | Turma | Previsto | Dado | Déficit | Saldo |
|-----------|-------|----------|------|---------|-------|
| EMT&DMI | 2ª Série - Prop-I-A | 24 | 23 | 1 | 0 |
| EMR.INTEGRAL | 3ª Série - Int-I-A | 16 | 16 | 0 | 0 |
| EMTFDES-SIS | 3ª Série - Int-I-B | 32 | 32 | 0 | 0 |
| EMTFDES-SIS | 2ª Série - Int-I-B | 32 | 33 | 0 | 1 |
| **TOTAL** | - | **104** | **104** | **1** | **1** |

---

## 🐛 PROBLEMAS CONHECIDOS E SOLUÇÕES

### **Problema 1:** "Nenhum professor encontrado"
**Causa:** schoolId diferente entre GeneratedTimetable e Teacher  
**Solução:** Verificar campo `school` vs `schoolId` nas queries

### **Problema 2:** Déficit sempre zero
**Causa:** Aulas não sendo contadas por disciplina  
**Solução:** ✅ CORRIGIDO - adicionar filtro por subjectId

### **Problema 3:** Aulas duplicadas
**Causa:** Múltiplos horários ativos sem filtro de scheduleId  
**Solução:** Passar scheduleId específico na query

---

## 📞 SUPORTE

Em caso de erros, verificar logs do backend:
```bash
cd backend
npm run dev
# Buscar por: [class-status], [scheduled-classes], [deficit-surplus]
```

---

**© 2025 Wander Pires Silva Coelho**  
wanderpsc@gmail.com
