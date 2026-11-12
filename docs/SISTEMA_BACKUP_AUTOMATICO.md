# Sistema de Backup Automático
**Sistema Criador de Horário de Aula Escolar**  
© 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com

---

## 📋 Visão Geral

O sistema agora possui **backup automático** que garante a segurança dos dados dos clientes. A cada novo login, um backup completo do banco de dados é criado automaticamente e fica disponível para o administrador gerenciar e restaurar quando necessário.

---

## ✨ Funcionalidades Implementadas

### 1. **Backup Automático no Login** 🔄
- ✅ A cada login de um cliente (não admin), um backup é criado automaticamente
- ✅ Processo roda em **background** sem atrasar o login
- ✅ Mantém automaticamente os **últimos 5 backups** de cada cliente
- ✅ Backups antigos são deletados automaticamente

### 2. **Painel Administrativo de Backups** 🎛️
- ✅ Interface visual moderna com estatísticas em tempo real
- ✅ Visualização de todos os backups do sistema
- ✅ Filtros por status: Todos, Concluídos, Pendentes, Falhas, Restaurados
- ✅ Informações detalhadas: Data, Cliente, Tamanho, Tipo, Status

### 3. **Restauração Prática** ⚡
- ✅ Botão "Restaurar" para backups concluídos
- ✅ Confirmação de segurança antes de restaurar
- ✅ Restauração completa do banco de dados
- ✅ Histórico de restaurações (quem e quando)

### 4. **Backup Manual** 👤
- ✅ Administrador pode criar backups manuais a qualquer momento
- ✅ Útil antes de operações críticas
- ✅ Identificação clara: 🤖 Automático ou 👤 Manual

### 5. **Gerenciamento Inteligente** 🧠
- ✅ Cálculo automático do tamanho dos backups
- ✅ Limpeza automática de backups antigos
- ✅ Estatísticas: Total, Concluídos, Pendentes, Falhas, Espaço usado
- ✅ Deletar backups individuais quando necessário

---

## 🏗️ Arquitetura Técnica

### Backend

#### **Modelo de Dados** (`Backup.ts`)
```typescript
interface IBackup {
  userId: ObjectId;           // Dono do backup
  schoolId?: ObjectId;        // Escola associada
  schoolName: string;         // Nome da escola
  fileName: string;           // Nome único do arquivo
  filePath: string;           // Caminho físico no servidor
  size: number;               // Tamanho em bytes
  sizeFormatted: string;      // Ex: "10.5 MB"
  type: 'automatic' | 'manual';
  status: 'pending' | 'completed' | 'failed' | 'restored';
  createdAt: Date;
  restoredAt?: Date;
  restoredBy?: ObjectId;
  error?: string;
  metadata: {
    loginCount?: number;
    collections?: string[];
    documentsCount?: number;
  };
}
```

#### **Serviço de Backup** (`auto-backup.service.ts`)

**Principais Métodos:**

1. **`createLoginBackup(userId)`**
   - Chamado automaticamente no endpoint de login
   - Cria backup em background (não bloqueia resposta)
   - Gera nome único com timestamp
   - Salva metadados no banco

2. **`performBackup(backupId, path)`**
   - Executa `mongodump` programaticamente
   - Calcula tamanho do backup
   - Atualiza status para "completed" ou "failed"
   - Chama limpeza automática

3. **`restoreBackup(backupId, adminUserId)`**
   - Executa `mongorestore` com `--drop` (sobrescreve dados)
   - Registra quem e quando restaurou
   - Atualiza status para "restored"

4. **`cleanOldBackups(currentBackupId)`**
   - Mantém apenas os últimos 5 backups por usuário
   - Deleta arquivos físicos e registros do banco

5. **`listBackups(filters)`**
   - Lista backups com filtros (userId, status, limit)
   - Popula dados de usuário e restaurador

6. **`getStatistics()`**
   - Retorna estatísticas gerais do sistema
   - Total, concluídos, falhas, pendentes, espaço usado

