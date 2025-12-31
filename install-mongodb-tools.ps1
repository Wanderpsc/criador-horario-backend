# Script de Instalação do MongoDB Database Tools
# © 2025 Wander Pires Silva Coelho

Write-Host "🔧 Instalador do MongoDB Database Tools" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# URL de download (versão mais recente para Windows)
$version = "100.10.0"
$url = "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-windows-x86_64-$version.zip"
$downloadPath = "$env:TEMP\mongodb-tools.zip"
$extractPath = "C:\Program Files\MongoDB\Tools"

Write-Host "📥 Baixando MongoDB Database Tools v$version..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $url -OutFile $downloadPath -UseBasicParsing
    Write-Host "✅ Download concluído!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao baixar: $_" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Extraindo arquivos..." -ForegroundColor Yellow
try {
    # Criar diretório se não existir
    if (-not (Test-Path $extractPath)) {
        New-Item -ItemType Directory -Path $extractPath -Force | Out-Null
    }
    
    # Extrair ZIP
    Expand-Archive -Path $downloadPath -DestinationPath $extractPath -Force
    
    # Mover arquivos da subpasta para o diretório principal
    $binPath = Get-ChildItem -Path $extractPath -Filter "bin" -Recurse -Directory | Select-Object -First 1
    if ($binPath) {
        $finalBinPath = Join-Path $extractPath "bin"
        if ($binPath.FullName -ne $finalBinPath) {
            if (Test-Path $finalBinPath) {
                Remove-Item $finalBinPath -Recurse -Force
            }
            Move-Item $binPath.FullName $finalBinPath -Force
        }
    }
    
    Write-Host "✅ Extração concluída!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao extrair: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🔧 Adicionando ao PATH do sistema..." -ForegroundColor Yellow
try {
    $binFullPath = Join-Path $extractPath "bin"
    
    # Verificar se já está no PATH
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if ($currentPath -notlike "*$binFullPath*") {
        $newPath = "$currentPath;$binFullPath"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
        
        # Atualizar PATH da sessão atual
        $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
        
        Write-Host "✅ PATH atualizado!" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Já estava no PATH" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠️  Erro ao adicionar ao PATH: $_" -ForegroundColor Yellow
    Write-Host "   Adicione manualmente: $binFullPath" -ForegroundColor Yellow
}

# Limpar arquivo temporário
Remove-Item $downloadPath -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "🎉 Instalação concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "Ferramentas instaladas:" -ForegroundColor Cyan
Write-Host "  • mongodump   - Criar backups" -ForegroundColor White
Write-Host "  • mongorestore - Restaurar backups" -ForegroundColor White
Write-Host "  • mongoexport  - Exportar dados" -ForegroundColor White
Write-Host "  • mongoimport  - Importar dados" -ForegroundColor White
Write-Host ""
Write-Host "📁 Instalado em: $extractPath\bin" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANTE: Reinicie o PowerShell para usar os comandos!" -ForegroundColor Yellow
Write-Host ""

# Verificar instalação
Write-Host "🧪 Testando instalação..." -ForegroundColor Yellow
$mongodumpPath = Join-Path $extractPath "bin\mongodump.exe"
if (Test-Path $mongodumpPath) {
    & $mongodumpPath --version
    Write-Host ""
    Write-Host "✅ MongoDB Database Tools instalado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro: mongodump não encontrado" -ForegroundColor Red
}

Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Reinicie o PowerShell" -ForegroundColor White
Write-Host "2. Reinicie o backend do sistema" -ForegroundColor White
Write-Host "3. Faça login com uma escola" -ForegroundColor White
Write-Host "4. O backup será criado automaticamente!" -ForegroundColor White
Write-Host ""
