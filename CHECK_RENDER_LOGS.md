# Como Verificar e Corrigir Erro 500 no Render

## 🔍 Diagnóstico do Problema

O erro 500 ao fazer login indica que o backend está com problemas. Possíveis causas:

1. **MongoDB não conectado** - O backend não consegue se conectar ao MongoDB Atlas
2. **Variáveis de ambiente faltando** - JWT_SECRET ou MONGODB_URI não configuradas
3. **Modelo User não encontrado** - Problema de compilação ou importação

## ✅ Passo a Passo para Resolver

### 1. Verificar Logs no Render

1. Acesse: https://dashboard.render.com
2. Clique no serviço **criador-horario-backend-1**
3. Vá em **Logs** no menu lateral
4. Procure por:
   - ❌ Erros de conexão com MongoDB
   - ❌ Mensagens de "JWT_SECRET"
   - ❌ Erros ao importar modelos
   - ❌ "MongooseError" ou "connection failed"

### 2. Verificar Variáveis de Ambiente no Render

1. No dashboard do Render, vá em **Environment** no menu lateral
2. Verifique se estas variáveis existem:

```env
MONGODB_URI=mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority
JWT_SECRET=seu-jwt-secret-aqui
NODE_ENV=production
PORT=10000
```

3. Se alguma estiver faltando, adicione e clique em **Save Changes**
4. O Render irá reiniciar automaticamente o serviço

### 3. Verificar Conexão com MongoDB Atlas

1. Acesse: https://cloud.mongodb.com
2. Faça login com: wanderpsc@gmail.com
3. Vá em **Network Access** (menu lateral)
4. Certifique-se que existe uma regra com:
   - IP Address: `0.0.0.0/0` (permitir de qualquer lugar)
   - Comment: "Allow from anywhere" ou "Render"

5. Se não existir, adicione:
   - Clique em **ADD IP ADDRESS**
   - Selecione **ALLOW ACCESS FROM ANYWHERE**
   - Clique em **Confirm**

### 4. Testar a API Manualmente

Abra o navegador e teste:

```
https://criador-horario-backend-1.onrender.com/api/auth/health
```

Se retornar erro, o problema é de configuração no Render.

### 5. Forçar Redeploy

Se os logs mostram erro antigo:

1. No Render dashboard, vá em **Manual Deploy** 
2. Clique em **Deploy latest commit**
3. Aguarde o deploy terminar (pode levar 5-10 minutos)

### 6. Verificar Build Logs

Se o deploy falhar:

1. No Render, vá em **Events** no menu lateral
2. Clique no último deploy
3. Procure por erros de compilação TypeScript

## 🔧 Correções Comuns

### Se o erro for "Cannot connect to MongoDB":

1. Verifique se o IP 0.0.0.0/0 está liberado no MongoDB Atlas
2. Verifique se a senha no MONGODB_URI está correta
3. Teste a string de conexão localmente

### Se o erro for "JWT_SECRET is not defined":

1. Adicione a variável JWT_SECRET no Render Environment
2. Valor sugerido: `CriadorHorario2026SecretKey!@#$%`

### Se o erro for "User model not found":

1. Verifique se o build foi concluído com sucesso
2. Forçar novo deploy no Render

## 📞 Próximos Passos

1. **Verifique os logs** - Vá no Render e veja qual é o erro exato
2. **Me envie o log** - Copie a mensagem de erro e me mostre
3. **Eu vou corrigir** - Com base no erro, vou fazer o ajuste necessário

## 🚨 Ação Imediata

**AGORA MESMO:**
1. Acesse https://dashboard.render.com
2. Vá em **Logs**
3. Procure por linhas com ❌ ou "Error"
4. **Copie e cole aqui as últimas 20-30 linhas de log**

Com essas informações, vou identificar o problema exato e corrigir!
