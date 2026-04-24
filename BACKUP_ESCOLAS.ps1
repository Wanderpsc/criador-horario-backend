# ============================================================
# BACKUP AUTOMÁTICO DE DADOS — EduSync PRO
# © 2025 Wander Pires Silva Coelho
# ============================================================
#
# Como usar:
#   .\BACKUP_ESCOLAS.ps1              → backup imediato
#   .\BACKUP_ESCOLAS.ps1 -Agendar    → configura agendamento diário automático
#   .\BACKUP_ESCOLAS.ps1 -RemoverAgendamento → remove o agendamento
#
# Parâmetros:
Param(
  [switch]$Agendar,
  [switch]$RemoverAgendamento
)

$PROJETO = "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO 2\CRIADOR DE HORÁRIO DE AULA"
$BACKEND  = Join-Path $PROJETO "backend"
$ENV_FILE = Join-Path $BACKEND ".env"
$SCRIPT   = Join-Path $BACKEND "src\scripts\backupAllSchools.ts"
$BACKUP_ROOT = Join-Path $PROJETO "backups-escolas"
$TASK_NAME = "EduSync_Backup_Diario"

# ─── Função: banner ──────────────────────────────────────────────────────────
function Banner {
  Write-Host ""
  Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
  Write-Host "║   EduSync PRO — Backup Automático de Dados              ║" -ForegroundColor Cyan
  Write-Host "║   © 2025 Wander Pires Silva Coelho                      ║" -ForegroundColor Cyan
  Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
  Write-Host ""
}

# ─── Função: verificar pré-requisitos ───────────────────────────────────────
function Check-Prerequisites {
  if (-not (Test-Path $ENV_FILE)) {
    Write-Host "❌ Arquivo .env não encontrado em: $ENV_FILE" -ForegroundColor Red
    Write-Host "   Verifique se o backend está configurado corretamente." -ForegroundColor Yellow
    exit 1
  }

  $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
  if (-not $nodeCheck) {
    Write-Host "❌ Node.js não encontrado. Instale em: https://nodejs.org" -ForegroundColor Red
    exit 1
  }

  $tsNodeCheck = Get-Command npx -ErrorAction SilentlyContinue
  if (-not $tsNodeCheck) {
    Write-Host "❌ npx não encontrado. Reinstale o Node.js." -ForegroundColor Red
    exit 1
  }

  Write-Host "✅ Pré-requisitos verificados" -ForegroundColor Green
}

# ─── Função: executar backup ─────────────────────────────────────────────────
function Run-Backup {
  Banner
  Check-Prerequisites

  $dataHora = Get-Date -Format "dd/MM/yyyy HH:mm:ss"
  Write-Host "⏰ Iniciando backup em: $dataHora" -ForegroundColor White
  Write-Host "📁 Destino: $BACKUP_ROOT" -ForegroundColor White
  Write-Host ""

  # Criar pasta de backups se não existir
  if (-not (Test-Path $BACKUP_ROOT)) {
    New-Item -ItemType Directory -Path $BACKUP_ROOT -Force | Out-Null
    Write-Host "📁 Pasta de backups criada: $BACKUP_ROOT" -ForegroundColor Green
  }

  # Executar o script TypeScript
  Push-Location $BACKEND
  try {
    $env:NODE_ENV = "backup"
    npx ts-node --project tsconfig.json $SCRIPT
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
      Write-Host ""
      Write-Host "✅ Backup concluído com sucesso!" -ForegroundColor Green

      # Abrir pasta de backups no Explorer
      $abrirPasta = Read-Host "Deseja abrir a pasta de backups? (S/N)"
      if ($abrirPasta -eq "S" -or $abrirPasta -eq "s") {
        Start-Process explorer.exe $BACKUP_ROOT
      }
    } else {
      Write-Host ""
      Write-Host "❌ Erro durante o backup (código: $exitCode)" -ForegroundColor Red
    }
  } catch {
    Write-Host "❌ Exceção: $_" -ForegroundColor Red
  } finally {
    Pop-Location
  }
}

# ─── Função: agendar backup diário ──────────────────────────────────────────
function Schedule-Backup {
  Banner
  Write-Host "📅 Configurando agendamento diário do backup..." -ForegroundColor Cyan
  Write-Host ""

  $hora = Read-Host "Qual horário diário para o backup? (ex: 06:00)"
  if (-not $hora) { $hora = "06:00" }

  $psExe  = (Get-Command powershell.exe).Source
  $scriptPath = $PSCommandPath  # este próprio arquivo

  $action  = New-ScheduledTaskAction -Execute $psExe -Argument "-NonInteractive -NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
  $trigger = New-ScheduledTaskTrigger -Daily -At $hora
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable:$false -ExecutionTimeLimit (New-TimeSpan -Hours 2)
  $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

  try {
    # Remover tarefa anterior se existir
    Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false -ErrorAction SilentlyContinue

    Register-ScheduledTask `
      -TaskName  $TASK_NAME `
      -Action    $action `
      -Trigger   $trigger `
      -Settings  $settings `
      -Principal $principal `
      -Description "Backup diário automático do EduSync PRO — todas as escolas" `
      -Force | Out-Null

    Write-Host "✅ Agendamento criado com sucesso!" -ForegroundColor Green
    Write-Host "   Tarefa: $TASK_NAME" -ForegroundColor White
    Write-Host "   Horário: $hora todos os dias" -ForegroundColor White
    Write-Host "   Destino: $BACKUP_ROOT" -ForegroundColor White
    Write-Host ""
    Write-Host "ℹ️  Para ver no Agendador de Tarefas: taskschd.msc" -ForegroundColor Yellow
  } catch {
    Write-Host "❌ Erro ao criar agendamento: $_" -ForegroundColor Red
    Write-Host "   Tente executar o PowerShell como Administrador." -ForegroundColor Yellow
  }
}

# ─── Função: remover agendamento ─────────────────────────────────────────────
function Remove-Schedule {
  Banner
  Write-Host "🗑️  Removendo agendamento '$TASK_NAME'..." -ForegroundColor Yellow

  try {
    Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false -ErrorAction Stop
    Write-Host "✅ Agendamento removido com sucesso!" -ForegroundColor Green
  } catch {
    Write-Host "⚠️  Agendamento não encontrado ou já removido." -ForegroundColor Yellow
  }
}

# ─── Ponto de entrada ────────────────────────────────────────────────────────
if ($Agendar) {
  Schedule-Backup
} elseif ($RemoverAgendamento) {
  Remove-Schedule
} else {
  Run-Backup
}
