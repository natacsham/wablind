param(
  [int]$FrontendPort = 4173,
  [int]$ApiPort = 3001
)

$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$api = $null
$frontend = $null
$taskPreviousPort = $env:PORT
Push-Location -LiteralPath $taskRoot
try {
  # Build this checkout first: do not silently serve an older compiled version.
  & pnpm build
  if ($LASTEXITCODE -ne 0) { throw 'A compilação falhou. Nenhuma prévia antiga foi iniciada.' }
  $env:PORT = "$ApiPort"
  $api = Start-Process -FilePath 'node' -ArgumentList '--env-file-if-exists=.env', 'dist-server/index.js' -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru
  $frontend = Start-Process -FilePath 'node' -ArgumentList 'node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', "$FrontendPort", '--strictPort' -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru
  Write-Host "Abra: http://127.0.0.1:$FrontendPort/wablind/"
  Write-Host "Saúde da API: http://127.0.0.1:$ApiPort/health — sem .env, somente a demonstração local funciona."
  Write-Host 'Pressione Ctrl+C para encerrar apenas os processos iniciados por este script.'
  while ($true) { Start-Sleep -Seconds 1 }
} finally {
  if ($frontend -and -not $frontend.HasExited) { Stop-Process -Id $frontend.Id }
  if ($api -and -not $api.HasExited) { Stop-Process -Id $api.Id }
  $env:PORT = $taskPreviousPort
  Pop-Location
}
