# Script para instalar MongoDB Database Tools no drive E:
# © 2025 Wander Pires Silva Coelho

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Instalador MongoDB Database Tools" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot
$installDir = "$projectRoot\mongodb-tools"
$downloadUrl = "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-windows-x86_64-100.9.5.zip"
$zipFile = "$projectRoot\mongodb-tools.zip"

try {
    # Criar diretório
    Write-Host "✓ Criando diretório: $installDir" -ForegroundColor Green
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null

    # Baixar
    Write-Host "⬇ Baixando MongoDB Database Tools..." -ForegroundColor Yellow
    Write-Host "  URL: $downloadUrl" -ForegroundColor Gray
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile -UseBasicParsing
    Write-Host "✓ Download concluído" -ForegroundColor Green

    # Extrair
    Write-Host "📦 Extraindo arquivos..." -ForegroundColor Yellow
    $tempExtractDir = "$projectRoot\temp-extract"
    Expand-Archive -Path $zipFile -DestinationPath $tempExtractDir -Force
    
    # Mover arquivos para pasta correta
    $extractedFolder = Get-ChildItem $tempExtractDir -Directory | Where-Object { $_.Name -like "mongodb-database-tools*" } | Select-Object -First 1
    if ($extractedFolder) {
        Get-ChildItem -Path "$($extractedFolder.FullName)\bin" | Move-Item -Destination $installDir -Force
        Remove-Item -Path $tempExtractDir -Recurse -Force
    }
    
    Write-Host "✓ Arquivos extraídos em: $installDir" -ForegroundColor Green

    # Adicionar ao PATH
    Write-Host "🔧 Configurando PATH..." -ForegroundColor Yellow
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -notlike "*$installDir*") {
        $newPath = $currentPath + ";$installDir"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        $env:Path += ";$installDir"
        Write-Host "✓ PATH configurado" -ForegroundColor Green
    } else {
        Write-Host "✓ PATH já estava configurado" -ForegroundColor Green
    }

    # Limpar
    Remove-Item -Path $zipFile -Force -ErrorAction SilentlyContinue

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  ✓ INSTALAÇÃO CONCLUÍDA COM SUCESSO!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "Instalado em: $installDir" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠ IMPORTANTE: Feche e abra novamente o PowerShell" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Após reabrir, teste com:" -ForegroundColor White
    Write-Host "  mongodump --version" -ForegroundColor Cyan
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "❌ ERRO: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}
