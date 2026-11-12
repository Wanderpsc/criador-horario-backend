# 🔧 Instalação do MongoDB no E:

## Método Manual (Recomendado)

### 1. Download

Baixe o MongoDB Community Server:
https://www.mongodb.com/try/download/community

- Versão: 7.0.x (Windows x64)
- Formato: **ZIP** (não MSI)

### 2. Extrair

1. Extraia o arquivo ZIP
2. Mova a pasta extraída para: **E:\MongoDB**
3. A estrutura deve ficar:
   ```
   E:\MongoDB\
   ├── bin\
   │   ├── mongod.exe
   │   ├── mongos.exe
   │   └── ...
   ├── data\       (crie essa pasta)
   └── log\        (crie essa pasta)
   ```

### 3. Criar Pastas de Dados

```powershell
mkdir E:\MongoDB\data -Force
mkdir E:\MongoDB\log -Force
```

### 4. Configurar

Crie o arquivo `E:\MongoDB\mongod.cfg`:

```yaml
systemLog:
  destination: file
  path: E:\MongoDB\log\mongod.log
storage:
  dbPath: E:\MongoDB\data
net:
  port: 27017
  bindIp: 127.0.0.1
```

### 5. Iniciar MongoDB

**Opção A - Manualmente:**
```powershell
cd E:\MongoDB\bin
.\mongod.exe --config E:\MongoDB\mongod.cfg
```

**Opção B - Como Serviço Windows:**
```powershell
# Execute como Administrador
cd E:\MongoDB\bin
.\mongod.exe --config E:\MongoDB\mongod.cfg --install --serviceName "MongoDB"

# Iniciar serviço
Start-Service MongoDB

# Verificar status
Get-Service MongoDB
```

### 6. Testar Conexão

```powershell
# Execute em outro terminal
E:\MongoDB\bin\mongosh.exe
# Deve conectar em mongodb://localhost:27017
```

---

## Alternativa: MongoDB Atlas (Cloud - Mais Fácil!)

1. Acesse: https://www.mongodb.com/cloud/atlas/register
2. Crie conta gratuita
3. Crie cluster gratuito (M0)
4. Configure acesso:
   - Database Access: crie usuário
   - Network Access: adicione 0.0.0.0/0
5. Clique "Connect" → "Connect your application"
6. Copie a connection string
7. Cole no `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://<usuario>:<senha>@<cluster>.mongodb.net/<banco>
   ```

---

## Verificar se Está Funcionando

1. Backend deve mostrar: `✅ MongoDB conectado`
2. Acesse MongoDB Compass: `mongodb://localhost:27017`
3. Você verá o database `school-timetable`

---

## Comandos Úteis

```powershell
# Iniciar serviço
Start-Service MongoDB

# Parar serviço
Stop-Service MongoDB

# Status
Get-Service MongoDB

# Ver logs
Get-Content E:\MongoDB\log\mongod.log -Tail 50 -Wait
```
