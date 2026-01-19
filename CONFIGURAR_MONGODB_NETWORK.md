# 🔐 Configurar Network Access do MongoDB Atlas para Render

## ⚠️ Problema Identificado

O MongoDB Atlas está funcionando, mas o **Render provavelmente não consegue se conectar** porque o Network Access está bloqueando conexões externas.

## ✅ Solução: Permitir Acesso de Qualquer IP

### Passo 1: Acessar Network Access

1. No MongoDB Atlas (você já está lá)
2. No menu lateral esquerdo, clique em:
   - **SECURITY** → **Network Access**
   
   OU
   
   - **Database & Network Access**

### Passo 2: Adicionar Regra 0.0.0.0/0

1. Clique no botão **ADD IP ADDRESS** (canto superior direito)

2. Na janela que abrir:
   - Clique em **ALLOW ACCESS FROM ANYWHERE**
   - O campo IP Address será preenchido com: `0.0.0.0/0`
   - Description (opcional): "Render Backend"
   
3. Clique em **Confirm**

4. Aguarde 1-2 minutos para a regra ser aplicada

### Passo 3: Verificar String de Conexão

1. Volte para **Database** no menu lateral
2. Clique no botão **Connect** no seu Cluster0
3. Selecione **Drivers** (ou **Connect your application**)
4. Copie a string de conexão que aparece
5. Ela deve ser parecida com:

```
mongodb+srv://wanderpsc:<password>@cluster0.auovj2m.mongodb.net/?retryWrites=true&w=majority
```

6. **Substitua `<password>` pela senha real**: `Wpsc2025`
7. **Adicione o nome do database**: `school-timetable`

String final deve ser:
```
mongodb+srv://wanderpsc:Wpsc2025@cluster0.auovj2m.mongodb.net/school-timetable?retryWrites=true&w=majority
```

### Passo 4: Atualizar Variável no Render

1. Acesse: https://dashboard.render.com
2. Clique no serviço **criador-horario-backend-1**
3. Vá em **Environment** no menu lateral
4. Procure pela variável `MONGODB_URI`
5. **Atualize com a string correta acima**
6. Clique em **Save Changes**
7. O Render irá reiniciar automaticamente (aguarde 2-3 minutos)

### Passo 5: Testar Login Novamente

1. Acesse: https://criador-horario.surge.sh/login
2. Tente fazer login
3. Deve funcionar! ✅

## 🚨 Se Ainda Não Funcionar

### Verifique os Logs do Render:

1. No Render dashboard
2. Vá em **Logs**
3. Procure por:
   - `✅ MongoDB conectado` → **BOM! Está conectando**
   - `❌ Erro ao conectar ao MongoDB` → **Problema na string de conexão**
   - `MongoServerError` → **Erro de autenticação (senha errada)**

### Me envie essas informações:

1. **Você adicionou a regra 0.0.0.0/0?** (Sim/Não)
2. **A string MONGODB_URI no Render está correta?** (Cole aqui, censure a senha)
3. **O que aparece nos logs do Render?** (Copie as últimas linhas)

## 📌 Resumo Rápido

```
1. MongoDB Atlas → SECURITY → Network Access
2. ADD IP ADDRESS → ALLOW ACCESS FROM ANYWHERE (0.0.0.0/0)
3. Render → Environment → Atualizar MONGODB_URI
4. Aguardar 2-3 minutos
5. Testar login
```

**Faça isso AGORA e me avise o resultado!** 🚀
