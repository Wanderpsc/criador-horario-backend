# 📝 Exemplos de Observações para Professores

**Sistema:** Criador de Horário de Aula Escolar  
**Objetivo:** Guiar usuários na escrita de observações eficazes

---

## ✅ Observações que o Sistema RECONHECE

### 1️⃣ **Restrições por Dia da Semana**

#### ✅ **Exemplos Corretos:**

```
"Não pode dar aula às segundas-feiras"
"Não pode dar aula às terças-feiras"
"Não pode dar aula às quartas-feiras"
"Não pode dar aula às quintas-feiras"
"Não pode dar aula às sextas-feiras"
```

**Variações aceitas:**
```
"Indisponível às segundas"
"Não trabalha às quartas"
"Ausente às sextas"
```

---

### 2️⃣ **Restrições por Período**

#### ✅ **Primeiro Período:**

```
"Não pode dar aula no primeiro horário"
"Evitar primeiro horário"
"Indisponível no 1º período"
"Não pode na primeira aula"
```

#### ✅ **Último Período:**

```
"Não pode dar aula no último horário"
"Evitar último horário"
"Indisponível no último período"
"Não pode na última aula"
```

---

### 3️⃣ **Múltiplas Restrições**

#### ✅ **Combinações:**

```
"Não pode às segundas-feiras. Evitar primeiro horário."
```

```
"Indisponível às quartas. Não pode no último período."
```

```
"Não trabalha às sextas. Evitar primeira aula."
```

---

## 🎯 Casos Práticos

### **Caso 1: Professor com Outro Emprego**

**Situação:**
Professor trabalha em outra escola às segundas e quartas.

**Observação:**
```
"Não pode dar aula às segundas-feiras e quartas-feiras"
```

**Resultado:**
- ✅ Será alocado às terças, quintas e sextas
- ❌ Nunca às segundas ou quartas

---

### **Caso 2: Professor com Restrição de Transporte**

**Situação:**
Professor depende de transporte escolar que só chega após o 1º horário.

**Observação:**
```
"Não pode dar aula no primeiro horário"
```

**Resultado:**
- ✅ Será alocado do 2º período em diante
- ❌ Nunca no 1º período

---

### **Caso 3: Professor com Compromisso Fixo**

**Situação:**
Professor tem compromisso fixo no último horário das sextas.

**Observação:**
```
"Não pode dar aula no último horário às sextas-feiras"
```

**Resultado:**
- ✅ Pode dar aula em todos os horários de segunda a quinta
- ✅ Pode dar aula do 1º ao penúltimo horário às sextas
- ❌ Nunca no último horário de sexta

---

### **Caso 4: Professor de Educação Física**

**Situação:**
Quadra é reformada às terças. Professor também evita dar aula no último período por questões de higiene.

**Observação:**
```
"Não pode às terças-feiras. Evitar último horário."
```

**Resultado:**
- ✅ Pode dar aula segunda, quarta, quinta, sexta
- ✅ Preferencialmente do 1º ao penúltimo período
- ❌ Nunca às terças

---

### **Caso 5: Professora Gestante**

**Situação:**
Professora tem consulta pré-natal toda quarta de manhã.

**Observação:**
```
"Não pode dar aula às quartas-feiras"
```

**Resultado:**
- ✅ Será alocada em todos os outros dias
- ❌ Nunca às quartas

---

## ❌ Observações que o Sistema NÃO Reconhece (ainda)

### **Restrições de Horário Específico:**
```
❌ "Não pode dar aula antes das 10h"
❌ "Só pode das 13h às 17h"
❌ "Não pode entre 2º e 4º período"
```

**Por quê?** Sistema ainda não tem análise de horários específicos.

**Solução temporária:** Use restrições por período:
```
✅ "Não pode no primeiro horário" (se 1º horário é antes das 10h)
```

---

### **Preferências Subjetivas:**
```
❌ "Prefere não dar aula às segundas"
❌ "Se possível evitar sextas"
```

**Por quê?** Sistema só entende restrições absolutas, não preferências.

**Solução:** Use linguagem direta:
```
✅ "Não pode dar aula às segundas" (se for restrição real)
```

---

## 📋 Template de Observação

Use este template para escrever observações claras:

```
[DIA DA SEMANA ou PERÍODO]
"Não pode dar aula [às + dia] / [no + período]"

EXEMPLOS:
"Não pode dar aula às segundas-feiras"
"Não pode dar aula no último horário"
"Não pode dar aula às quartas-feiras. Evitar primeiro horário."
```

---

## 🎨 Boas Práticas

### ✅ **FAÇA:**
- ✅ Use linguagem clara e direta
- ✅ Seja específico sobre dias e períodos
- ✅ Use pontuação para separar múltiplas restrições
- ✅ Escreva em português correto

### ❌ **NÃO FAÇA:**
- ❌ Use abreviações difíceis de entender
- ❌ Misture vários assuntos no mesmo campo
- ❌ Use gírias ou expressões regionais
- ❌ Escreva em CAPS LOCK

---

## 🔍 Como Verificar se Funcionou

1. **Cadastre a observação** no professor
2. **Gere um horário** incluindo esse professor
3. **Verifique visualmente** se o professor foi alocado corretamente
4. **Confira os alertas** - sistema avisa se não conseguiu alocar

---

## 💡 Dicas Importantes

### **Dica 1: Seja Realista**
Quanto mais restrições, mais difícil será alocar o professor.

**Exemplo:**
```
❌ Muito restritivo:
"Não pode às segundas, terças, quartas. Não pode no primeiro e último horário."

✅ Mais flexível:
"Não pode dar aula às quartas-feiras"
```

### **Dica 2: Revise Regularmente**
Restrições podem mudar ao longo do ano letivo.

**Ação:** Atualize observações quando situações mudarem.

### **Dica 3: Comunique-se**
Observações técnicas não substituem diálogo.

**Ação:** Converse com professores sobre suas necessidades reais.

---

## 📊 Resumo Rápido

| Tipo de Restrição | Exemplo | Funciona? |
|-------------------|---------|-----------|
| Dia específico | "Não pode às quartas" | ✅ Sim |
| Primeiro horário | "Evitar primeiro horário" | ✅ Sim |
| Último horário | "Não pode no último período" | ✅ Sim |
| Múltiplas restrições | "Não pode às segundas. Evitar último horário." | ✅ Sim |
| Horário específico | "Não pode antes das 10h" | ❌ Não |
| Preferências | "Prefere evitar sextas" | ❌ Não |

---

## 📞 Suporte

**Dúvidas sobre como escrever observações?**
- E-mail: wanderpsc@gmail.com

---

**© 2025 Wander Pires Silva Coelho**  
**Sistema Criador de Horário de Aula Escolar**
