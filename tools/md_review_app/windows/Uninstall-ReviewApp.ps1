$ErrorActionPreference = "Stop"

$progId = "DocPilot.document"

function Remove-RegistryKeyIfExists {
  param([string]$KeyPath)
  $registryPath = "Registry::" + $KeyPath.Replace("HKCU\", "HKEY_CURRENT_USER\").Replace("HKLM\", "HKEY_LOCAL_MACHINE\")
  if (Test-Path -LiteralPath $registryPath) {
    Remove-Item -LiteralPath $registryPath -Recurse -Force
  }
}

function Remove-ShellNewClass {
  param([string]$Extension)
  $shellNewPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Discardable\PostSetup\ShellNew"
  if (-not (Test-Path -LiteralPath $shellNewPath)) {
    return
  }
  $current = (Get-ItemProperty -Path $shellNewPath -Name Classes -ErrorAction SilentlyContinue).Classes
  if (-not $current) {
    return
  }
  $items = @($current) | Where-Object { $_ -and $_ -ne $Extension }
  if ($items.Count -gt 0) {
    Set-ItemProperty -Path $shellNewPath -Name Classes -Value $items
  } else {
    Remove-ItemProperty -Path $shellNewPath -Name Classes -ErrorAction SilentlyContinue
  }
}

function Invoke-ShellAssocRefresh {
  Add-Type -Namespace Win32 -Name NativeMethods -MemberDefinition @"
[System.Runtime.InteropServices.DllImport("shell32.dll")]
public static extern void SHChangeNotify(int wEventId, uint uFlags, System.IntPtr dwItem1, System.IntPtr dwItem2);
"@ -ErrorAction SilentlyContinue
  [Win32.NativeMethods]::SHChangeNotify(0x08000000, 0, [System.IntPtr]::Zero, [System.IntPtr]::Zero)
}

Remove-RegistryKeyIfExists "HKCU\Software\Classes\.docpilot\ShellNew"
Remove-RegistryKeyIfExists "HKCU\Software\Classes\.reflow\ShellNew"
Remove-RegistryKeyIfExists "HKCU\Software\Classes\.flow\ShellNew"
Remove-RegistryKeyIfExists "HKCU\Software\Classes\.docpilot"
Remove-RegistryKeyIfExists "HKCU\Software\Classes\.reflow"
Remove-RegistryKeyIfExists "HKCU\Software\Classes\.flow"
Remove-RegistryKeyIfExists "HKCU\Software\Classes\$progId"
Remove-ShellNewClass ".docpilot"
Invoke-ShellAssocRefresh

Write-Host "DocPilot 当前用户的文件关联和右键新建菜单已移除。"
Write-Host "如果你还要彻底删除软件，请手动删除 md_review_app 目录。"
