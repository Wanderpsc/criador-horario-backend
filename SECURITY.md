# Segurança do Sistema

## 🔒 Política de Segurança

Este documento descreve as práticas de segurança implementadas e como reportar vulnerabilidades.

---

## 📋 Práticas de Segurança Implementadas

### 1. **Autenticação e Autorização**
- ✅ JWT (JSON Web Tokens) para autenticação
- ✅ Tokens com expiração de 7 dias
- ✅ Senhas hasheadas com bcrypt (10 rounds)
- ✅ Middleware de verificação de token
- ✅ Controle de acesso baseado em roles (Admin, School)

### 2. **Proteção de Dados Sensíveis**
- ✅ Variáveis de ambiente (.env) NUNCA commitadas no git
- ✅ Tokens de API protegidos
- ✅ Senhas de banco de dados em variáveis de ambiente
- ✅ .gitignore configurado para excluir dados sensíveis

### 3. **API e Backend**
- ✅ CORS configurado para origem específica
- ✅ Rate limiting (limitação de requisições)
- ✅ Helmet.js para headers HTTP seguros
- ✅ Validação de inputs com express-validator
- ✅ Sanitização de dados de entrada
- ✅ Proteção contra SQL/NoSQL Injection

### 4. **Pagamentos**
- ✅ Integração segura com Mercado Pago
- ✅ Webhook para validação automática
- ✅ Verificação de assinaturas de pagamento
- ✅ Logs de todas as transações

### 5. **Banco de Dados**
- ✅ MongoDB Atlas com conexão criptografada (TLS)
- ✅ Usuário e senha protegidos
- ✅ IP Whitelist configurável
- ✅ Backup automático

### 6. **Frontend**
- ✅ Sanitização de inputs no cliente
- ✅ Proteção contra XSS (Cross-Site Scripting)
- ✅ Tokens armazenados com segurança (localStorage)
- ✅ Validação de formulários

---

## 🛡️ Medidas de Proteção Adicionais

### Antes de Deploy em Produção:

#### 1. **Variáveis de Ambiente**
```bash
# NUNCA exponha estas informações:
- MONGODB_URI
- JWT_SECRET
- MERCADO_PAGO_ACCESS_TOKEN
- EMAIL_PASSWORD
- WHATSAPP_ACCESS_TOKEN
```

#### 2. **HTTPS Obrigatório**
- Configure SSL/TLS em produção
- Redirecione HTTP para HTTPS
- Use certificados válidos (Let's Encrypt)

#### 3. **Rate Limiting**
```javascript
// Implementado no backend:
- 100 requisições por 15 minutos por IP
- Proteção contra ataques de força bruta
```

#### 4. **Validação de Entrada**
```javascript
// Todos os endpoints validam:
- Formato de email
- Força de senha (mínimo 6 caracteres)
- Tipos de dados
- Caracteres especiais
```

#### 5. **Logs e Monitoramento**
- Todas as ações críticas são logadas
- Falhas de autenticação registradas
- Tentativas de pagamento monitoradas

---

## 🚨 Como Reportar Vulnerabilidades

Se você descobrir uma vulnerabilidade de segurança, siga estes passos:

### 1. **NÃO divulgue publicamente**
   Não crie issues públicas no GitHub ou poste em fóruns.

### 2. **Contato Direto**
   Envie um e-mail para: **wanderpsc@gmail.com**
   
   Assunto: `[VULNERABILIDADE] Nome da Vulnerabilidade`

### 3. **Informações a Incluir**
   - Descrição detalhada da vulnerabilidade
   - Passos para reproduzir
   - Impacto potencial
   - Sugestões de correção (se tiver)

### 4. **Tempo de Resposta**
   - Responderemos em até 48 horas
   - Correção prioritária para vulnerabilidades críticas
   - Créditos ao descobridor (se desejar)

---

## 🔐 Checklist de Segurança para Deploy

Antes de colocar em produção, verifique:

- [ ] `.env` configurado e NÃO commitado
- [ ] HTTPS configurado
- [ ] CORS configurado para domínio correto
- [ ] Rate limiting ativo
- [ ] Helmet.js configurado
- [ ] JWT_SECRET forte e único
- [ ] Senhas fortes no banco de dados
- [ ] Webhook URL pública configurada
- [ ] Logs de segurança ativos
- [ ] Backup automático configurado
- [ ] Firewall configurado (portas 80/443 apenas)
- [ ] Variáveis de ambiente no servidor de produção
- [ ] Monitoramento de erros ativo
- [ ] Certificado SSL válido
- [ ] MONGODB_URI com IP Whitelist configurado

---

## 📚 Referências de Segurança

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## 📝 Atualizações de Segurança

Este documento será atualizado conforme novas medidas de segurança forem implementadas.

**Última atualização:** 04 de Janeiro de 2025

---

## ⚖️ Direitos Autorais

© 2025 Wander Pires Silva Coelho - Todos os direitos reservados.

Este sistema é propriedade exclusiva do autor e está protegido por leis de direitos autorais.
Qualquer uso não autorizado, cópia ou distribuição é estritamente proibido.
