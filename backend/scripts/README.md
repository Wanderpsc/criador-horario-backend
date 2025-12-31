# Quick Start - Procedimento de Backup

## Fazer Backup AGORA

```powershell
# 1. Abra PowerShell e navegue até os scripts
cd "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\backend\scripts"

# 2. Execute o backup
.\backup-database.ps1

# 3. Verifique o backup criado
Get-ChildItem ..\backups\mongodb\*.zip | Sort-Object CreationTime -Descending | Select-Object -First 5
```

## Restaurar Backup

```powershell
# Liste os backups disponíveis
Get-ChildItem ..\backups\mongodb\*.zip | Format-Table Name, CreationTime, @{L='Tamanho (MB)';E={[math]::Round($_.Length/1MB,2)}}

# Restaure o backup desejado (substitua o nome do arquivo)
.\restore-database.ps1 -BackupFile "..\backups\mongodb\school-timetable_YYYYMMDD_HHMMSS.zip"
```

## Backup Antes de Atualizar

**SEMPRE execute antes de qualquer atualização:**

```powershell
.\backup-database.ps1
```

## Onde Ficam os Backups?

- **Local**: `backend/backups/mongodb/`
- **Formato**: `school-timetable_YYYYMMDD_HHMMSS.zip`
- **Retenção**: Últimos 10 backups (automático)

## Backup para Nuvem

**IMPORTANTE**: Copie os arquivos ZIP para:
- Google Drive
- OneDrive
- Dropbox
- Email para você mesmo

**NÃO confie apenas em backups locais!**

## MongoDB Database Tools

Se aparecer erro "mongodump não encontrado":

1. Baixe: https://www.mongodb.com/try/download/database-tools
2. Instale o MongoDB Database Tools
3. Reinicie PowerShell
4. Execute o script novamente

---

Para mais detalhes, consulte: **[PROCEDIMENTO_ATUALIZACAO.md](../PROCEDIMENTO_ATUALIZACAO.md)**
