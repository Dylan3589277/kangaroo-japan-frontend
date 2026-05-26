param(
  [string]$EnvFile = (Join-Path $PSScriptRoot "..\.env.production-smoke.local"),
  [string]$ArtifactDir = "",
  [switch]$AllowAdminSkip,
  [switch]$StrictDsrReadonlySmoke
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Import-DotEnv([string]$Path) {
  if (-not (Test-Path $Path)) {
    throw "Env file not found: $Path. Run scripts\setup-production-smoke-env.ps1 first."
  }

  foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
    $clean = $line.TrimStart([char]0xFEFF).Trim()
    if (-not $clean -or $clean.StartsWith("#")) {
      continue
    }
    $index = $clean.IndexOf("=")
    if ($index -lt 1) {
      continue
    }
    $name = $clean.Substring(0, $index).Trim()
    $value = $clean.Substring($index + 1).Trim()
    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

Import-DotEnv ([System.IO.Path]::GetFullPath($EnvFile))

$missing = @(@(
  "E2E_ADMIN_EMAIL",
  "E2E_ADMIN_PASSWORD",
  "E2E_ADMIN_SEED_SECRET"
) | Where-Object {
  -not [Environment]::GetEnvironmentVariable($_, "Process")
})

if ($missing.Count -gt 0 -and -not $AllowAdminSkip) {
  throw "Missing required production smoke env: $($missing -join ', ')"
}

if ($StrictDsrReadonlySmoke) {
  [Environment]::SetEnvironmentVariable("STRICT_DSR_READONLY_SMOKE", "1", "Process")
  if (-not [Environment]::GetEnvironmentVariable("DSR_LEGACY_SMOKE_ORDER_ID", "Process")) {
    throw "Missing DSR_LEGACY_SMOKE_ORDER_ID. Strict DSR readonly smoke needs a real legacy order id for detail checks."
  }
}
else {
  [Environment]::SetEnvironmentVariable("STRICT_DSR_READONLY_SMOKE", $null, "Process")
}

if (-not $ArtifactDir) {
  $stamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
  $ArtifactDir = Join-Path $env:USERPROFILE ".team\artifacts\prod-smoke-$stamp"
}
[Environment]::SetEnvironmentVariable("PROD_SMOKE_ARTIFACT_DIR", $ArtifactDir, "Process")

Write-Output "Running production smoke. Artifact dir: $ArtifactDir"
Write-Output "E2E admin env present: $($missing.Count -eq 0)"
Write-Output "Strict DSR readonly smoke: $($StrictDsrReadonlySmoke.IsPresent)"

Push-Location (Join-Path $PSScriptRoot "..")
try {
  & npx playwright test --config=playwright.production.config.ts
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
