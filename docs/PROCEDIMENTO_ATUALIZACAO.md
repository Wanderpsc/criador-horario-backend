# Procedimento de Atualização do Sistema
**Sistema Criador de Horário de Aula Escolar**  
© 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com

---

## ✅ GARANTIA DE DADOS

**SIM, seus dados ficarão 100% seguros durante atualizações do sistema!**

O sistema utiliza MongoDB como banco de dados, que armazena todas as informações em um local separado do código. Quando você atualiza o sistema, apenas os arquivos de código são substituídos, **nunca os dados**.

---

## 📊 Onde Ficam os Dados?

### **MongoDB Local** (padrão)
- **Local**: `C:\Program Files\MongoDB\Server\8.0\data\`
- **Database**: `school-timetable`
- **Persistência**: Dados ficam no disco, independente do código

### **MongoDB Atlas** (nuvem)
- **Local**: Servidores MongoDB na nuvem
- **Backup automático**: Incluído no serviço
- **Acesso**: Via string de conexão no arquivo `.env`

---

## 🔐 Procedimento de Atualização Segura

### **Passo 1: SEMPRE Fazer Backup Antes**

```powershell
# Navegar até o diretório de scripts
cd "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\backend\scripts"

# Executar backup
.\backup-database.ps1
```

**O que este script faz:**
- ✅ Cria backup completo do banco de dados
- ✅ Compacta em arquivo ZIP com data/hora
- ✅ Salva em `backend/backups/mongodb/`
- ✅ Mantém os últimos 10 backups automaticamente

**Resultado esperado:**
```
✅ BACKUP CONCLUÍDO COM SUCESSO!
   Local: E:\...\backups\mongodb\school-timetable_20251220_143022.zip
   Tamanho: 2.45 MB
```

---

### **Passo 2: Copiar Backup para Local Seguro**

**IMPORTANTE**: Copie o arquivo ZIP para:
- ☁️ Google Drive / OneDrive / Dropbox
- 💾 Pen drive ou HD externo
- 📧 Envie por email para você mesmo

**Nunca confie apenas no backup local!**

---

### **Passo 3: Atualizar o Sistema**

#### **Opção A: Atualização via Git (recomendado)**

```powershell
# Navegar até o diretório do projeto
cd "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA"

# Verificar alterações locais
git status

# Salvar alterações locais (se houver)
git stash

# Baixar nova versão
git pull origin main

# Restaurar alterações locais (se necessário)
git stash pop

# Reinstalar dependências do backend
cd backend
npm install

# Reinstalar dependências do frontend
cd ..\frontend
npm install
```

#### **Opção B: Substituição Manual**

1. **Baixe** a nova versão do sistema
2. **NÃO APAGUE** a pasta atual completamente
3. **Substitua apenas** as pastas:
   - `backend/src`
   - `frontend/src`
   - Arquivos `package.json` (se houver atualizações)
4. **MANTENHA INTACTOS**:
   - `backend/.env` (suas configurações)
   - `backend/backups/` (seus backups)
   - `C:\Program Files\MongoDB\` (banco de dados)

---

### **Passo 4: Recompilar o Backend**

```powershell
cd backend
npm run build
```

**Aguarde a mensagem de sucesso** (sem erros).

---

### **Passo 5: Reiniciar o Sistema**

```powershell
# Parar processos antigos (se estiverem rodando)
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar MongoDB (se não estiver rodando)
Start-Service MongoDB

# Iniciar backend
cd backend
npm start

# Em outro terminal, iniciar frontend
cd frontend
npm run dev
```

---

### **Passo 6: Verificar Funcionamento**

1. Acesse: **http://localhost:3000**
2. Faça login com suas credenciais
3. Verifique se todos os dados estão presentes:
   - ✅ Professores
   - ✅ Disciplinas
   - ✅ Turmas
   - ✅ Horários salvos

**Se algo estiver faltando, vá para o Passo 7.**

---

### **Passo 7: Restaurar Backup (se necessário)**

```powershell
cd "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\backend\scripts"

# Listar backups disponíveis
Get-ChildItem ..\backups\mongodb\*.zip | Sort-Object CreationTime -Descending

# Restaurar backup específico (substitua pelo nome do arquivo)
.\restore-database.ps1 -BackupFile "..\backups\mongodb\school-timetable_20251220_143022.zip"

