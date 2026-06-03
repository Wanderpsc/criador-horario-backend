# Script de Backup: E: -> D:
# Execute este script diretamente no PowerShell (fora do VS Code)
# Clique com botão direito no arquivo e escolha "Executar com PowerShell"

$src = "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO 2\CRIADOR DE HORÁRIO DE AULA"
$dst = "D:\MEUS PROJETOS DE PROGRAMAÇÃO 2\CRIADOR DE HORÁRIO DE AULA"

Write-Host "Verificando drive D:..." -ForegroundColor Cyan
if (!(Test-Path "D:\")) {
    Write-Host "ERRO: Drive D: nao encontrado!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host "Drive D: encontrado. Iniciando backup..." -ForegroundColor Green
Write-Host "Origem:  $src" -ForegroundColor Yellow
Write-Host "Destino: $dst" -ForegroundColor Yellow
Write-Host ""

$files = Get-ChildItem -Path $src -Recurse -File | Where-Object {
    $_.FullName -notmatch '\\node_modules\\' -and
    $_.FullName -notmatch '\\dist\\' -and
    $_.FullName -notmatch '\\.git\\' -and
    $_.Extension -ne '.log'
}

$total = $files.Count
$count = 0
$errors = 0

Write-Host "Total de arquivos a copiar: $total" -ForegroundColor Cyan
Write-Host ""

foreach ($f in $files) {
    $target = $f.FullName.Replace($src, $dst)
    $dir = Split-Path $target
    try {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
        Copy-Item $f.FullName $target -Force
        $count++
        if ($count % 50 -eq 0) {
            Write-Host "  Copiados: $count / $total..." -ForegroundColor Gray
        }
    } catch {
        $errors++
        Write-Host "  ERRO: $($f.FullName)" -ForegroundColor Red
    }
}

Write-Host ""
if ($errors -eq 0) {
    Write-Host "BACKUP CONCLUIDO COM SUCESSO!" -ForegroundColor Green
} else {
    Write-Host "BACKUP CONCLUIDO COM $errors ERROS" -ForegroundColor Yellow
}
Write-Host "Arquivos copiados: $count de $total" -ForegroundColor Cyan
Write-Host "Destino: $dst" -ForegroundColor Cyan
Write-Host ""
Read-Host "Pressione Enter para sair"
