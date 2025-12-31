# Sistema Criador de Horário de Aula Escolar
# © 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com
# Script de Restauração do MongoDB

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$DatabaseName = "school-timetable",
    [string]$MongoHost = "localhost",
    [string]$MongoPort = "27017",
    [switch]$Drop
)

Write-Host "`n🔄 Iniciando restauração do banco de dados..." -ForegroundColor Cyan
Write-Host "   Database: $DatabaseName" -ForegroundColor White
Write-Host "   Backup: $BackupFile" -ForegroundColor White

# Verificar se arquivo existe
if (-not (Test-Path $BackupFile)) {
    Write-Host "`n❌ ERRO: Arquivo de backup não encontrado!" -ForegroundColor Red
    Write-Host "   Caminho: $BackupFile" -ForegroundColor Yellow
    exit 1
}

try {
    # Verificar se mongorestore está instalado
    $MongoRestorePath = Get-Command mongorestore -ErrorAction SilentlyContinue
    
    if (-not $MongoRestorePath) {
        Write-Host "`n❌ ERRO: mongorestore não encontrado!" -ForegroundColor Red
        Write-Host "   Instale MongoDB Database Tools:" -ForegroundColor Yellow
        Write-Host "   https://www.mongodb.com/try/download/database-tools" -ForegroundColor Yellow
        exit 1
    }

    # Extrair backup se for ZIP
    $TempDir = $null
    if ($BackupFile -like "*.zip") {
        Write-Host "`n📦 Extraindo backup comprimido..." -ForegroundColor Cyan
        $TempDir = Join-Path $env:TEMP "restore_$(Get-Date -Format 'yyyyMMddHHmmss')"
        Expand-Archive -Path $BackupFile -DestinationPath $TempDir -Force
        $BackupPath = Get-ChildItem -Path $TempDir -Directory | Select-Object -First 1 -ExpandProperty FullName
    } else {
        $BackupPath = $BackupFile
    }

    # Confirmar se deve sobrescrever dados existentes
    if ($Drop) {
        Write-Host "`n⚠️  ATENÇÃO: Modo DROP ativado!" -ForegroundColor Yellow
        Write-Host "   Todos os dados existentes serão APAGADOS!" -ForegroundColor Red
        Write-Host "   Deseja continuar? (S/N): " -NoNewline -ForegroundColor Yellow
        $Confirmation = Read-Host
        
        if ($Confirmation -ne "S" -and $Confirmation -ne "s") {
            Write-Host "`n❌ Restauração cancelada pelo usuário" -ForegroundColor Yellow
            exit 0
        }
    }

    # Executar restauração
    $MongoUri = "mongodb://${MongoHost}:${MongoPort}/"
    $DbPath = Join-Path $BackupPath $DatabaseName
    
    $RestoreArgs = @(
        "--uri=$MongoUri"
        "--db=$DatabaseName"
        "--dir=$DbPath"
        "--quiet"
    )
    
    if ($Drop) {
        $RestoreArgs += "--drop"
    }
    
    & mongorestore $RestoreArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ RESTAURAÇÃO CONCLUÍDA COM SUCESSO!" -ForegroundColor Green
        Write-Host "   Database: $DatabaseName" -ForegroundColor White
        Write-Host "   Servidor: ${MongoHost}:${MongoPort}" -ForegroundColor White
    } else {
        Write-Host "`n❌ ERRO ao executar restauração!" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "`n❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Limpar diretório temporário
    if ($TempDir -and (Test-Path $TempDir)) {
        Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`n✅ Processo concluído!`n" -ForegroundColor Green
