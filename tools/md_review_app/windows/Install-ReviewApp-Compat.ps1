$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
$launcherVbs = (Resolve-Path (Join-Path $scriptDir "ReviewApp.vbs")).Path
$launcherPs1 = (Resolve-Path (Join-Path $scriptDir "ReviewApp.ps1")).Path
$templateDir = Join-Path $scriptDir "templates"
$templatePath = Join-Path $templateDir "Blank.docpilot"
$progId = "DocPilot.document"
$openCommand = "wscript.exe `"$launcherVbs`" `"%1`""

function Get-PythonInvocation {
  if (Get-Command python -ErrorAction SilentlyContinue) {
    return @{
      Mode = "windows"
      Command = @("python")
    }
  }
  if (Get-Command wsl.exe -ErrorAction SilentlyContinue) {
    return @{
      Mode = "wsl"
      Command = @("wsl.exe", "-e", "python3")
    }
  }
  throw "Could not find Windows python or WSL python3."
}

function Convert-ToWslPath {
  param([string]$Path)
  $converted = & wsl.exe -e wslpath -a $Path
  return ($converted | Out-String).Trim()
}

function Invoke-CommandArray {
  param([string[]]$Command)
  $exe = $Command[0]
  $rest = @()
  if ($Command.Length -gt 1) {
    $rest = $Command[1..($Command.Length - 1)]
  }
  & $exe @rest
}

function Remove-RegistryKeyIfExists {
  param([string]$KeyPath)
  $registryPath = "Registry::" + $KeyPath.Replace("HKCU\", "HKEY_CURRENT_USER\").Replace("HKLM\", "HKEY_LOCAL_MACHINE\")
  if (Test-Path -LiteralPath $registryPath) {
    Remove-Item -LiteralPath $registryPath -Recurse -Force
  }
}

function Add-ShellNewClass {
  param([string]$Extension)
  $shellNewPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Discardable\PostSetup\ShellNew"
  if (-not (Test-Path -LiteralPath $shellNewPath)) {
    New-Item -ItemType Directory -Force -Path $shellNewPath | Out-Null
  }
  $current = (Get-ItemProperty -Path $shellNewPath -Name Classes -ErrorAction SilentlyContinue).Classes
  $items = @()
  if ($current) {
    $items = @($current)
  }
  if ($items -notcontains $Extension) {
    $items += $Extension
    if ($current) {
      Set-ItemProperty -Path $shellNewPath -Name Classes -Value $items
    } else {
      New-ItemProperty -Path $shellNewPath -Name Classes -PropertyType MultiString -Value $items -Force | Out-Null
    }
  }
}

function Invoke-ShellAssocRefresh {
  Add-Type -Namespace Win32 -Name NativeMethods -MemberDefinition @"
[System.Runtime.InteropServices.DllImport("shell32.dll")]
public static extern void SHChangeNotify(int wEventId, uint uFlags, System.IntPtr dwItem1, System.IntPtr dwItem2);
"@ -ErrorAction SilentlyContinue
  [Win32.NativeMethods]::SHChangeNotify(0x08000000, 0, [System.IntPtr]::Zero, [System.IntPtr]::Zero)
}

if (-not (Test-Path -LiteralPath $templateDir)) {
  New-Item -ItemType Directory -Force -Path $templateDir | Out-Null
}

$python = Get-PythonInvocation
$cliPath = Join-Path $appRoot "portable\reflow_package_cli.py"

if ($python.Mode -eq "windows") {
  $pythonCommand = @()
  $pythonCommand += $python.Command
  $pythonCommand += $cliPath
  $pythonCommand += "blank"
  $pythonCommand += $templatePath
} else {
  $pythonCommand = @(
    $python.Command[0]
    $python.Command[1]
    $python.Command[2]
    (Convert-ToWslPath $cliPath)
    "blank"
    (Convert-ToWslPath $templatePath)
  )
}

Invoke-CommandArray $pythonCommand | Out-Null

& reg.exe add "HKCU\Software\Classes\.docpilot" /ve /d $progId /f | Out-Null
& reg.exe add "HKCU\Software\Classes\.reflow" /ve /d $progId /f | Out-Null
& reg.exe add "HKCU\Software\Classes\.flow" /ve /d $progId /f | Out-Null
& reg.exe add "HKCU\Software\Classes\$progId" /ve /d "DocPilot Document" /f | Out-Null
& reg.exe add "HKCU\Software\Classes\$progId\DefaultIcon" /ve /d "`"$launcherPs1`",0" /f | Out-Null
& reg.exe add "HKCU\Software\Classes\$progId\shell\open\command" /ve /d $openCommand /f | Out-Null
& reg.exe add "HKCU\Software\Classes\.docpilot\ShellNew" /v FileName /d $templatePath /f | Out-Null
Remove-RegistryKeyIfExists "HKCU\Software\Classes\.reflow\ShellNew"
Remove-RegistryKeyIfExists "HKCU\Software\Classes\.flow\ShellNew"
Add-ShellNewClass ".docpilot"
Invoke-ShellAssocRefresh

Write-Host "Review App registration complete."
Write-Host "Launcher: $launcherVbs"
Write-Host "Template: $templatePath"
Write-Host "You can now double-click .docpilot/.reflow/.flow files."
Write-Host "You can also use right-click -> New -> DocPilot Document."
