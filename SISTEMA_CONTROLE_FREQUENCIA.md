# 📊 SISTEMA DE CONTROLE DE FREQUÊNCIA DE PROFESSORES

## © 2025 Wander Pires Silva Coelho

---

## 🎯 **VISÃO GERAL**

Sistema completo para controle de frequência de professores com cálculo automático de aulas previstas, déficits e saldos por disciplina e turma.

---

## 📐 **ARQUITETURA E LÓGICA**

### **1. CÁLCULO DE AULAS PREVISTAS**

#### **Base de Cálculo:**
```
Aulas Previstas = (Aulas por Semana) × (Quantidade de Semanas Letivas no Mês)
```

#### **Onde:**
- **Aulas por Semana**: Definido em `TeacherSubject.weeklyHours` ou calculado automaticamente do horário gerado
- **Semanas Letivas**: Calculado baseado nos dias letivos do `Calendário Letivo`
  - Fórmula: `Total de Dias Letivos ÷ 5` (aprox.)
  - Apenas dias do tipo `'regular'` e `'saturday'` são contabilizados

#### **Exemplo Prático:**
```
📅 Abril 2026:
- Dias Letivos Regular: 18 dias
- Sábados Letivos: 2 dias
- Total: 20 dias letivos

🧮 Cálculo de Semanas:
20 dias ÷ 5 = 4 semanas

👨‍🏫 Professor João - Matemática na Turma 3ºA:
- Aulas por semana: 4 aulas
- Aulas Previstas Abril: 4 × 4 = 16 aulas

✅ Aulas Dadas: 14 aulas
❌ Déficit: 16 - 14 = 2 aulas em falta
```

---

### **2. ESTRUTURA DE DADOS**

#### **TeacherSubject (Já Existe)**
```typescript
{
  teacherId: string,       // ID do professor
  subjectId: string,       // ID da disciplina
  classId: string,         // ID da turma
  weeklyHours: number,     // Aulas por semana (2, 3, 4, etc.)
  schoolId: string
}
```

#### **SchoolDay (Calendário Letivo - Já Existe)**
```typescript
{
  date: string,            // "2026-04-15"
  dayType: enum,           // 'regular', 'saturday', 'holiday', 'recess'
  isCompleted: boolean,    // Dia cumprido?
  schoolId: string
}
```

#### **Teacher (Já Existe)**
```typescript
{
  name: string,
  weeklyWorkload: number,  // 13h (20h) ou 26h (40h)
  contractType: enum,      // '20h' ou '40h'
  isActive: boolean
}
```

---

### **3. ENDPOINTS CRIADOS**

#### **GET `/api/teacher-frequency-report/workload/:teacherId`**
**Calcula carga horária prevista de um professor específico**

**Query Params:**
- `month`: Mês (1-12)
- `year`: Ano (2026)

**Response:**
```json
{
  "teacherId": "12345",
  "teacherName": "João Silva",
  "weeklyWorkload": 26,
  "month": 4,
  "year": 2026,
  "totalSchoolDays": 20,
  "workloadBySubjectClass": [
    {
      "subjectId": "mat123",
      "subjectName": "Matemática",
      "classId": "3a",
      "className": "3º Ano A",
      "weeklyClasses": 4,
      "predictedClasses": 16,
      "givenClasses": 14,
      "deficit": 2,
      "surplus": 0
    },
    {
      "subjectId": "fis456",
      "subjectName": "Física",
      "classId": "3b",
      "className": "3º Ano B",
      "weeklyClasses": 3,
      "predictedClasses": 12,
      "givenClasses": 13,
      "deficit": 0,
      "surplus": 1
    }
  ]
}
```

---

#### **GET `/api/teacher-frequency-report/deficit-surplus`**
**Relatório geral de déficits e saldos de todos os professores**

**Query Params:**
- `month`: Mês (1-12)
- `year`: Ano (2026)

**Response:**
```json
{
  "month": 4,
  "year": 2026,
  "totalTeachers": 25,
  "reports": [
    {
      "teacherId": "12345",
      "teacherName": "João Silva",
      "weeklyWorkload": 26,
      "totalPredictedClasses": 28,
      "totalGivenClasses": 27,
      "totalDeficit": 1,
      "totalSurplus": 0,
      "subjectClassDetails": [
        {
          "subjectId": "mat123",
          "subjectName": "Matemática",
          "classId": "3a",
          "className": "3º Ano A",
          "predictedClasses": 16,
          "givenClasses": 14,
          "deficit": 2,
          "surplus": 0
        }
      ]
    }
  ]
}
```

---

## 📊 **RELATÓRIOS VISUAIS**

### **Por Professor:**
```
👨‍🏫 João Silva - Matemática (40h)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 MATEMÁTICA - 3º Ano A
Previsto: 16 aulas | Dado: 14 aulas
❌ Déficit: 2 aulas

📚 FÍSICA - 3º Ano B  
Previsto: 12 aulas | Dado: 13 aulas
✅ Saldo: 1 aula

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Previsto: 28 aulas
Total Dado: 27 aulas
❌ DÉFICIT GERAL: 1 aula
```

