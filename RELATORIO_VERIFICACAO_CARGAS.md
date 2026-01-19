# Relatório de Verificação de Cargas Horárias

Baseado nas planilhas fornecidas, vou verificar se as cargas horárias cadastradas estão corretas.

## 📋 Turmas para Verificar

### 1. EMTPFARM-1ª SÉRIE - INTEGRAL-I-A (Farmácia)
**Cargas horárias esperadas:**
- ANATOMIA E FISIOLOGIA HUMANA: 2
- ARTE: 1
- BISSEGURANÇA NO SETOR FARMACÊUTICO: 2
- BOAS PRÁTICAS DE MANIPULAÇÃO E CONTROLE DE QUALIDADE: 2
- EDUCAÇÃO FINANCEIRA: 1
- EDUCAÇÃO FÍSICA: 1
- ESPORTE/CULTURA/CLUBE DE LEITURA/OLIMPÍADAS DO CONHECIMENTO OU ROBOTICA(ELETIVA OBRIGATORIA): 2
- FILOSOFIA: 1
- FÍSICA: 2
- GEOGRAFIA: 2
- HISTÓRIA: 2
- INTELIGÊNCIA ARTIFICIAL: 1
- LEGISLAÇÃO FARMACÊUTICA E SANITÁRIA: 2
- LEITURA, INTERPRETAÇÃO E PRODUÇÃO TEXTUAL: 1
- LINGUA ESPANHOLA: 1
- LINGUA INGLESA: 2
- LÍNGUA PORTUGUESA: 2
- LINGUA PORTUGUESA/ RECOMPOSIÇÃO DA APRENDIZAGEM: 1
- MATEMÁTICA: 3
- MATEMÁTICA/ RECOMPOSIÇÃO DA APREDIZAGEM: 1
- NOÇÕES DE FARMACOLOGIA: 2
- PROJETO DE VIDA/EMPREENDEDORISMO: 1
- QUÍMICA: 2
- SOCIOLOGIA: 1
- BIOLOGIA: 2
**TOTAL: 42 aulas/semana**

---

### 2. EMTPDES-SIS-3ª SERIE - INTEGRAL-I-A (Desenvolvimento de Sistemas)
**Cargas horárias esperadas:**
- ARTE: 1
- ATIVIDADES INTEGRADORAS - CULTURA INTEGRADA A ARTE: 1
- ATIVIDADES INTEGRADORAS - EDUCAÇÃO DO TRÂNSITO: 2
- ATIVIDADES INTEGRADORAS - ESPORTE INTEGRADO A EDUCAÇÃO FÍSICA: 1
- ATIVIDADES INTEGRADORAS - INTELIGÊNCIA ARTIFICIAL: 1
- ATIVIDADES INTEGRADORAS - MONITORIA / HORÁRIO DE ESTUDO: 1
- BIOLOGIA: 1
- EDUCAÇÃO FÍSICA: 1
- FILOSOFIA: 1
- FÍSICA: 2
- GEOGRAFIA: 1
- HISTÓRIA: 1
- INTELIGÊNCIA ARTIFICIAL APLICADA A AUTOMAÇÃO: 2
- INTERNET DAS COISAS - IOT: 2
- LÍNGUA ESTRANGEIRA ESPANHOL: 1
- LÍNGUA ESTRANGEIRA INGLÊS: 2
- LÍNGUA PORTUGUESA: 3
- MATEMÁTICA: 3
- ORIENTAÇÃO PROFISSIONAL E EMPREENDEDORISMO: 1
- PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - CIÊNCIAS DA NATUREZA: 1
- PERCURSOS DE APROFUNDAMENTO/RECOMPOSIÇÃO - LÍNGUA PORTUGUESA: 2
- PERCURSOS DE APROFUNDAMENTO/RECOMPOSIÇÃO - MATEMÁTICA: 1
- PROJETO INTEGRADOR: 3
- QUÍMICA: 2
- SOCIOLOGIA: 1
- TESTE DE SISTEMAS E SEGURANÇA DE DADOS: 2
**TOTAL: 40 aulas/semana**

---

## ⚠️ IMPORTANTE

Para fazer a verificação completa, preciso:

1. Acessar o sistema em produção
2. Consultar a API de verificação que acabei de criar
3. Comparar os dados cadastrados com as planilhas fornecidas

## 🔧 Próximos passos

1. Fazer deploy da nova rota `/api/verify/verify`
2. Abrir o arquivo `verify-workload.html` no navegador
3. O arquivo fará a comparação automática e mostrará:
   - ✅ Disciplinas com carga horária correta
   - ❌ Disciplinas com carga horária incorreta
   - ⚠️ Disciplinas cadastradas que não estão na planilha
   - ⚠️ Disciplinas da planilha que não foram cadastradas

## 📊 Análise Preliminar

Você mencionou que a professora Claudia tem 28 aulas. Vamos verificar se isso está correto comparando com os dados das planilhas.

Se houver divergências, posso:
1. Gerar um script para corrigir as cargas horárias automaticamente
2. Criar um relatório detalhado das diferenças
3. Sugerir ajustes nas associações de professores