# Se quiser SUBSTITUIR todos os dados (cuidado!)
.\restore-database.ps1 -BackupFile "..\backups\mongodb\school-timetable_20251220_143022.zip" -Drop
```

---

## 🔄 Backup Automático (Recomendado)

### **Configurar Backup Diário Automático**

1. Abra o **Agendador de Tarefas** do Windows
2. Criar Tarefa Básica → Nome: "Backup Horário Escolar"
3. Gatilho: **Diariamente** às 23:00
4. Ação: **Iniciar Programa**
   - Programa: `powershell.exe`
   - Argumentos: `-File "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\backend\scripts\backup-database.ps1"`
5. Marcar: **Executar mesmo que o usuário não esteja conectado**

---

## 📦 Estrutura de Dados Persistentes

```
Sistema
├── Código do Programa (SUBSTITUÍDO em atualizações)
│   ├── backend/src/
│   ├── frontend/src/
│   └── package.json
│
├── Configurações (NUNCA APAGAR)
│   ├── backend/.env (suas credenciais)
│   └── backend/.env.example (modelo)
│
├── Backups (NUNCA APAGAR)
│   └── backend/backups/mongodb/
│       ├── school-timetable_20251220_143022.zip
│       ├── school-timetable_20251221_230001.zip
│       └── ...
│
└── Banco de Dados (SEPARADO DO CÓDIGO)
    └── C:\Program Files\MongoDB\Server\8.0\data\
        └── school-timetable (SEUS DADOS)
```

---

## ⚠️ O Que NUNCA Fazer

❌ **NÃO** apague `C:\Program Files\MongoDB\` durante atualização  
❌ **NÃO** apague `backend/.env` (suas senhas estão lá)  
❌ **NÃO** apague `backend/backups/` (seus backups)  
❌ **NÃO** faça atualização sem backup prévio  
❌ **NÃO** confie apenas em backup local (copie para nuvem)

---

## ✅ Checklist de Atualização Segura

```
[ ] 1. Fazer backup do banco de dados
[ ] 2. Copiar backup para local seguro (nuvem/pen drive)
[ ] 3. Anotar versão atual do sistema
[ ] 4. Baixar/instalar nova versão
[ ] 5. Manter arquivos .env intactos
[ ] 6. Reinstalar dependências (npm install)
[ ] 7. Recompilar backend (npm run build)
[ ] 8. Reiniciar sistema (backend + frontend)
[ ] 9. Verificar dados (professores, disciplinas, horários)
[ ] 10. Testar funcionalidades principais
```

---

## 🆘 Suporte em Caso de Problemas

**Contato do Desenvolvedor:**  
📧 Email: wanderpsc@gmail.com  
👤 Nome: Wander Pires Silva Coelho

**Informações a Enviar:**
1. Versão atual do sistema
2. Mensagem de erro completa
3. Print da tela do problema
4. Confirmação se fez backup antes
5. Sistema operacional (Windows 10/11)

---

## 📋 Migração para MongoDB Atlas (Nuvem)

Se quiser **ainda mais segurança**, migre para MongoDB Atlas:

1. Acesse: https://www.mongodb.com/cloud/atlas/register
2. Crie conta gratuita (512MB grátis)
3. Crie cluster (região: São Paulo)
4. Copie string de conexão
5. Cole no `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://<usuario>:<senha>@<cluster>.mongodb.net/<banco>
   ```
6. Reinicie backend

**Vantagens:**
- ✅ Backup automático diário
- ✅ Acesso de qualquer computador
- ✅ Recuperação de desastres
- ✅ Alta disponibilidade

---

## 📝 Resumo Final

### **Seus dados estão seguros porque:**

1. ✅ MongoDB armazena dados **separados** do código
2. ✅ Atualizações substituem **apenas código**, não dados
3. ✅ Scripts de backup automáticos disponíveis
4. ✅ Restauração simples em caso de problema
5. ✅ Possibilidade de usar nuvem (Atlas) para redundância

### **Para garantir 100% de segurança:**

1. 📦 Faça backup ANTES de toda atualização
2. ☁️ Copie backups para nuvem/pen drive
3. 🔄 Configure backup automático diário
4. 📋 Siga o checklist de atualização
5. 🆘 Contate suporte se tiver dúvidas

---

**Última atualização:** 20/12/2025  
**Versão do documento:** 1.0
