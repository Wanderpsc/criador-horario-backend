# Guia de Testes - Sistema de Impressão Profissional

## 🎯 Objetivo
Validar o sistema de impressão profissional com seleção de relatórios e cabeçalho da escola.

## 📋 Pré-requisitos

1. ✅ Estar logado no sistema
2. ✅ Ter uma escola cadastrada com logo
3. ✅ Ter professores cadastrados
4. ✅ Ter frequências marcadas
5. ✅ Ter horários criados

## 🧪 Roteiro de Testes

### Teste 1: Acessar Página de Frequência

**Passos**:
1. Acesse: https://criador-horario-aula.surge.sh
2. Faça login com suas credenciais
3. Navegue para "Frequência de Professores" no menu
4. Ou acesse direto: https://criador-horario-aula.surge.sh/#/teacher-attendance

**Resultado Esperado**:
- ✅ Página carrega sem erros
- ✅ Lista de professores aparece
- ✅ Botão "Imprimir Relatórios" visível no canto superior direito

---

### Teste 2: Marcar Frequência de Professor

**Objetivo**: Verificar se os bugs 404 e 500 foram resolvidos

**Passos**:
1. Selecione um professor da lista
2. Escolha um dia da semana (ex: Segunda-feira)
3. Selecione um horário/período
4. Clique em "Presente", "Faltou" ou "Licença Médica"

**Resultado Esperado**:
- ✅ A marcação é salva sem erros
- ✅ NÃO aparece erro "Professor não tem aulas agendadas para [dia] no horário selecionado"
- ✅ NÃO aparece erro "classes.0.startTime: Path startTime is required"
- ✅ Contador de faltas/presenças atualiza

---

### Teste 3: Abrir Modal de Impressão

**Passos**:
1. Na página de Frequência de Professores
2. Clique no botão "Imprimir Relatórios" (🖨️ ícone de impressora)

**Resultado Esperado**:
- ✅ Modal abre com fundo escurecido
- ✅ Título "Selecione os relatórios para impressão"
- ✅ Três checkboxes visíveis:
  - [ ] Relatório Geral de Frequência
  - [ ] Relatório por Disciplina (Déficit/Saldo)
  - [ ] Cartões de Professor
- ✅ Botões "Cancelar" e "Imprimir" visíveis

---

### Teste 4: Selecionar Relatórios

**Passos**:
1. Com o modal aberto
2. Marque apenas "Relatório Geral de Frequência"
3. Desmarque os outros
4. Clique em "Imprimir"

**Resultado Esperado**:
- ✅ Abre janela de impressão do navegador
- ✅ Na pré-visualização, aparece SOMENTE:
  - Cabeçalho com logo e nome da escola
  - Relatório Geral de Frequência
- ✅ NÃO aparece:
  - Menu de navegação
  - Botões da interface
  - Relatório por Disciplina
  - Cartões de Professor

---

### Teste 5: Impressão do Relatório por Disciplina

**Passos**:
1. Abra o modal novamente
2. Marque apenas "Relatório por Disciplina (Déficit/Saldo)"
3. Clique em "Imprimir"

**Resultado Esperado**:
- ✅ Na pré-visualização aparece:
  - Cabeçalho da escola
  - Tabela com colunas:
    - Disciplina
    - Turma
    - Aulas Previstas
    - Aulas Dadas
    - Déficit/Saldo
- ✅ VALIDAR: Déficit negativo em vermelho, Saldo positivo em verde
- ✅ VALIDAR: Cálculo correto por disciplina/turma (não geral)

---

### Teste 6: Impressão de Cartões de Professor

**Passos**:
1. Abra o modal
2. Marque apenas "Cartões de Professor"
3. Clique em "Imprimir"

**Resultado Esperado**:
- ✅ Grid de cartões 3 colunas
- ✅ Cada cartão mostra:
  - Foto do professor
  - Nome
  - E-mail
  - Telefone
  - Total de faltas
- ✅ Layout compacto e profissional

---

### Teste 7: Impressão de Múltiplos Relatórios

