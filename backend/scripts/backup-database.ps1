# Sistema Criador de Horário de Aula Escolar
# © 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com
# Script de Backup Automático do MongoDB

param(
    [string]$BackupPath = "..\backups\mongodb",
    [string]$DatabaseName = "school-timetable",
    [string]$MongoHost = "localhost",
    [string]$MongoPort = "27017"
)

# Criar diretório de backup se não existir
$BackupDir = Join-Path $PSScriptRoot $BackupPath
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "✅ Diretório de backup criado: $BackupDir" -ForegroundColor Green
}

# Data e hora para nome do arquivo
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupName = "${DatabaseName}_${Timestamp}"
$BackupFullPath = Join-Path $BackupDir $BackupName

Write-Host "`n🔄 Iniciando backup do banco de dados..." -ForegroundColor Cyan
Write-Host "   Database: $DatabaseName" -ForegroundColor White
Write-Host "   Destino: $BackupFullPath" -ForegroundColor White

try {
    # Verificar se mongodump está instalado
    $MongoDumpPath = Get-Command mongodump -ErrorAction SilentlyContinue
    
    if (-not $MongoDumpPath) {
        Write-Host "`n❌ ERRO: mongodump não encontrado!" -ForegroundColor Red
        Write-Host "   Instale MongoDB Database Tools:" -ForegroundColor Yellow
        Write-Host "   https://www.mongodb.com/try/download/database-tools" -ForegroundColor Yellow
        exit 1
    }

    # Executar backup
    $MongoUri = "mongodb://${MongoHost}:${MongoPort}/${DatabaseName}"
    
    & mongodump --uri=$MongoUri --out=$BackupFullPath --quiet
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ BACKUP CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
        Write-Host "   Local: $BackupFullPath" -ForegroundColor White
        
        # Calcular tamanho do backup
        $BackupSize = (Get-ChildItem -Path $BackupFullPath -Recurse | Measure-Object -Property Length -Sum).Sum
        $BackupSizeMB = [math]::Round($BackupSize / 1MB, 2)
        Write-Host "   Tamanho: ${BackupSizeMB} MB" -ForegroundColor White
        
        # Comprimir backup em ZIP
        $ZipPath = "${BackupFullPath}.zip"
        Compress-Archive -Path $BackupFullPath -DestinationPath $ZipPath -Force
        Write-Host "   Comprimido: ${BackupName}.zip" -ForegroundColor White
        
        # Remover pasta descomprimida
        Remove-Item -Path $BackupFullPath -Recurse -Force
        
        # Limpar backups antigos (manter últimos 10)
        Write-Host "`n🧹 Limpando backups antigos..." -ForegroundColor Cyan
        $OldBackups = Get-ChildItem -Path $BackupDir -Filter "*.zip" | 
                      Sort-Object CreationTime -Descending | 
                      Select-Object -Skip 10
        
        if ($OldBackups) {
            foreach ($OldBackup in $OldBackups) {
                Remove-Item $OldBackup.FullName -Force
                Write-Host "   Removido: $($OldBackup.Name)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   Nenhum backup antigo para remover" -ForegroundColor White
        }
        
        Write-Host "`n📌 IMPORTANTE: Guarde este backup em local seguro!" -ForegroundColor Yellow
        Write-Host "   Copie para: Nuvem (Google Drive, OneDrive, etc.)" -ForegroundColor Yellow
        
    } else {
        Write-Host "`n❌ ERRO ao executar backup!" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "`n❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Processo concluído!`n" -ForegroundColor Green
