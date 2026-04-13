Option Explicit

Dim shell
Dim scriptDir
Dim ps1Path
Dim command

Set shell = CreateObject("WScript.Shell")
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
ps1Path = scriptDir & "\ReviewApp.ps1"
command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & ps1Path & """"

If WScript.Arguments.Count > 0 Then
  command = command & " """ & WScript.Arguments(0) & """"
End If

shell.Run command, 0, False
