# Déficit por Disciplina - Atualização do Sistema

## Data: 09/02/2026

## ⚠️ Conceito Importante

**A frequência é registrada no nome do professor, mas o déficit/saldo é da disciplina específica que ele trabalha em cada turma.**

### Exemplo Prático

Se o professor João leciona:
- **Matemática** na Turma 1A (3 aulas semanais)
- **Física** na Turma 2B (2 aulas semanais)

E ele falta na segunda-feira (quando tinha 1 aula de Matemática na 1A e 1 aula de Física na 2B):

✅ **Frequência**: Registrada no nome do professor João (2 faltas no dia)

📊 **Déficit**:
- **Matemática - Turma 1A**: -1 aula (déficit de Matemática)
- **Física - Turma 2B**: -1 aula (déficit de Física)

> **Cada disciplina em cada turma tem seu próprio déficit independente.**

---

## 🔄 Mudanças Implementadas

### 1. Nova Interface: `SubjectDeficit`

```typescript
interface SubjectDeficit {
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  grade: string;
  teacherId: string;
  teacherName: string;
  scheduledClasses: number;  // Aulas previstas da disciplina na turma
  givenClasses: number;      // Aulas dadas da disciplina na turma
  deficit: number;           // scheduledClasses - givenClasses
  dates: string[];           // Datas das faltas
}
```

### 2. Nova Função: `generateSubjectDeficitReport()`

**Localização**: `frontend/src/pages/TeacherAttendance.tsx`

**Funcionalidade**:
- Agrupa aulas por `subjectId + classId` (disciplina em cada turma)
- Calcula déficit/saldo por disciplina específica
- Rastreia datas das faltas
- Ordena por maior déficit

### 3. Nova Seção no Relatório

**Título**: "📊 Déficit/Saldo por Disciplina e Turma"

**Colunas**:
- **Disciplina**: Nome da matéria
- **Turma**: Turma + Série
- **Professor**: Responsável pela disciplina naquela turma
- **Previstas**: Aulas agendadas
- **Dadas**: Aulas realizadas
- **Déficit**: Quantidade em falta (vermelho) ou saldo (verde)
- **Datas das Faltas**: Quando ocorreram

**Recursos**:
- ⚠️ Alerta crítico para disciplinas com déficit ≥ 2 aulas
- 🎨 Código de cores: Vermelho (déficit) / Verde (saldo)
- 📅 Tags com datas das faltas formatadas

### 4. Backend - Estatísticas por Disciplina

**Rota Atualizada**: `GET /api/teacher-attendance/statistics?bySubject=true`

**Funcionalidade**:
- Novo parâmetro `bySubject=true` para agrupar por disciplina
- Retorna estatísticas detalhadas por disciplina/turma
- Mantém compatibilidade com estatísticas por professor (padrão)

---

## 🎯 Casos de Uso

### Caso 1: Professor Polivalente

**Situação**: Professor João leciona múltiplas disciplinas

**Registro**:
```
João - Segunda-feira:
- 1ª aula: Matemática - Turma 1A ❌ Ausente
- 2ª aula: Matemática - Turma 1B ✅ Presente
- 3ª aula: Física - Turma 2A ❌ Ausente
```

**Déficit por Disciplina**:
```
Matemática - 1A: -1 aula (déficit)
Matemática - 1B:  0 (sem déficit)
Física - 2A:     -1 aula (déficit)
```

**Sábado de Reposição**: Precisa repor 2 aulas específicas:
- 1 aula de Matemática para a Turma 1A
- 1 aula de Física para a Turma 2A

### Caso 2: Mesmo Professor, Mesma Disciplina, Turmas Diferentes

**Situação**: Professora Maria leciona Português em várias turmas

**Registro**:
```
Maria - Português:
- 1A: 3 aulas previstas, 2 dadas = -1 déficit
- 1B: 3 aulas previstas, 3 dadas =  0 sem déficit
- 2A: 2 aulas previstas, 1 dada  = -1 déficit
```

**Déficit por Turma**:
```
Português - 1A: -1 aula (turma específica)
Português - 1B:  0 (sem débito)
Português - 2A: -1 aula (turma específica)
```

**Importante**: O déficit de Português na 1A é independente do déficit de Português na 2A.

---

## 📊 Visualização no Sistema

### Relatório de Professores (Seção 1)

Mostra visão geral por professor:
```
┌──────────────────────────────────────────────────┐
│ Professor João                                    │
│ Total: 10 aulas previstas                        │
│        8 aulas dadas                              │
│        2 faltas                                   │
│        80% presença                               │
└──────────────────────────────────────────────────┘
```

### Déficit por Disciplina (Seção 2) ⭐ NOVO

Mostra déficit específico por disciplina/turma:
```
┌────────────────────────────────────────────────────────────┐
│ Matemática │ 1A - Fundamental │ João │ -1 aula (05/02)    │
│ Física     │ 2A - Médio       │ João │ -1 aula (05/02)    │
│ Português  │ 1A - Fundamental │ Maria│ -1 aula (06/02)    │
└────────────────────────────────────────────────────────────┘
```

---

## 🔔 Alertas Inteligentes

O sistema identifica automaticamente disciplinas com déficit crítico:

```
⚠️ Atenção: 3 disciplina(s) com déficit crítico (≥2 aulas)

• Matemática na turma 1A: 3 aulas em falta
• Física na turma 2B: 2 aulas em falta
• Português na turma 3A: 2 aulas em falta
```

---

## 🔄 Integração com Horário de Reposição

O horário de sábado agora considera:

1. **Disciplina específica** com déficit
2. **Turma específica** onde há déficit
3. **Quantidade exata** de aulas a repor por disciplina/turma
4. **Professor responsável** por aquela disciplina naquela turma

### Exemplo de Sábado Gerado:

```
08:00 - 09:00 | Matemática - 1A (Prof. João) - Repor falta de 05/02
09:00 - 10:00 | Física - 2A (Prof. João) - Repor falta de 05/02
10:00 - 11:00 | Português - 1A (Prof. Maria) - Repor falta de 06/02
```

---

## ✅ Benefícios

1. **Precisão Absoluta**: Déficit rastreado por disciplina/turma, não apenas por professor
2. **Transparência**: Gestores veem exatamente qual disciplina está atrasada em qual turma
3. **Reposição Dirigida**: Sábado planejado com foco nas disciplinas/turmas com déficit
4. **Rastreabilidade**: Datas das faltas associadas a cada déficit
5. **Alertas Proativos**: Sistema identifica áreas críticas automaticamente
6. **Equidade**: Cada turma tem seu próprio controle de déficit

---

## 📝 Observações Importantes

- ✅ Frequência: Sempre no nome do professor
- ✅ Déficit: Sempre por disciplina + turma específica
- ✅ Relatórios: Duas visões complementares (professor e disciplina)
- ✅ Reposição: Baseada nos déficits específicos de cada disciplina/turma
- ✅ Compatibilidade: Sistema mantém funcionalidade anterior intacta

---

**Status**: ✅ IMPLEMENTADO E FUNCIONAL  
**Versão**: 2.0 - Déficit por Disciplina  
**Data**: 09/02/2026
