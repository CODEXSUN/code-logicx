$ErrorActionPreference = "Stop"

& npm.cmd run dependencies:check
if ($LASTEXITCODE -ne 0) {
  throw "The repository artifact layout check failed with exit code $LASTEXITCODE."
}

$keyPath = Join-Path $env:USERPROFILE ".tauri\codelogicx-desktop-v2.key"
$passwordPath = Join-Path $env:USERPROFILE ".tauri\codelogicx-desktop-v2-key-password.clixml"

if (-not (Test-Path -LiteralPath $keyPath)) {
  $keyPath = Join-Path $env:USERPROFILE ".tauri\codelogicx-desktop-v2.key"
}
if (-not (Test-Path -LiteralPath $passwordPath)) {
  $passwordPath = Join-Path $env:USERPROFILE ".tauri\codelogicx-desktop-v2-key-password.clixml"
}

if (-not (Test-Path -LiteralPath $keyPath)) {
  throw "The desktop updater private key is missing: $keyPath"
}

if (-not (Test-Path -LiteralPath $passwordPath)) {
  throw "The desktop updater key password is missing: $passwordPath"
}

$securePassword = Import-Clixml -LiteralPath $passwordPath
$credential = [PSCredential]::new("desktop-release", $securePassword)
$signingConfigPath = $null
$importedCertificate = $null

try {
  $env:TAURI_SIGNING_PRIVATE_KEY = $keyPath
  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $credential.GetNetworkCredential().Password

  $certificateThumbprint = $env:CODELOGICX_WINDOWS_CERTIFICATE_THUMBPRINT
  $certificatePath = $env:CODELOGICX_WINDOWS_CERTIFICATE_PATH
  if ($certificatePath) {
    if (-not (Test-Path -LiteralPath $certificatePath)) {
      throw "The Windows code-signing certificate is missing: $certificatePath"
    }
    if (-not $env:CODELOGICX_WINDOWS_CERTIFICATE_PASSWORD) {
      throw "CODELOGICX_WINDOWS_CERTIFICATE_PASSWORD is required for the PFX certificate."
    }
    $certificatePassword = ConvertTo-SecureString $env:CODELOGICX_WINDOWS_CERTIFICATE_PASSWORD -AsPlainText -Force
    $importedCertificate = Import-PfxCertificate -FilePath $certificatePath -CertStoreLocation Cert:\CurrentUser\My -Password $certificatePassword
    $certificateThumbprint = $importedCertificate.Thumbprint
  }

  $buildArguments = @("run", "tauri:build", "--workspace", "@codelogicx/desktop")
  if ($certificateThumbprint) {
    $certificate = Get-Item -LiteralPath "Cert:\CurrentUser\My\$certificateThumbprint" -ErrorAction Stop
    $hasCodeSigningUsage = $certificate.EnhancedKeyUsageList.ObjectId.Value -contains "1.3.6.1.5.5.7.3.3"
    if (-not $certificate.HasPrivateKey -or -not $hasCodeSigningUsage) {
      throw "The selected certificate is not a usable code-signing certificate."
    }
    $signingConfigPath = Join-Path ([System.IO.Path]::GetTempPath()) "codelogicx-tauri-signing-$PID.json"
    $signingConfig = @{
      bundle = @{
        windows = @{
          certificateThumbprint = $certificateThumbprint
          digestAlgorithm = "sha256"
          timestampUrl = "http://timestamp.digicert.com"
        }
      }
    }
    $signingConfig | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $signingConfigPath -Encoding utf8
    $buildArguments += @("--", "--config", $signingConfigPath)
    Write-Host "Building an Authenticode-signed Windows release."
  }
  else {
    Write-Warning "No Authenticode code-signing certificate is configured. Windows can show an Unknown publisher warning."
  }

  & npm.cmd @buildArguments
  if ($LASTEXITCODE -ne 0) {
    throw "The signed desktop build failed with exit code $LASTEXITCODE."
  }
  & node tools/publish-desktop-release.mjs
  if ($LASTEXITCODE -ne 0) {
    throw "The desktop release publish failed with exit code $LASTEXITCODE."
  }
}
finally {
  if ($importedCertificate) {
    Remove-Item -LiteralPath "Cert:\CurrentUser\My\$($importedCertificate.Thumbprint)" -Force -ErrorAction SilentlyContinue
  }
  if ($signingConfigPath) {
    Remove-Item -LiteralPath $signingConfigPath -Force -ErrorAction SilentlyContinue
  }
  Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD -ErrorAction SilentlyContinue
}
