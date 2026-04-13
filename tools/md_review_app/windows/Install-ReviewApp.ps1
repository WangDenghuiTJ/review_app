$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
$launcherPath = (Resolve-Path (Join-Path $scriptDir "ReviewApp.vbs")).Path
$powerShellLauncherPath = (Resolve-Path (Join-Path $scriptDir "ReviewApp.ps1")).Path
$templateDir = Join-Path $scriptDir "templates"
$templatePath = Join-Path $templateDir "Blank.docpilot"
$progId = "DocPilot.document"
$command = "wscript.exe `"$launcherPath`" `"%1`""

function Convert-ToWslPath {
  param([string]$Path)
  $converted = & wsl.exe wslpath -a $Path
  return ($converted | Out-String).Trim()
}

function Get-PythonCommand {
  if (Get-Command py -ErrorAction SilentlyContinue) {
    return @{
      Mode = "windows"
      Command = @("py", "-3")
    }
  }
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
  throw "未找到 Windows Python，也未找到可用的 WSL。请先安装 Python，或启用 WSL 后再运行此脚本。"
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

if (-not (Test-Path $templateDir)) {
  New-Item -ItemType Directory -Path $templateDir -Force | Out-Null
}

$python = Get-PythonCommand
if ($python.Mode -eq "windows") {
  $pythonCommand = @()
  $pythonCommand += $python.Command
  $pythonCommand += (Join-Path $appRoot "portable\reflow_package_cli.py")
  $pythonCommand += "blank"
  $pythonCommand += $templatePath
} else {
  $pythonCommand = @(
    $python.Command[0]
    $python.Command[1]
    $python.Command[2]
    (Convert-ToWslPath (Join-Path $appRoot "portable\reflow_package_cli.py"))
    "blank"
    (Convert-ToWslPath $templatePath)
  )
}
Invoke-CommandArray $pythonCommand | Out-Null

& reg.exe add "HKCU\Software\Classes\.docpilot" /ve /d $progId /f | Out-Null
& reg.exe add "HKCU\Software\Classes\.reflow" /ve /d $progId /f | Out-Null
& reg.exe add "HKCU\Software\Classes\.flow" /ve /d $progId /f | Out-Null
& reg.exe add "HKCU\Software\Classes\$progId" /ve /d "DocPilot 文档" /f | Out-Null
& reg.exe add "HKCU\Software\Classes\$progId\DefaultIcon" /ve /d "`"$powerShellLauncherPath`",0" /f | Out-Null
& reg.exe add "HKCU\Software\Classes\$progId\shell\open\command" /ve /d $command /f | Out-Null
& reg.exe add "HKCU\Software\Classes\.docpilot\ShellNew" /v FileName /d $templatePath /f | Out-Null
& reg.exe delete "HKCU\Software\Classes\.reflow\ShellNew" /f 2>$null | Out-Null
& reg.exe delete "HKCU\Software\Classes\.flow\ShellNew" /f 2>$null | Out-Null

Write-Host "DocPilot 已完成当前用户安装/修复。"
Write-Host "启动器: $launcherPath"
Write-Host "空白模板: $templatePath"
Write-Host "现在可以："
Write-Host "1. 双击 .docpilot / .reflow / .flow 文件直接打开"
Write-Host "2. 在桌面或任意文件夹右键 -> 新建 -> DocPilot 文档"
Write-Host "如果以后移动了软件目录，重新执行本脚本即可修复关联。"
