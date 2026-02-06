# Teste de Disponibilidade de Professores

## Como testar:

### 1. Abra o sistema no navegador
https://wanderpsc.github.io/criador-horario-backend

### 2. Abra o Console do Navegador (F12)

### 3. Faça login e vá para "Professores"

### 4. Configure a disponibilidade de um professor:
- Clique em "📅 Configurar Horários Disponíveis"
- Desmarque alguns horários (ficará vermelho)
- Clique em "Salvar Disponibilidade"

### 5. Verifique os logs no console:

**Ao salvar, você deve ver:**
```
💾 Salvando disponibilidade:
  teacherId: "xxx"
  teacherName: "Nome do Professor"
  availability: { segunda: { 1: true, 2: false, ... }, ... }

✅ Resposta do servidor: { ... }
```

**Se der erro:**
```
❌ Erro ao salvar: ...
```

### 6. Recarregue a página (F5)

### 7. Abra novamente o modal de disponibilidade do mesmo professor

**Você deve ver no console:**
```
🔍 Abrindo modal de disponibilidade:
  teacherName: "Nome do Professor"
  hasAvailability: true
  availability: { segunda: { 1: true, 2: false, ... }, ... }

✅ Carregando disponibilidade salva: { ... }
```

**Se aparecer:**
```
⚠️ Nenhuma disponibilidade salva, usando padrão (todos disponíveis)
```

Significa que o backend NÃO está retornando o campo `availability`.

---

## Se o problema persistir:

### Opção 1: Verificar se o backend está rodando
O backend precisa estar rodando em produção com o modelo atualizado.

### Opção 2: Verificar resposta do servidor
No console, copie a "Resposta do servidor" e me envie para análise.

### Opção 3: Limpar cache
- Ctrl + Shift + Delete
- Limpar cache e cookies
- Recarregar