**Passos**:
1. Abra o modal
2. Marque TODOS os checkboxes
3. Clique em "Imprimir"

**Resultado Esperado**:
- ✅ Na pré-visualização aparecem TODOS os relatórios
- ✅ Ordem correta:
  1. Relatório Geral
  2. Relatório por Disciplina
  3. Cartões de Professor
- ✅ Quebras de página automáticas entre seções grandes

---

### Teste 8: Cancelar Impressão

**Passos**:
1. Abra o modal
2. Marque alguns checkboxes
3. Clique em "Cancelar"

**Resultado Esperado**:
- ✅ Modal fecha
- ✅ Volta para a página normal
- ✅ Nada é impresso

---

### Teste 9: Validar Cabeçalho da Escola

**Passos**:
1. Acesse "Cadastros" > "Escola"
2. Verifique se tem logo e nome cadastrados
3. Volte para Frequência de Professores
4. Abra modal e imprima qualquer relatório

**Resultado Esperado**:
- ✅ Logo da escola aparece no cabeçalho (canto esquerdo)
- ✅ Nome da escola aparece (centralizado ou ao lado do logo)
- ✅ Layout profissional e alinhado

---

### Teste 10: Validar Cálculo de Déficit

**Cenário de Teste**:
- Professor: João
- Disciplina: Matemática, Turma: 1º A
- Aulas previstas (pelo calendário): 40 aulas
- Aulas dadas: 35 aulas
- Déficit esperado: -5 aulas

**Passos**:
1. Verifique no Relatório por Disciplina
2. Localize linha de "Matemática - 1º A"

**Resultado Esperado**:
- ✅ Aulas Previstas: 40
- ✅ Aulas Dadas: 35
- ✅ Déficit: -5 (em vermelho)
- ✅ Cálculo separado por disciplina (não soma com outras disciplinas)

---

## 🐛 Checklist de Bugs Resolvidos

Verifique se estes problemas NÃO ocorrem mais:

- [x] ✅ Erro 404: "Professor não tem aulas agendadas para [dia]"
- [x] ✅ Erro 500: "classes.0.startTime: Path startTime is required"
- [x] ✅ Déficit calculado corretamente por disciplina (não geral)
- [x] ✅ Sistema encontra aulas do professor em qualquer horário da escola

---

## 📊 Validação de Dados

### Aulas Previstas
Devem ser calculadas baseadas em:
1. Calendário escolar (SchoolDay)
2. Dias letivos reais (excluindo feriados, recessos)
3. Quantidade de aulas do professor por dia naquela disciplina/turma

### Aulas Dadas
Contagem de registros em TeacherAttendance com:
- `status: "present"`
- Filtrado por `subjectId` e `classId`

---

## 🖨️ Testes em Diferentes Navegadores

Recomenda-se testar em:
- [ ] Google Chrome (preferencial)
- [ ] Mozilla Firefox
- [ ] Microsoft Edge
- [ ] Safari (se disponível)

### Validar em cada navegador:
- ✅ Modal funciona
- ✅ Pré-visualização de impressão correta
- ✅ Fontes e espaçamentos adequados
- ✅ Logo não está distorcido

---

## 📞 Reportar Problemas

Se encontrar algum erro durante os testes:

1. **Anote**:
   - Qual teste estava fazendo
   - Mensagem de erro (se houver)
   - Screenshot da tela
   - Navegador e versão

2. **Verifique no console do navegador** (F12):
   - Erros em vermelho
   - Requests que falharam (aba Network)

3. **Informe**:
   - E-mail: wanderpsc@gmail.com
   - Ou abra issue no repositório

---

## ✅ Resultado Final Esperado

Após completar todos os testes:
- ✅ Sistema de impressão 100% funcional
- ✅ Sem erros 404 ou 500 ao marcar frequência
- ✅ Cálculos de déficit corretos por disciplina
- ✅ Layout profissional e organizado
- ✅ Sistema pronto para uso em produção

---

**Documento criado em**: 10/02/2026
**Responsável**: Wander Pires Silva Coelho
