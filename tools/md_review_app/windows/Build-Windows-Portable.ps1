$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
$repoRoot = (Resolve-Path (Join-Path $appRoot "..\..")).Path
$distRoot = Join-Path $repoRoot "dist"
$releaseDir = Join-Path $distRoot "docpilot_windows_portable"
$zipPath = Join-Path $distRoot "docpilot_windows_portable.zip"

if (Test-Path $releaseDir) {
  Remove-Item -Recurse -Force $releaseDir
}
if (-not (Test-Path $distRoot)) {
  New-Item -ItemType Directory -Path $distRoot -Force | Out-Null
}

New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

Copy-Item -Recurse -Force (Join-Path $appRoot "static") (Join-Path $releaseDir "static")
Copy-Item -Recurse -Force (Join-Path $appRoot "portable") (Join-Path $releaseDir "portable")
Copy-Item -Recurse -Force (Join-Path $appRoot "windows") (Join-Path $releaseDir "windows")
Copy-Item -Force (Join-Path $appRoot "server.py") $releaseDir
Copy-Item -Force (Join-Path $appRoot "safe_comment_tools.py") $releaseDir
Copy-Item -Force (Join-Path $appRoot "README.md") $releaseDir
Copy-Item -Force (Join-Path $appRoot "WINDOWS_PORTABLE_INSTALL.md") $releaseDir

$readmePath = Join-Path $releaseDir "START_HERE.txt"
@" 
DocPilot Windows 绿色版

1. 如果你是第一次使用，请先运行：
   windows\Install-ReviewApp-Compat.ps1

2. 安装后你可以：
   - 双击 .docpilot / .reflow / .flow 文件直接打开
   - 在桌面或任意文件夹右键 -> 新建 -> DocPilot 文档

3. 详细说明见：
   WINDOWS_PORTABLE_INSTALL.md
"@ | Set-Content -Encoding UTF8 $readmePath

Get-ChildItem -Path $releaseDir -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force
Get-ChildItem -Path $releaseDir -Recurse -File -Include "*.pyc" | Remove-Item -Force

if (Test-Path $zipPath) {
  Remove-Item -Force $zipPath
}
Compress-Archive -Path (Join-Path $releaseDir "*") -DestinationPath $zipPath -Force

Write-Host "发布目录已生成: $releaseDir"
Write-Host "发布压缩包已生成: $zipPath"
