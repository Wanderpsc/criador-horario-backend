# Diagnóstico Rápido - Aulas Previstas Baixas

**Problema:** Aulas Previstas mostrando apenas 20 total (0, 2, 10, 8, 0...)

## 🔍 Verificações Prioritárias

### 1. Verificar Logs do Render (IMPORTANTE!)

1. Acesse: https://dashboard.render.com
2. Selecione: `criador-horario-backend`
3. Clique em **"Logs"** no menu lateral
4. Procure por estas mensagens:

#### Logs Essenciais:

```
📖 [CARGA ANUAL] Disciplina "Nome da Disciplina"
```
**O que verificar:**
- `workload: 0` → ❌ Disciplina SEM carga anual
- `weeklyHours: 0` ou `null` → ❌ Disciplina SEM aulas semanais
- `weeklyHours: 4` → ✅ Tem 4 aulas/semana

```
📅 [CARGA ANUAL] Dias letivos no ano 2026: [NÚMERO]
```
**O que verificar:**
- `0` → ❌ Calendário de 2026 NÃO cadastrado
- `200` → ✅ OK ou usando padrão
- `> 100` → ✅ Calendário cadastrado

```
⚠️ [CARGA ANUAL] Nenhum dia letivo cadastrado!
```
**Se aparecer:** Calendário de 2026 está vazio

```
📊 [statistics] Encontrados X professores ativos
📚 [statistics] Encontrados X horários gerados
```
**O que verificar:**
- Tem professores ativos?
- Tem horários gerados?

```
👨‍🏫 [statistics] Professor Nome: X disciplinas
  📖 [statistics] Disciplina ID: Y aulas previstas
```
**O que verificar:**
- Quantas disciplinas cada professor tem?
- Quantas aulas previstas por disciplina?

### 2. Hipóteses para Valores Baixos

#### Hipótese A: Disciplinas SEM carga horária
**Sintoma:** Aulas previstas = 0 para maioria dos professores

**Verificar no MongoDB:**
```javascript
// Contar disciplinas SEM carga
db.subjects.count({
  workload: { $in: [null, 0] },
  weeklyHours: { $in: [null, 0] }
})

// Se retornar > 0, há disciplinas sem carga!
```

**Solução:**
```javascript
// Exemplo: Atualizar Matemática com 4 aulas/semana
db.subjects.updateOne(
  { name: "Matemática" },
  { $set: { weeklyHours: 4 } }
)
```

#### Hipótese B: Calendário de 2026 vazio
**Sintoma:** Logs mostram "0 dias letivos no ano 2026"

**Verificar no MongoDB:**
```javascript
db.schooldays.count({
  date: { 
    $gte: ISODate("2026-01-01"), 
    $lte: ISODate("2026-12-31") 
  },
  isSchoolDay: true
})

// Se retornar 0, não há calendário!
```

**Solução:** Cadastrar calendário 2026 via frontend (Calendário Letivo)

#### Hipótese C: Período errado no relatório
**Sintoma:** Valores baixos mas não zerados (10, 8, 2...)

**Verificar:**
- Data Inicial: Deve ser `01/01/2026`
- Data Final: Deve ser `31/12/2026`
- Se for período curto (ex: 1 mês), valores serão proporcionalmente baixos

**Exemplo:**
- Disciplina: 160 aulas/ano
- Período: Apenas FEVEREIRO (20 dias)
- Cálculo: (160 ÷ 200) × 20 = **16 aulas** ✅

#### Hipótese D: Poucos dias letivos no período
**Sintoma:** Total = 20, mas período é curto

**Verificar logs:**
```
📅 [CARGA ANUAL] Dias letivos no período (2026-01-01 a 2026-12-31): [NÚMERO]
```

Se mostrar um número baixo (ex: 25 dias), é por isso!

### 3. Script de Diagnóstico via API

**Execute no Postman/Insomnia:**

```bash
# Substituir com seus dados
TOKEN="seu_token_jwt"
API="https://criador-horario-backend.onrender.com/api"

# 1. Verificar estatísticas
curl -X GET "$API/teacher-attendance/statistics?startDate=2026-01-01&endDate=2026-12-31" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Analisar resposta:**
- `totalScheduledClasses: 0` → Problema!
- `totalScheduledClasses: 200+` → OK!

### 4. Verificação Manual no Frontend

1. **Ir em Disciplinas:**
   - Menu → Disciplinas
   - Verificar se cada disciplina tem:
     - "Carga Horária Anual" preenchida, OU
     - "Aulas Semanais" preenchida

2. **Ir em Calendário Letivo:**
   - Menu → Calendário Letivo
   - Verificar se há dias cadastrados em 2026
   - Deve ter pelo menos 100 dias com tipo "Dia Letivo"

3. **Ir em Horários:**
   - Menu → Gerar Horários
   - Verificar se há horários gerados
   - Devem ter aulas distribuídas

### 5. Cenário Mais Provável

**Se aparecer:**
- Alguns professores com 0
- Alguns com valores baixos (2, 8, 10)
- Total = 20

**Causa provável:** 
- ✅ Sistema está funcionando
- ❌ **Faltam dados:** disciplinas sem carga horária OU calendário incompleto

**Ação:** Veja os logs do Render para confirmar qual dado está faltando

### 6. Valores Esperados (Exemplo Real)

**Para um professor que leciona:**
- Matemática: 4 aulas/semana = 160 aulas/ano
- Física: 2 aulas/semana = 80 aulas/ano
- **Total previsto:** 240 aulas/ano

**Se aparecer apenas 20:**
- Algo está MUITO errado
- Provavelmente: calendário com pouquíssimos dias cadastrados

### 7. Checklist Rápido

Execute na ordem:

- [ ] 1. Ver logs do Render (5 min)
- [ ] 2. Procurar por "⚠️" nos logs (alertas)
- [ ] 3. Verificar quantos dias letivos em 2026 (logs ou MongoDB)
- [ ] 4. Verificar 3-5 disciplinas no frontend (tem carga horária?)
- [ ] 5. Copiar e colar logs relevantes aqui para análise

### 8. Template de Resposta

**Por favor, envie:**

1. **Logs do Render** (últimas 50-100 linhas que contenham "CARGA ANUAL" ou "statistics")

2. **Exemplo de uma disciplina:**
   - Nome: ___
   - Carga Horária Anual: ___
   - Aulas Semanais: ___

3. **Calendário 2026:**
   - Tem dias cadastrados? Sim/Não
   - Quantos dias aproximadamente? ___

4. **Período do relatório:**
   - Data Inicial: ___
   - Data Final: ___

Com essas informações, posso identificar exatamente o problema! 🎯
