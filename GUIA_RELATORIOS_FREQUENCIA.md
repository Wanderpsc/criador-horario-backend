# 📊 Guia de Relatórios de Frequência

## Sumário
- [Visão Geral](#visão-geral)
- [Acesso ao Sistema](#acesso-ao-sistema)
- [Funcionalidades](#funcionalidades)
- [Como Usar](#como-usar)
- [Impressão de Relatórios](#impressão-de-relatórios)
- [Interpretação dos Dados](#interpretação-dos-dados)

---

## Visão Geral

O **Sistema de Relatórios de Frequência** foi desenvolvido para fornecer uma visão completa sobre os déficits e saldos de aulas dos professores, permitindo:

✅ Visualização detalhada por professor, disciplina ou turma  
✅ Cálculo automático de aulas previstas baseado no calendário letivo  
✅ Comparação entre aulas previstas x aulas dadas  
✅ Identificação de déficits (aulas não dadas)  
✅ Identificação de saldos (aulas extras)  
✅ Filtros avançados para análise personalizada  
✅ Impressão profissional de relatórios

---

## Acesso ao Sistema

### Navegação no Menu
1. Acesse o sistema com suas credenciais
2. No menu lateral, localize: **"Relatórios de Frequência"**
3. Você verá o ícone 📊 e o badge **NOVO**
4. Clique para acessar o painel completo

### URL Direta
```
https://wanderpsc.github.io/criador-horario-backend/teacher-frequency-report
```

---

## Funcionalidades

### 1. Cards Estatísticos
Na parte superior da página, você encontra 4 cards com resumos:

| Card | Descrição |
|------|-----------|
| 📅 **Aulas Previstas** | Total de aulas que deveriam ser ministradas no período |
| ✅ **Aulas Dadas** | Total de aulas efetivamente ministradas |
| ❌ **Déficit Total** | Soma de todas as aulas não dadas (déficit) |
| 💰 **Saldo Total** | Soma de todas as aulas extras ministradas |

### 2. Filtros Avançados

#### Filtro por Período
- **Mês**: Selecione o mês desejado (Janeiro a Dezembro)
- **Ano**: Escolha o ano (2024, 2025, 2026, 2027)

#### Filtro por Dados
- **Professor**: Digite o nome ou parte do nome para buscar
- **Disciplina**: Busque por disciplina específica
- **Turma**: Filtre por turma (ex: 1º ANO A, 2º ANO B)

### 3. Modos de Visualização

#### 👨‍🏫 Por Professor
Exibe cards detalhados para cada professor contendo:
- Nome completo do professor
- Carga horária semanal total
- Resumo de aulas (Previsto, Dado, Déficit, Saldo)
- Tabela detalhada por disciplina e turma
- Status visual colorido:
  - 🔴 **Vermelho**: Déficit (aulas não dadas)
  - 🟣 **Roxo**: Saldo (aulas extras)
  - 🟢 **Verde**: Em dia

**Exemplo de Visualização:**
```
┌─────────────────────────────────────────────┐
│ João Silva - Carga Horária: 40h             │
│ Previsto: 80 | Dado: 75 | Déficit: -5       │
├─────────────────────────────────────────────┤
│ Disciplina  │ Turma    │ Prev │ Dado │ Sit  │
├─────────────┼──────────┼──────┼──────┼──────┤
│ Matemática  │ 1º ANO A │  20  │  20  │  ✓   │
│ Matemática  │ 2º ANO B │  20  │  15  │  -5  │
│ Física      │ 3º ANO A │  40  │  40  │  ✓   │
└─────────────────────────────────────────────┘
```

#### 📚 Por Disciplina
Agrupa os dados por disciplina mostrando:
- Nome da disciplina
- Quantidade de professores que lecionam
- Total previsto/dado/déficit/saldo
- Visão consolidada para análise por área

**Quando Usar:**
- Para identificar disciplinas com maior déficit geral
- Planejar reposições por área de conhecimento
- Análise de consistência entre professores da mesma disciplina

#### 🎓 Por Turma
Agrupa os dados por turma mostrando:
- Nome da turma
- Quantidade de disciplinas
- Total previsto/dado/déficit/saldo
- Visão do impacto em cada classe

**Quando Usar:**
- Para identificar turmas mais afetadas por déficits
- Priorizar reposições de aulas
- Análise de equidade entre turmas

---

## Como Usar

### Passo 1: Selecionar Período
```
1. Selecione o mês desejado (ex: Janeiro)
2. Selecione o ano (ex: 2026)
3. O sistema carrega automaticamente os dados
```

### Passo 2: Aplicar Filtros (Opcional)
```
1. Digite o nome do professor (ex: "João")
2. Digite a disciplina (ex: "Matemática")
3. Digite a turma (ex: "1º ANO")
4. Os resultados são filtrados em tempo real
```

### Passo 3: Escolher Modo de Visualização
```
Clique em um dos botões:
- [👨‍🏫 Por Professor] - Visão detalhada individual
- [📚 Por Disciplina]  - Visão agrupada por matéria
- [🎓 Por Turma]       - Visão agrupada por classe
```

### Passo 4: Analisar os Dados
```
- Verifique os cards de estatísticas gerais
- Analise os detalhes nas tabelas
- Identifique déficits críticos (em vermelho)
- Identifique saldos (em roxo)
```

---

## Impressão de Relatórios

### Como Imprimir

#### Método 1: Botão de Impressão
```
1. Configure os filtros desejados
2. Escolha o modo de visualização
3. Clique no botão "🖨️ Imprimir Relatório"
4. A janela de impressão será aberta automaticamente
```

#### Método 2: Atalho de Teclado
```
Pressione: Ctrl + P (Windows) ou Cmd + P (Mac)
```

### Configurações de Impressão Recomendadas

| Configuração | Valor Recomendado |
|--------------|-------------------|
| **Orientação** | Retrato (Portrait) |
| **Tamanho** | A4 |
| **Margens** | Padrão (15mm) |
| **Cores** | Colorido (para melhor visualização) |
| **Escala** | 100% ou Ajustar à página |

### Recursos da Impressão

✅ **Estilo Otimizado**: Layout profissional para papel  
✅ **Cores Preservadas**: Marcações coloridas mantidas (déficit em vermelho, saldo em roxo)  
✅ **Quebra de Página Inteligente**: Evita cortar tabelas no meio  
✅ **Bordas Definidas**: Tabelas com bordas para facilitar leitura  
✅ **Sem Elementos de Navegação**: Botões e filtros são ocultados na impressão  
✅ **Cabeçalho Informativo**: Título e descrição do relatório  
✅ **Data Automática**: O período selecionado aparece no documento

### Salvar como PDF
```
1. Clique em "Imprimir Relatório"
2. Na janela de impressão, selecione:
   - Destino: "Salvar como PDF" ou "Microsoft Print to PDF"
3. Escolha o local e nome do arquivo
4. Clique em "Salvar"
```

---

## Interpretação dos Dados

### Entendendo os Cálculos

#### 1. Aulas Previstas
```
Fórmula: (Aulas por Semana) × (Dias Letivos ÷ 5)

Exemplo:
- Professor tem 4 aulas/semana de Matemática no 1º ANO A
- Mês de Janeiro tem 20 dias letivos
- Semanas = 20 ÷ 5 = 4 semanas
- Previsto = 4 × 4 = 16 aulas
```

#### 2. Déficit
```
Déficit = Previsto - Dado

Exemplo:
- Previsto: 16 aulas
- Dado: 12 aulas
- Déficit: 16 - 12 = 4 aulas não dadas ❌
```

#### 3. Saldo
```
Saldo = Dado - Previsto (quando dado > previsto)

Exemplo:
- Previsto: 16 aulas
- Dado: 20 aulas
- Saldo: 20 - 16 = 4 aulas extras ✅
```

### Códigos de Cores

| Cor | Significado | Ação Recomendada |
|-----|-------------|------------------|
| 🔴 **Vermelho** | Déficit (aulas faltantes) | Agendar reposições urgentes |
| 🟣 **Roxo** | Saldo (aulas extras) | Reconhecer dedicação extra |
| 🟢 **Verde** | Em dia (cumprido) | Nenhuma ação necessária |

### Situações Críticas

#### ⚠️ Déficit Acima de 10%
```
Se o déficit for maior que 10% das aulas previstas:
- Prioridade ALTA para reposição
- Comunicar coordenação pedagógica
- Planejar horários de recuperação
```

#### ⚠️ Déficit Recorrente
```
Se o mesmo professor/disciplina apresenta déficit por 2+ meses:
- Investigar causas (faltas, licenças, problemas estruturais)
- Replanejar distribuição de carga horária
- Considerar professor substituto
```

#### ✅ Saldo Consistente
```
Se há saldo frequente:
- Reconhecer o comprometimento
- Avaliar se a carga prevista está subavaliada
- Considerar ajuste de horários
```

---

## Casos de Uso Práticos

### Caso 1: Reunião de Coordenação Pedagógica
```
Objetivo: Apresentar situação geral da escola

1. Selecione o mês atual
2. Use visualização "Por Professor"
3. Imprima o relatório completo
4. Apresente os cards de estatísticas gerais
5. Destaque professores com déficit crítico
6. Proponha plano de reposição
```

### Caso 2: Planejar Sábados de Reposição
```
Objetivo: Identificar turmas/disciplinas prioritárias

1. Filtre pelo mês desejado
2. Use visualização "Por Turma"
3. Identifique turmas com maior déficit
4. Alterne para "Por Disciplina"
5. Veja quais matérias precisam de reposição
6. Cruze com disponibilidade dos professores
7. Monte grade do sábado letivo
```

### Caso 3: Avaliação Individual de Professor
```
Objetivo: Conversa particular sobre desempenho

1. Digite o nome do professor no filtro
2. Use visualização "Por Professor"
3. Analise cada disciplina/turma
4. Identifique padrões (déficit em turma específica?)
5. Imprima para documentação
6. Conduza reunião com dados concretos
```

### Caso 4: Relatório Mensal para Direção
```
Objetivo: Prestação de contas mensal

1. Selecione cada mês (Janeiro, Fevereiro, Março...)
2. Para cada mês, imprima:
   - Visão "Por Professor"
   - Visão "Por Disciplina"
   - Visão "Por Turma"
3. Salve como PDFs com nomes organizados
4. Compile em apresentação para reunião
```

---

## Integração com Outros Módulos

### Calendário Letivo 📅
- Os dias letivos cadastrados alimentam o cálculo de aulas previstas
- Sábados letivos são contabilizados automaticamente
- Feriados e recessos são excluídos dos cálculos

### Controle de Frequência ✅
- As aulas "dadas" vêm do módulo de Controle de Frequência
- Marcação de presença atualiza os dados em tempo real
- Integração automática sem necessidade de input manual

### Horário Emergencial 🚨
- Aulas ministradas em horário emergencial são contabilizadas
- Reposições aparecem nos saldos
- Trocas de professor são rastreadas

---

## Dicas e Melhores Práticas

### ✅ Faça
- Revise os relatórios semanalmente
- Imprima e arquive relatórios mensais
- Comunique déficits aos professores rapidamente
- Use os dados para planejamento de longo prazo
- Compare tendências entre meses

### ❌ Evite
- Ignorar déficits pequenos que podem acumular
- Culpar professores sem investigar causas
- Basear decisões em dados incompletos
- Esquecer de considerar licenças médicas
- Deixar reposições para o final do ano

### 💡 Dica Profissional
```
Configure uma rotina semanal:
- Segunda-feira: Verificar relatório da semana anterior
- Quarta-feira: Enviar alertas de déficits críticos
- Sexta-feira: Planejar reposições para semana seguinte
```

---

## Solução de Problemas

### Problema: "Nenhum registro encontrado"
**Soluções:**
1. Verifique se há dias letivos cadastrados no período
2. Confirme que professores têm carga horária associada
3. Verifique se o ano/mês selecionados estão corretos
4. Limpe os filtros de busca

### Problema: Aulas previstas zeradas
**Soluções:**
1. Acesse "Associação Professor-Disciplina"
2. Verifique se as cargas horárias semanais estão definidas
3. Cadastre as relações professor-disciplina-turma
4. Atualize a página de relatórios

### Problema: Cores não aparecem na impressão
**Soluções:**
1. Configure impressora para: "Imprimir cores de fundo"
2. Em Chrome: More settings > Options > Background graphics ✅
3. Salve como PDF e imprima o PDF
4. Use navegador atualizado (Chrome, Edge, Firefox)

---

## Perguntas Frequentes (FAQ)

### 1. Os relatórios são atualizados em tempo real?
Sim! Sempre que você marca frequência no módulo de controle, os dados são atualizados automaticamente.

### 2. Posso exportar para Excel?
Atualmente a exportação é via impressão/PDF. Funcionalidade de Excel está planejada para próxima versão.

### 3. Como são contados os sábados letivos?
Sábados letivos cadastrados no calendário são contabilizados normalmente nos dias letivos, ajustando o cálculo de semanas.

### 4. E se o professor esteve de licença?
Os déficits aparecem normalmente. Cabe à coordenação analisar o contexto (licenças, afastamentos) e decidir sobre necessidade de reposição.

### 5. Posso ver relatórios de anos anteriores?
Sim! Basta selecionar o ano desejado no filtro. Os dados históricos são preservados.

---

## Suporte e Contato

### 📧 Desenvolvedor
**Wander Pires Silva Coelho**  
Email: wanderpsc@gmail.com

### 🐛 Reportar Bugs
Se encontrar algum problema:
1. Anote o erro exato que apareceu
2. Informe os passos para reproduzir
3. Envie print da tela (se possível)
4. Entre em contato por email

### 💡 Sugerir Melhorias
Sua opinião é importante! Envie sugestões por email.

---

## Changelog

### Versão 1.0.0 (07/02/2026)
✨ **Lançamento Inicial**
- Visualização por Professor
- Visualização por Disciplina
- Visualização por Turma
- Filtros avançados (mês, ano, professor, disciplina, turma)
- Cards de estatísticas gerais
- Cálculo automático de déficits e saldos
- Impressão otimizada com cores preservadas
- Integração com Calendário Letivo
- Integração com Controle de Frequência

---

© 2026 Sistema Criador de Horário de Aula Escolar  
Todos os direitos reservados.
