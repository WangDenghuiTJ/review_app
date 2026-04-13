$ErrorActionPreference = "Stop"

$progId = "DocPilot.document"

& reg.exe delete "HKCU\Software\Classes\.docpilot\ShellNew" /f 2>$null | Out-Null
& reg.exe delete "HKCU\Software\Classes\.reflow\ShellNew" /f 2>$null | Out-Null
& reg.exe delete "HKCU\Software\Classes\.flow\ShellNew" /f 2>$null | Out-Null
& reg.exe delete "HKCU\Software\Classes\.docpilot" /f 2>$null | Out-Null
& reg.exe delete "HKCU\Software\Classes\.reflow" /f 2>$null | Out-Null
& reg.exe delete "HKCU\Software\Classes\.flow" /f 2>$null | Out-Null
& reg.exe delete "HKCU\Software\Classes\$progId" /f 2>$null | Out-Null

Write-Host "DocPilot 当前用户的文件关联和右键新建菜单已移除。"
Write-Host "如果你还要彻底删除软件，请手动删除 md_review_app 目录。"
