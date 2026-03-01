# ✅ Checklist Operacional — Validação de Geração de Horário

Use este checklist **sempre após clicar em Gerar Horário** e **antes de Salvar**.

## 1) Confirmar contemplação de lotações

- [ ] Verificar se **não apareceu aviso de déficit** no bloco “Conflitos Detectados”.
- [ ] Se houver aviso, identificar: **Turma + Disciplina + Professor + diferença (alocado/esperado)**.
- [ ] Corrigir lotação/carga (professor-disciplina-turma) e gerar novamente.

> Regra: cada professor deve ficar contemplado de acordo com sua lotação na turma/disciplina.

## 2) Confirmar ausência de choques

- [ ] Revisar se não há alerta de conflito na grade (professor em duas turmas no mesmo dia/período).
- [ ] Verificar no mínimo 2 professores com maior carga para garantir que não há sobreposição no mesmo horário.
- [ ] Confirmar que as restrições de disponibilidade/observações foram respeitadas.

> Regra: nenhum professor pode aparecer em duas turmas no mesmo slot.

## 3) Validação final antes de salvar

- [ ] Conferir total de aulas por turma (deve estar coerente com os períodos e cargas da turma).
- [ ] Salvar com título identificável (ex.: `Horário 003 - Final`).
- [ ] Abrir o horário salvo e validar rapidamente uma turma crítica antes de encerrar.

---

## 🚨 Ação imediata se houver problema

1. Não salvar como versão final.
2. Ajustar lotação/disponibilidade.
3. Gerar novamente.
4. Repetir checklist.

---

## Padrão recomendado de título

- `Horário 00X - Rascunho`
- `Horário 00X - Revisado`
- `Horário 00X - Final`

Assim fica fácil rastrear versões e evitar sobrescrever horário válido.
