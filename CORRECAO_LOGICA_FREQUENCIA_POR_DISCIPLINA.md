# 🔧 CORREÇÃO: Lógica de Frequência por Professor e Disciplina

**Data:** 10/02/2026  
**Autor:** Wander Pires Silva Coelho

---

## 📋 PROBLEMA IDENTIFICADO

O sistema de frequência não estava calculando corretamente o **déficit/saldo por disciplina**. A lógica anterior:

1. ❌ Contava apenas o **total geral de aulas do professor**
2. ❌ Não separava as aulas por **disciplina/turma**
3. ❌ O cálculo de aulas previstas usava estimativa semanal, **não o calendário letivo real**
4. ❌ O cálculo de aulas dadas somava todos os presentes, **sem filtrar por disciplina**

---

## ✅ SOLUÇÃO IMPLEMENTADA

### 1. **Backend - `/api/teacher-frequency-report/deficit-surplus`**

**Arquivo:** `backend/src/routes/teacherFrequencyReport.routes.ts`

#### 🔹 Alteração Principal:

```typescript
// ANTES: Cálculo genérico por semana
const weeklyClasses = ts.weeklyHours || 2;
const totalWeeks = Math.max(1, Math.floor(schoolDays.length / 5));
const predicted = weeklyClasses * totalWeeks;

// AGORA: Cálculo preciso baseado no calendário letivo
for (const schoolDay of schoolDays) {
  // Determinar o dia da semana (ou dia que o sábado segue)
  let targetDay = ...;
  
  // Contar aulas do professor nesta disciplina/turma neste dia específico
  for (const timetable of timetables) {
    const classesInDay = timetable.slots.filter((slot: any) => 
      slot.day === targetDay &&
      slot.teacherId === teacher._id.toString() &&
      slot.subjectId === subject._id.toString() && // ✅ FILTRAR POR DISCIPLINA
      slot.classId === classObj._id.toString()     // ✅ FILTRAR POR TURMA
    ).length;
    
    predicted += classesInDay;
  }
}
```

#### 🔹 Contagem de Aulas Dadas por Disciplina:

```typescript
// ANTES: Somava TODAS as aulas presentes do professor
const given = attendanceRecords.reduce((sum, record) => {
  return sum + (record.totalPresentClasses || 0);
}, 0);

// AGORA: Filtra por disciplina e turma específicas
for (const record of attendanceRecords) {
  if (record.classes && Array.isArray(record.classes)) {
    const classesGiven = record.classes.filter((cls: any) => 
      cls.status === 'present' &&
      cls.subjectId === subject._id.toString() &&  // ✅ POR DISCIPLINA
      cls.classId === classObj._id.toString()      // ✅ POR TURMA
    ).length;
    
    given += classesGiven;
  }
}
```

---

### 2. **Backend - Novo Endpoint `/api/teacher-attendance/teacher-subject-report/:teacherId`**

**Arquivo:** `backend/src/routes/teacherAttendance.ts`

#### 🔹 Funcionalidade:

Retorna um relatório agregado **por disciplina/turma** de um professor específico:

```json
{
  "teacherId": "12345",
  "teacherName": "João Silva",
  "subjects": [
    {
      "subjectId": "mat123",
      "subjectName": "Matemática",
      "classId": "turma1a",
      "className": "1ª Série A",
      "grade": "1ª Série",
      "scheduledClasses": 28,
      "givenClasses": 27,
      "absentClasses": 1,
      "pendingClasses": 0,
      "deficit": 1,
      "dates": ["2026-02-15"]
    }
  ]
}
```

---

## 📊 LÓGICA CORRIGIDA

### **Fluxo Completo:**

1. **Registro Diário de Frequência:**
   - Usuário acessa [https://criador-horario-aula.surge.sh/#/teacher-attendance](https://criador-horario-aula.surge.sh/#/teacher-attendance)
   - Seleciona a **data letiva**
   - Sistema busca no **horário gerado** todas as aulas daquele dia
   - Para cada professor, exibe **todas as aulas** (com disciplina, turma, horário)
   - Usuário marca **presente/ausente** para cada aula individual

2. **Cálculo de Aulas Previstas:**
   - Para cada professor, busca suas **disciplinas/turmas** em `TeacherSubject`
   - Para cada **dia letivo** no calendário (`SchoolDay`):
     - Determina o dia da semana (considerando sábados de reposição)
     - Conta quantas aulas o professor tem **naquela disciplina/turma** no horário gerado
   - Soma = **Total de aulas previstas por disciplina/turma**

3. **Cálculo de Aulas Dadas:**
   - Busca os registros de frequência (`TeacherAttendance`)
   - Para cada registro, filtra as aulas com `status === 'present'`
   - Agrupa por `subjectId + classId`
   - Resultado = **Total de aulas dadas por disciplina/turma**

4. **Cálculo de Déficit/Saldo:**
   ```
   déficit = aulasPrevistas - aulasDadas (se positivo)
   saldo = aulasDadas - aulasPrevistas (se positivo)
   ```

---

## 🎯 BENEFÍCIOS

✅ **Precisão:** Cálculo baseado no calendário letivo real, não em estimativas  
✅ **Granularidade:** Déficit/saldo por disciplina e turma, não apenas por professor  
✅ **Rastreabilidade:** Sistema registra data de cada falta por disciplina  
✅ **Flexibilidade:** Professores podem ter múltiplas disciplinas e turmas  
✅ **Conformidade:** Atende requisitos de relatórios escolares oficiais  

---

## 📝 OBSERVAÇÕES IMPORTANTES

1. **Calendário Letivo é obrigatório:**
   - O sistema agora depende de dias letivos cadastrados em `SchoolDay`
   - Se não houver calendário, usa horário padrão com aviso

2. **Sábados de Reposição:**
   - Sistema detecta automaticamente e busca horário do dia correto
   - Exemplo: Sábado seguindo segunda = busca horário de segunda-feira

3. **Professor com múltiplas disciplinas:**
   - Cada disciplina/turma tem seu próprio contador
   - Relatório separa claramente cada combinação

---

## 🔄 PRÓXIMOS PASSOS

- [ ] Testar cálculos com dados reais de fevereiro/2026
- [ ] Validar sábados de reposição
- [ ] Exportar relatórios por disciplina em PDF/Excel
- [ ] Adicionar gráficos de déficit por disciplina

---

## 📞 CONTATO

**Wander Pires Silva Coelho**  
wanderpsc@gmail.com  
© 2025 - Todos os direitos reservados
