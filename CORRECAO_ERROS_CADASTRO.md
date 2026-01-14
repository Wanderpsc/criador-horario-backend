# 🔧 Correções Aplicadas - Erros de Cadastro e Pagamento

© 2025 Wander Pires Silva Coelho

---

## ✅ Correções Implementadas:

### 1. **Autocomplete nos campos de senha**
Adicionado `autoComplete="new-password"` nos campos:
- Campo "Senha"
- Campo "Confirmar Senha"

Isso remove os warnings do Chrome/Firefox sobre autocomplete.

### 2. **Log de debug da URL da API**
Adicionado console.log para verificar qual URL está sendo usada:
```typescript
console.log('🔧 [API CONFIG] Base URL:', API_URL);
console.log('🔧 [API CONFIG] Ambiente:', import.meta.env.MODE);
```

### 3. **Build limpo forçado**
- Removida pasta `dist` antiga
- Build completamente novo
- Deploy no GitHub Pages

---

## 🐛 Erros Identificados:

### Erro 1: URL ainda com `-1`
```
criador-horario-backend-1.onrender.com/api/auth/register-school
```

**Causa:** Cache do navegador ou service worker antigo

**Solução:**
1. Limpe COMPLETAMENTE o cache
2. Desabilite service workers
3. Use aba anônima

### Erro 2: 400 Bad Request no `/auth/register-school`
```
Failed to load resource: the server responded with a status of 400
```

**Possíveis causas:**
- Campo obrigatório faltando
- Email já cadastrado
- Termos não aceitos
- Formato de dados incorreto

### Erro 3: 500 Server Error no `/payments/create-public`
```
Failed to load resource: the server responded with a status of 500
```

**Causa:** Erro no backend, provavelmente:
- Mercado Pago não configurado corretamente
- Token de acesso inválido
- Chave PIX não cadastrada

---

## 🧪 Como Testar Agora:

### 1. Limpe COMPLETAMENTE o cache:

#### Chrome:
1. Pressione **F12** (DevTools)
2. **Clique direito** no botão de atualizar
3. Selecione **"Limpar cache e fazer hard reload"**
4. Ou use: **Ctrl + Shift + Delete**
   - Selecione "Últimas 24 horas"
   - Marque: Cache, Cookies, Dados de aplicativos

#### Firefox:
1. **Ctrl + Shift + Delete**
2. Selecione "Tudo"
3. Marque: Cache, Cookies

### 2. Desabilite Service Workers (se tiver):

#### Chrome DevTools:
1. F12 → Application → Service Workers
2. Clique em "Unregister" em todos
3. Marque "Update on reload"

### 3. Use Aba Anônima (Recomendado):
- **Chrome:** Ctrl + Shift + N
- **Firefox:** Ctrl + Shift + P

### 4. Acesse o sistema:
```
https://wanderpsc.github.io/criador-horario-backend/register-school
```

### 5. Verifique o console (F12):
Deve aparecer:
```
🔧 [API CONFIG] Base URL: https://criador-horario-backend.onrender.com/api
🔧 [API CONFIG] Ambiente: production
```

**Se ainda aparecer `-1` na URL:**
- Cache não foi limpo corretamente
- Tente em outro navegador
- Aguarde mais 5 minutos para propagação do GitHub Pages

---

## 🔍 Debug do Erro 400:

Quando clicar em "Finalizar Cadastro", abra o console (F12) e veja:

### Se aparecer:
```json
{
  "message": "Email já cadastrado"
}
```
**Solução:** Use outro email

### Se aparecer:
```json
{
  "message": "Você deve aceitar os termos de uso"
}
```
**Solução:** Certifique-se de ter clicado em "Ler e Aceitar Termos"

### Se aparecer:
```json
{
  "message": "Campo XXX é obrigatório"
}
```
**Solução:** Preencha todos os campos com asterisco (*)

---

## 🔍 Debug do Erro 500 (Pagamento):

O erro 500 no `/payments/create-public` indica problema no backend do Mercado Pago.

