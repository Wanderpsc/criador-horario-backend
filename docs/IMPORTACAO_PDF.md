# Importação de Lotação via PDF

## 📄 Funcionalidade Implementada

Sistema de importação automática de lotações de professores a partir de arquivos PDF.

## Como Funciona

1. **Upload do PDF**: Na página de Lotação, clique no botão "📄 Importar PDF"
2. **Processamento**: O sistema extrai o texto do PDF e identifica:
   - Nomes de professores
   - Componentes curriculares
   - Turmas
3. **Matching Inteligente**: Faz correspondência com dados já cadastrados no sistema
4. **Preenchimento Automático**: Adiciona as lotações encontradas no formulário
5. **Revisão**: Você revisa as lotações extraídas
6. **Salvamento**: Clique em "Salvar" para confirmar

## Requisitos

### Dados Pré-cadastrados
Para que o sistema identifique corretamente, é necessário ter cadastrado:
- ✅ Professores (com nomes completos)
- ✅ Componentes Curriculares
- ✅ Turmas

### Formato do PDF
O sistema reconhece padrões comuns como:
- `Professor: NOME DO PROFESSOR`
- `NOME DO PROFESSOR | DISCIPLINA | TURMA`
- Estruturas similares de documentos oficiais

## Melhorias Futuras

- [ ] Suporte a mais formatos/layouts de PDF
- [ ] Ajuste manual de matching
- [ ] Preview antes de adicionar
- [ ] Histórico de importações

## Tecnologias

- **Backend**: pdf-parse, multer
- **Frontend**: React, TypeScript
- **Algoritmo**: Matching por similaridade de texto (normalização, remoção de acentos)

## Limitações

- Tamanho máximo: 10MB
- Apenas arquivos PDF
- Depende da qualidade e estrutura do PDF original
- Melhor resultado com PDFs de texto (não escaneados)

---
© 2025 Wander Pires Silva Coelho