### **Por Disciplina:**
```
📊 RELATÓRIO POR DISCIPLINA - ABRIL/2026

📚 MATEMÁTICA
━━━━━━━━━━━━━━━━━━━━━━
👨‍🏫 João Silva
  • 3º A: -2 aulas (déficit)
  • 3º B: +1 aula (saldo)
  
👩‍🏫 Maria Santos
  • 1º A: -3 aulas (déficit)
  • 1º B: 0 aulas (em dia)

TOTAL MATEMÁTICA: -4 aulas (déficit)
```

### **Por Turma:**
```
🎓 RELATÓRIO POR TURMA - ABRIL/2026

📚 3º Ano A
━━━━━━━━━━━━━━━━━━━━━━
• Matemática (João): -2 aulas
• Física (João): +1 aula
• Química (Maria): -1 aula
• História (Pedro): 0 aulas

DÉFICIT DA TURMA: -2 aulas
```

---

## 🔄 **INTEGRAÇÃO COM CALENDÁRIO LETIVO**

### **Dias Contabilizados:**
- ✅ **Dia Letivo Regular** (`dayType: 'regular'`)
- ✅ **Sábado Letivo** (`dayType: 'saturday'`)
- ❌ **Feriado** (`dayType: 'holiday'`) - NÃO conta
- ❌ **Recesso** (`dayType: 'recess'`) - NÃO conta

### **Cálculo Automático:**
```typescript
const schoolDays = await SchoolDay.find({
  schoolId,
  date: { $gte: startDate, $lte: endDate },
  dayType: { $in: ['regular', 'saturday'] }  // 👈 Apenas estes
});

const totalWeeks = Math.floor(schoolDays.length / 5);
```

---

## 📈 **FLUXO DE TRABALHO**

### **1. CONFIGURAÇÃO INICIAL**
```
1. Cadastrar Professores (weeklyWorkload)
2. Associar Professores → Disciplinas → Turmas (TeacherSubject)
3. Definir Calendário Letivo (SchoolDay)
4. Gerar Horários (GeneratedTimetable)
```

### **2. DURANTE O MÊS**
```
1. Marcar Presença/Ausência diária
2. Registrar aulas dadas por disciplina/turma
3. Sistema calcula automaticamente déficits/saldos
```

### **3. FIM DO MÊS**
```
1. Gerar relatório mensal de déficits
2. Identificar professores/disciplinas/turmas em débito
3. Planejar reposições
```

---

## 🎨 **INTERFACE FRONTEND (A CRIAR)**

### **Tela: Controle de Frequência**
```
┌─────────────────────────────────────────────┐
│  📅 CONTROLE DE FREQUÊNCIA - ABRIL/2026     │
├─────────────────────────────────────────────┤
│                                             │
│  [Filtros]                                  │
│  Professor: [Todos ▼]                       │
│  Disciplina: [Todas ▼]                      │
│  Turma: [Todas ▼]                           │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 🟢 João Silva - Matemática            │ │
│  │ ⚪ Previsto: 28  |  ✅ Dado: 27       │ │
│  │ ❌ Déficit: 1 aula                    │ │
│  │                                        │ │
│  │ Detalhes por Turma:                   │ │
│  │ • 3º A: -2 aulas                      │ │
│  │ • 3º B: +1 aula                       │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  [📊 Ver Relatório Detalhado]              │
└─────────────────────────────────────────────┘
```

---

## 🚀 **PRÓXIMOS PASSOS**

### **Backend: ✅ PRONTO**
- [x] Endpoint de cálculo de carga horária
- [x] Endpoint de relatórios de déficit/saldo
- [x] Integração com calendário letivo
- [x] Rotas registradas no server.ts

### **Frontend: 🔄 A FAZER**
- [ ] Página de Controle de Frequência melhorada
- [ ] Visualização de déficits/saldos
- [ ] Filtros por professor/disciplina/turma
- [ ] Gráficos de acompanhamento
- [ ] Exportação de relatórios (PDF/Excel)

### **Integrações: 🔄 A FAZER**
- [ ] Registrar aulas dadas na frequência
- [ ] Notificações automáticas de déficits
- [ ] Planejamento de reposições

---

## 📝 **NOTAS IMPORTANTES**

1. **Cálculo Inteligente**: O sistema prioriza `weeklyHours` do TeacherSubject, mas busca no horário gerado se não estiver definido
2. **Dias Letivos**: Apenas dias `regular` e `saturday` são contabilizados
3. **Flexibilidade**: Professores podem ter carga horária diferente por disciplina/turma
4. **Sábados Letivos**: Contam como semana completa se seguirem horário específico
5. **Déficit Negativo = Surplus**: Valores negativos indicam que o professor deu mais aulas que o previsto

---

✅ Sistema implementado e pronto para uso!