#### **Rotas** (`backup.routes.ts`)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| GET | `/api/backups` | Lista backups | Admin/Cliente |
| GET | `/api/backups/statistics` | Estatísticas gerais | Admin |
| GET | `/api/backups/:id` | Detalhes de um backup | Admin/Dono |
| POST | `/api/backups/restore/:id` | Restaura backup | Admin |
| POST | `/api/backups/manual` | Cria backup manual | Admin/Cliente |
| DELETE | `/api/backups/:id` | Deleta backup | Admin |

#### **Integração no Login** (`auth.routes.ts`)
```typescript
// Após login bem-sucedido
if (user.role !== 'admin') {
  AutoBackupService.createLoginBackup(user._id.toString())
    .catch(err => console.error('Erro ao criar backup:', err));
}
```

### Frontend

#### **Página de Gerenciamento** (`BackupManagement.tsx`)

**Componentes Visuais:**

1. **Header com Estatísticas**
   - Design moderno com gradiente azul→roxo→rosa
   - 5 cards com estatísticas em tempo real
   - Botão "Criar Backup Manual"

2. **Filtros por Status**
   - Botões: Todos, Concluídos, Pendentes, Falhas, Restaurados
   - Botão "Atualizar" para refresh manual

3. **Tabela de Backups**
   - Colunas: Status, Cliente/Escola, Data/Hora, Tamanho, Tipo, Ações
   - Ícones coloridos por status
   - Badges visuais para tipo e status

4. **Ações Disponíveis**
   - **Restaurar**: Botão azul, apenas para backups concluídos
   - **Deletar**: Botão vermelho, confirmação obrigatória

5. **Alert Informativo**
   - Painel azul com instruções sobre o sistema
   - Lista de features e avisos importantes

**Estados de Status:**
- ✅ **Concluído** (verde): Backup pronto para restauração
- ⏳ **Processando** (amarelo): Backup em andamento
- ❌ **Falhou** (vermelho): Erro no backup
- 🔄 **Restaurado** (azul): Já foi restaurado

---

## 🚀 Como Usar

### Para o Cliente:
1. ✅ **Faça login normalmente** - O backup é criado automaticamente
2. ✅ **Continue usando o sistema** - Processo é transparente
3. ✅ **Seus dados estão seguros** - Últimos 5 backups sempre disponíveis

### Para o Administrador:

#### **Acessar Painel de Backups**
1. Login como admin
2. Menu lateral → **🔐 PAINEL ADMINISTRATIVO** → **Backups**

#### **Visualizar Backups**
- Veja estatísticas gerais no topo
- Use filtros para buscar backups específicos
- Clique em "Atualizar" para refresh

#### **Criar Backup Manual**
1. Clique em **"Criar Backup Manual"**
2. Aguarde 5-10 segundos
3. Backup aparecerá na lista

#### **Restaurar Backup**
⚠️ **ATENÇÃO: Esta ação sobrescreve TODOS os dados atuais!**

1. Localize o backup desejado (status: Concluído)
2. Clique em **"Restaurar"**
3. Confirme a ação no popup
4. Aguarde conclusão (pode levar alguns minutos)
5. Sistema será restaurado ao estado do backup

#### **Deletar Backup**
1. Clique em **"Deletar"** no backup desejado
2. Confirme a ação
3. Arquivo e registro serão removidos permanentemente

---

## 🔧 Requisitos Técnicos

### Dependências do Sistema
- **MongoDB Database Tools** instalado no servidor
  - `mongodump`: Para criar backups
  - `mongorestore`: Para restaurar backups
  - Download: https://www.mongodb.com/try/download/database-tools

### Permissões Necessárias
- Acesso de escrita na pasta `/backend/backups`
- Permissões para executar comandos `mongodump` e `mongorestore`
- Conexão com MongoDB (URI configurada)

### Espaço em Disco
- Cada backup ocupa ~5-50 MB dependendo dos dados
- Sistema mantém 5 backups por cliente
- Limpeza automática gerencia espaço

---

## ⚙️ Configuração

### Variáveis de Ambiente
```env
MONGODB_URI=mongodb://localhost:27017/school-timetable
# ou
MONGODB_URI=mongodb+srv://<usuario>:<senha>@<cluster>.mongodb.net/<banco>
```

