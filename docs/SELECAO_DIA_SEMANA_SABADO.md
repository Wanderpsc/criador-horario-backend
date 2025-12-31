# Funcionalidade: Seleção de Dia da Semana para Sábados Letivos

## Resumo
Foi implementada a funcionalidade que permite ao usuário selecionar qual dia da semana (Segunda a Sexta) o horário de aulas seguirá quando um sábado for marcado como letivo no calendário escolar.

## Arquivos Modificados

### Frontend

#### 1. `frontend/src/pages/SchoolCalendar.tsx`
- **Interface SchoolDay atualizada:**
  - Adicionado campo `followWeekday?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'`

- **Estado do formulário atualizado:**
  - Adicionado `followWeekday` ao estado `formData`

- **Nova função auxiliar `getWeekdayLabel()`:**
  ```typescript
  const getWeekdayLabel = (weekday: string) => {
    switch (weekday) {
      case 'monday': return 'Segunda';
      case 'tuesday': return 'Terça';
      case 'wednesday': return 'Quarta';
      case 'thursday': return 'Quinta';
      case 'friday': return 'Sexta';
      default: return weekday;
    }
  };
  ```

- **Novo seletor condicional no modal:**
  - Aparece apenas quando `dayType === 'saturday'`
  - Opções: Segunda a Sexta-feira
  - Design destacado com fundo azul claro
  - Texto explicativo: "O sábado seguirá o mesmo horário do dia selecionado"

- **Exibição no calendário:**
  - Para sábados com `followWeekday` definido
  - Mostra: "Segue: Segunda" (ou outro dia)
  - Estilo: texto azul, negrito

- **Atualização de todos os pontos de inicialização do formulário:**
  - Botão "Novo Dia"
  - Botão de edição
  - Botão de adicionar em células vazias

### Backend

#### 2. `backend/src/models/SchoolDay.ts` (NOVO ARQUIVO)
Modelo completo do Mongoose para dias letivos:

```typescript
export interface ISchoolDay extends Document {
  schoolId: string;
  date: Date;
  dayType: 'regular' | 'saturday' | 'holiday' | 'recess';
  scheduleId?: string;
  isCompleted: boolean;
  notes?: string;
  followWeekday?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  createdAt: Date;
  updatedAt: Date;
}
```

**Características:**
- Campo `followWeekday` opcional, apenas para sábados
- Índice único composto: `schoolId + date`
- Índices individuais em `schoolId` e `date`
- Timestamps automáticos

#### 3. `backend/src/routes/schoolDay.routes.ts` (NOVO ARQUIVO)
Rotas completas para gerenciamento de dias letivos:

**Endpoints criados:**
- `GET /api/schooldays/school/:schoolId` - Listar dias com filtros de data
- `GET /api/schooldays/school/:schoolId/statistics` - Estatísticas
- `GET /api/schooldays/:id` - Obter dia específico
- `POST /api/schooldays` - Criar dia letivo
- `POST /api/schooldays/bulk` - Criar múltiplos dias
- `PUT /api/schooldays/:id` - Atualizar dia
- `DELETE /api/schooldays/:id` - Deletar dia

**Características especiais:**
- Popular automaticamente os schedules relacionados
- Validação: não permite dias duplicados para mesma data
- Auto-limpeza: remove `followWeekday` se tipo mudou para não-sábado
- Conversão de datas para formato ISO string
- Tratamento de campos opcionais

#### 4. `backend/src/server.ts`
- Importado `schoolDayRoutes`
- Registrado rota: `app.use('/api/schooldays', schoolDayRoutes)`

## Fluxo de Uso

1. **Criar/Editar Dia no Calendário:**
   - Usuário acessa o calendário escolar
   - Clica em um dia ou no botão "Novo Dia Letivo"
   - Seleciona "Sábado Letivo" no campo Tipo

2. **Seleção do Dia da Semana:**
   - Automaticamente aparece o campo "Seguir horário de qual dia da semana?"
   - Dropdown com opções: Segunda, Terça, Quarta, Quinta, Sexta
   - Design destacado para chamar atenção

3. **Salvar:**
   - Dados enviados para backend
   - Salvos no banco com o campo `followWeekday`

4. **Visualização:**
   - No calendário, sábados com dia selecionado mostram
   - "Sábado Letivo"
   - "Segue: [Dia da Semana]" em azul

## Integração com Sistema de Reposição

Esta funcionalidade se integra com:
- **Horários Emergenciais:** Professores ausentes registrados
- **Sábados de Reposição:** Sistema calcula débitos automaticamente
- **Calendário Letivo:** Define quais sábados seguem qual padrão de aula

## Exemplo de Uso Prático

**Cenário:**
- Segunda-feira: Professor de Matemática faltou
- Horário emergencial criado com substituto
- Sábado 15/02 marcado como letivo seguindo Segunda-feira
- Sistema sabe que Matemática deve ser reposta no sábado
- Geração automática do horário de reposição para o sábado

## Validações

✅ Campo `followWeekday` só aparece para tipo "saturday"  
✅ Campo `followWeekday` é removido se tipo mudar para outro  
✅ Não permite criar dois dias para mesma data  
✅ Salva corretamente no banco de dados  
✅ Exibe corretamente no calendário  
✅ Todos os pontos de edição incluem o campo

## Status
✅ **IMPLEMENTADO E TESTADO**
- Modelo criado
- Rotas implementadas
- Interface completa
- Validações funcionando
- Sem erros de compilação
