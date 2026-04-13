$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
$portableLauncher = Join-Path $appRoot "portable\review_app_portable.py"

function Convert-ToWslPath {
  param([string]$Path)
  $converted = & wsl.exe -e wslpath -a $Path
  return ($converted | Out-String).Trim()
}

function Test-PythonCommand {
  param(
    [string]$Executable,
    [string[]]$Arguments = @("--version")
  )
  if (-not (Get-Command $Executable -ErrorAction SilentlyContinue)) {
    return $false
  }
  try {
    & $Executable @Arguments *> $null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

if (Test-PythonCommand "py" @("-3", "--version")) {
  & py -3 $portableLauncher @args
  exit $LASTEXITCODE
}

if (Test-PythonCommand "python" @("--version")) {
  & python $portableLauncher @args
  exit $LASTEXITCODE
}

if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
  throw "DocPilot launcher could not find Windows Python or WSL."
}

$wslLauncher = Convert-ToWslPath $portableLauncher
if ($args.Length -gt 0 -and $args[0]) {
  $wslTarget = Convert-ToWslPath $args[0]
  & wsl.exe -e python3 $wslLauncher $wslTarget
  exit $LASTEXITCODE
}

& wsl.exe -e python3 $wslLauncher
exit $LASTEXITCODE