### Verificações necessárias:

1. **Token do Mercado Pago está válido?**
   - Acesse: https://dashboard.render.com
   - Vá no serviço `criador-horario-backend`
   - Verifique a variável: `MERCADO_PAGO_ACCESS_TOKEN`

2. **Chave PIX cadastrada?**
   - Acesse: https://www.mercadopago.com.br
   - Vá em "Seu negócio" → "Configurações"
   - Verifique se tem chave PIX cadastrada

3. **Backend está rodando?**
   - Teste: https://criador-horario-backend.onrender.com/health
   - Deve retornar: `{"status": "ok"}`

### Solução temporária:
Se o erro persistir, o sistema está configurado para mostrar:
```
⚠️ Sistema de pagamento em configuração.
Entre em contato com wanderpsc@gmail.com
```

Você pode aprovar escolas manualmente pelo painel admin.

---

## 📋 Checklist de Teste:

### Preparação:
- [ ] Cache limpo (Ctrl + Shift + Delete)
- [ ] Service Workers desabilitados
- [ ] Usando aba anônima (recomendado)

### Teste de Cadastro:
- [ ] Acessou: `/register-school`
- [ ] Console mostra URL correta (sem `-1`)
- [ ] Preencheu todos os campos obrigatórios
- [ ] Aceitou os termos (botão azul → verde)
- [ ] Clicou "Finalizar Cadastro"
- [ ] Não deu erro 400
- [ ] Foi redirecionado para pagamento

### Teste de Pagamento:
- [ ] Página de pagamento carregou
- [ ] Selecionou plano
- [ ] Escolheu PIX
- [ ] Clicou "Gerar Pagamento"
- [ ] Backend responde (não fica em loading eterno)
- [ ] QR Code aparece OU mensagem de configuração aparece

---

## ⚠️ Problemas Conhecidos:

### 1. Backend do Render dormindo (Free Tier):
**Sintoma:** Primeira requisição muito lenta ou timeout

**Solução:**
- Aguarde 30-60 segundos
- Tente novamente
- Backend vai "acordar"

### 2. Mercado Pago não configurado:
**Sintoma:** Erro 500 ao gerar PIX

**Solução temporária:**
- Sistema mostra mensagem de contato
- Admin pode aprovar manualmente
- Escola usa sistema normalmente após aprovação

### 3. Cache persistente:
**Sintoma:** URL ainda aparece com `-1`

**Solução:**
- Aba anônima
- Outro navegador
- Limpar cache novamente
- Aguardar 5-10 minutos

---

## 🎯 Resultado Esperado:

### Console (F12) deve mostrar:
```
🔧 [API CONFIG] Base URL: https://criador-horario-backend.onrender.com/api
🔧 [API CONFIG] Ambiente: production
```

### Cadastro deve:
✅ Aceitar todos os dados
✅ Não dar erro 400
✅ Redirecionar para pagamento
✅ Mostrar mensagem de sucesso

### Pagamento deve:
✅ Carregar página
✅ Permitir selecionar plano/PIX
✅ Não dar erro 500 OU mostrar mensagem amigável
✅ QR Code aparecer (se Mercado Pago configurado)

---

## 📞 Se Continuar com Problemas:

### 1. Tire screenshot do console (F12):
- Aba "Console"
- Capture todos os erros em vermelho

### 2. Teste a URL do backend:
```
https://criador-horario-backend.onrender.com/health
```
Deve retornar:
```json
{"status": "ok", "timestamp": "..."}
```

### 3. Informe:
- Navegador e versão
- Já limpou cache?
- Está em aba anônima?
- Qual erro específico aparece?

---

## ✅ Status do Deploy:

- ✅ Autocomplete adicionado nos campos de senha
- ✅ Log de debug da URL adicionado
- ✅ Build limpo realizado
- ✅ Deploy no GitHub Pages concluído
- ⏱️ Aguarde 2-3 minutos para propagação completa

---

© 2025 Wander Pires Silva Coelho
E-mail: wanderpsc@gmail.com
