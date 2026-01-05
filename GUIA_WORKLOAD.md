# 📚 GUIA - ATUALIZAÇÃO DE CARGA HORÁRIA

## ✅ Script Criado

O script `update-workload-clean.ps1` está pronto para atualizar a carga horária das disciplinas em cada turma.

## 🔧 Como Usar

### 1. **Configurar os Dados**

Edite o arquivo `update-workload-clean.ps1` e preencha o dicionário `$workloadData` com as turmas e disciplinas:

```powershell
$workloadData = @{
    "Nome Exato da Turma 1" = @{
        "MATEMÁTICA" = 4
        "FÍSICA" = 2
        "QUÍMICA" = 2
        # ... mais disciplinas
    }
    
    "Nome Exato da Turma 2" = @{
        "BIOLOGIA" = 2
        "HISTÓRIA" = 2
        # ... mais disciplinas
    }
}
```

### 2. **Importante:**
- Os nomes das **turmas** devem ser EXATAMENTE iguais aos cadastrados no sistema
- Os nomes das **disciplinas** devem ser EXATAMENTE iguais aos cadastrados
- O número representa **aulas por semana** (não horas totais)

### 3. **Executar o Script**

```powershell
# No ambiente LOCAL primeiro:
cd "e:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA"
.\update-workload-clean.ps1
```

### 4. **O que o script faz:**

1. ✅ Verifica se backend está rodando
2. ✅ Autentica no sistema
3. ✅ Lista todas as turmas cadastradas
4. ✅ Lista todas as disciplinas cadastradas
5. ✅ Cria backup automático antes de qualquer mudança
6. ✅ Valida se turmas e disciplinas existem
7. ✅ Mostra prévia das mudanças
8. ⚠️  Pede confirmação antes de aplicar
9. ✅ Atualiza as turmas uma por uma
10. ✅ Relatório final com sucessos e erros

## 📋 Extrair Dados da Planilha

Com base na imagem enviada, as turmas identificadas são:

- **EPI-FUND I/ANOS FINAIS TEMPO INTEGRAL**
- **EPI-FUND II/ANOS FINAIS TEMPO INTEGRAL**  
- **EMI/FAMI**
- **EMI/FES 3º1-2º SERIE C-A**
- **EMI/FRANC-1º SERIE**
- **EMI/FRANC-2º SERIE C-A**
- **EMI/FES 3º1-1º SERIE**
- **EMI/FES 3º1-2º SERIE**
- **UNINIVERSAL 1º SERIE 1-A**

**Os números na planilha (-1, -2, -3, etc.) indicam a carga horária semanal.**

## 🚨 Segurança

O script tem múltiplas camadas de segurança:

1. **Backup Automático** - Cria arquivo JSON com estado anterior
2. **Confirmação Manual** - Pede S/N antes de aplicar
3. **Validação de Dados** - Avisa se turma/disciplina não existe
4. **Modo Local Primeiro** - Teste local antes de produção
5. **Relatório Detalhado** - Mostra o que foi feito

## 📝 Exemplo de Execução

```
📋 DADOS CONFIGURADOS:
   Turmas: 3
   ✓ 3ª SÉRIE A : 10 disciplinas
   ✓ 2ª SÉRIE B : 12 disciplinas
   ✓ 1ª SÉRIE C : 11 disciplinas
   Total de associações: 33

✅ Backend local rodando

1️⃣  Autenticando...
   ✅ Login OK

2️⃣  Carregando turmas...
   📊 Encontradas: 5 turmas
   
   Turmas cadastradas no sistema:
      - 3ª SÉRIE A
      - 2ª SÉRIE B
      - 1ª SÉRIE C
      - TURMA TESTE
      - CETI AMARAL

3️⃣  Carregando disciplinas...
   📊 Encontradas: 147 disciplinas

4️⃣  Criando backup...
   ✅ Backup: backup-workload-20260104-163045.json

5️⃣  Preparando atualizações...

   ✓ 3ª SÉRIE A : 10 disciplinas
   ✓ 2ª SÉRIE B : 12 disciplinas
   ✓ 1ª SÉRIE C : 11 disciplinas

   📊 Turmas a atualizar: 3

⚠️  CONFIRMAÇÃO
   Atualizar carga horária de 3 turma(s)?
   • 3ª SÉRIE A: 10 disciplinas
   • 2ª SÉRIE B: 12 disciplinas
   • 1ª SÉRIE C: 11 disciplinas

   Continuar? (S/N): S

7️⃣  Atualizando turmas...

   ✅ 3ª SÉRIE A - 10 disciplinas
   ✅ 2ª SÉRIE B - 12 disciplinas
   ✅ 1ª SÉRIE C - 11 disciplinas

═══════════════════════════════════════════════════════════
📊 RESULTADO
═══════════════════════════════════════════════════════════

✅ Atualizadas: 3 turma(s)

📁 Backup: backup-workload-20260104-163045.json
🔗 Verificar: http://localhost:3002/class-subjects

✅ Concluído com sucesso!

═══════════════════════════════════════════════════════════
```

## 🔄 Para Produção

Depois de testar localmente, crie versão para produção:

1. Duplique o script: `copy update-workload-clean.ps1 update-workload-production.ps1`

2. Edite e altere a URL:
   ```powershell
   $apiUrl = "https://criador-horario-backend-1.onrender.com/api"
   ```

3. Execute com cuidado!

## ⚠️ Avisos Importantes

- ❌ **NÃO execute** em produção sem testar localmente
- ✅ **SEMPRE verifique** os backups são criados
- ✅ **COMPARE** nomes EXATAMENTE com os cadastrados
- ✅ **TESTE** com 1-2 turmas primeiro
- ✅ **VERIFIQUE** o resultado em /class-subjects após execução

## 🆘 Problemas Comuns

### Erro: "Turma não encontrada"
**Solução:** Copie o nome EXATO da turma do sistema (pode ter espaços, maiúsculas diferentes, etc.)

### Erro: "Disciplina não encontrada"  
**Solução:** Verifique se a disciplina está cadastrada em /subjects

### Erro: "Backend não está rodando"
**Solução:** Inicie o backend:
```bash
cd backend
npm run dev
```

### Erro de autenticação
**Solução:** Verifique credenciais do CETI:
- Email: escola@ceti.com  
- Senha: Ceti2025@

## 📞 Suporte

Se algo der errado:

1. **Verifique o backup** (arquivo `backup-workload-*.json`)
2. **Veja os logs** do erro no PowerShell
3. **Restaure manualmente** se necessário (usando backup)

## ✅ Checklist Antes de Executar

- [ ] Backend está rodando
- [ ] Credenciais estão corretas
- [ ] Nomes das turmas conferidos
- [ ] Nomes das disciplinas conferidos
- [ ] Backup será criado automaticamente
- [ ] Testado localmente primeiro
- [ ] Página /class-subjects aberta para verificar resultado

---

**© 2025 Wander Pires Silva Coelho - Sistema Criador de Horário de Aula Escolar**
