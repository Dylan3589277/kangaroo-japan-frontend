param(
  [string]$BackendPath = (Join-Path $PSScriptRoot "..\..\kangaroo-japan-backend"),
  [string]$EnvFile = (Join-Path $PSScriptRoot "..\.env.production-smoke.local"),
  [switch]$NoDeploy
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function New-Secret([int]$Bytes = 32) {
  $buffer = New-Object byte[] $Bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($buffer)
  }
  finally {
    $rng.Dispose()
  }
  return [Convert]::ToBase64String($buffer).TrimEnd("=").Replace("+", "A").Replace("/", "B")
}

function Invoke-VercelEnvSet([string]$Name, [string]$Value) {
  Push-Location $BackendPath
  try {
    & npx vercel env update $Name production --value $Value --yes
    if ($LASTEXITCODE -ne 0) {
      & npx vercel env add $Name production --value $Value --yes --force
    }
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to set Vercel env $Name"
    }
  }
  finally {
    Pop-Location
  }
}

if (-not (Test-Path $BackendPath)) {
  throw "Backend path not found: $BackendPath"
}

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$values = [ordered]@{
  E2E_ADMIN_EMAIL = "e2e-admin+$timestamp@kangaroo-japan.local"
  E2E_ADMIN_PASSWORD = "Kj!" + (New-Secret 28)
  E2E_ADMIN_SEED_SECRET = New-Secret 36
  E2E_ADMIN_NAME = "Kangaroo Japan E2E Admin"
}

foreach ($key in $values.Keys) {
  Invoke-VercelEnvSet $key $values[$key]
}

$envLines = @(
  "# Local-only production smoke credentials. Do not commit.",
  "# Generated: $(Get-Date -Format o)",
  "E2E_ADMIN_EMAIL=$($values.E2E_ADMIN_EMAIL)",
  "E2E_ADMIN_PASSWORD=$($values.E2E_ADMIN_PASSWORD)",
  "E2E_ADMIN_SEED_SECRET=$($values.E2E_ADMIN_SEED_SECRET)",
  "E2E_ADMIN_NAME=$($values.E2E_ADMIN_NAME)"
)

$envPath = [System.IO.Path]::GetFullPath($EnvFile)
$encoding = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($envPath, ($envLines -join [Environment]::NewLine) + [Environment]::NewLine, $encoding)

if (-not $NoDeploy) {
  Push-Location $BackendPath
  try {
    & npx vercel deploy --prod --yes
    if ($LASTEXITCODE -ne 0) {
      throw "Backend production redeploy failed"
    }
  }
  finally {
    Pop-Location
  }
}

Write-Output "Production smoke env is ready. Local env file: $envPath"
Write-Output "Secrets were not printed. Backend redeploy skipped: $($NoDeploy.IsPresent)"