### Diretório de Backups
```
backend/
  ├── backups/                    # Criado automaticamente
  │   ├── backup_escola1_...      # Pasta de backup 1
  │   ├── backup_escola2_...      # Pasta de backup 2
  │   └── ...
```

---

## 📊 Estatísticas do Painel

O painel mostra em tempo real:

- **Total**: Número total de backups no sistema
- **Concluídos**: Backups prontos para restauração
- **Pendentes**: Backups em processamento
- **Falhas**: Backups que falharam
- **Espaço**: Espaço total ocupado pelos backups

---

## 🔒 Segurança

### Controle de Acesso
- ✅ Clientes veem apenas seus próprios backups
- ✅ Apenas admin pode restaurar backups
- ✅ Apenas admin pode deletar backups
- ✅ Confirmação obrigatória para ações críticas

### Proteção de Dados
- ✅ Backups armazenados localmente no servidor
- ✅ Metadados registrados no banco de dados
- ✅ Histórico de restaurações rastreado
- ✅ Limpeza automática evita acúmulo excessivo

---

## 🐛 Troubleshooting

### Backup fica "Pendente" indefinidamente
**Causa**: `mongodump` não está instalado ou não está no PATH  
**Solução**: Instale MongoDB Database Tools

### Erro ao restaurar
**Causa**: Backup corrompido ou MongoDB desconectado  
**Solução**: Verifique logs do backend, conexão com MongoDB

### Backups muito grandes
**Causa**: Muitos dados acumulados  
**Solução**: Normal, backups crescem com o uso. Sistema gerencia automaticamente.

### Não consigo deletar backup
**Causa**: Apenas admin tem permissão  
**Solução**: Faça login como administrador

---

## 📝 Logs e Monitoramento

O sistema registra no console:

```
[AutoBackup] Iniciando backup para usuário 123456
[AutoBackup] Executando mongodump para /path/to/backup
[AutoBackup] Backup concluído: 10.5 MB
[AutoBackup] 2 backups antigos removidos
```

Verifique logs em caso de problemas:
```bash
# Backend logs
cd backend
npm start
# Observe mensagens [AutoBackup]
```

---

## 🎯 Benefícios para o Cliente

1. **Tranquilidade** 💚
   - Dados sempre protegidos automaticamente
   - Backup a cada login sem esforço

2. **Recuperação Rápida** ⚡
   - Admin pode restaurar dados em minutos
   - Até 5 pontos de restauração disponíveis

3. **Sem Preocupação** 😌
   - Sistema gerencia tudo automaticamente
   - Limpeza automática de backups antigos

4. **Profissionalismo** 🏆
   - Demonstra compromisso com segurança
   - Diferencial competitivo

---

## 📞 Suporte

Em caso de dúvidas ou problemas:

**Desenvolvedor**: Wander Pires Silva Coelho  
**E-mail**: wanderpsc@gmail.com  
**Sistema**: Criador de Horário de Aula Escolar  
**Versão**: 2.0 com Backup Automático

---

## ✅ Checklist de Implementação

- [x] Modelo Backup no banco de dados
- [x] Serviço AutoBackupService
- [x] Integração no endpoint de login
- [x] Rotas de gerenciamento (GET, POST, DELETE)
- [x] Página BackupManagement.tsx
- [x] Link no menu administrativo
- [x] Testes de compilação
- [x] Sistema funcional e rodando

---

## 🔮 Melhorias Futuras

Possíveis expansões:

1. **Download de Backups**
   - Permitir admin baixar backups como ZIP
   
2. **Backup Agendado**
   - Criar backups em horários específicos (cron job)

3. **Backup Diferencial**
   - Apenas mudanças desde o último backup

4. **Compressão**
   - Compactar backups para economizar espaço

5. **Cloud Storage**
   - Enviar backups para AWS S3 / Google Cloud

6. **Notificações**
   - Alertar admin quando backup falha

---

**Sistema implementado e pronto para uso! 🎉**
