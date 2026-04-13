@echo off
setlocal
set SCRIPT_DIR=%~dp0

where py >nul 2>nul
if not errorlevel 1 (
  py -3 "%SCRIPT_DIR%..\portable\review_app_portable.py" %*
  exit /b %errorlevel%
)

where python >nul 2>nul
if not errorlevel 1 (
  python "%SCRIPT_DIR%..\portable\review_app_portable.py" %*
  exit /b %errorlevel%
)

where wsl.exe >nul 2>nul
if errorlevel 1 (
  echo DocPilot 启动失败：未找到 Windows Python，也未找到 WSL。
  exit /b 1
)

for /f "delims=" %%i in ('wsl.exe wslpath -a "%SCRIPT_DIR%..\portable\review_app_portable.py"') do set "WSL_SCRIPT=%%i"
if "%~1"=="" (
  wsl.exe -e python3 "%WSL_SCRIPT%"
  exit /b %errorlevel%
)

for /f "delims=" %%i in ('wsl.exe wslpath -a "%~1"') do set "WSL_TARGET=%%i"
wsl.exe -e python3 "%WSL_SCRIPT%" "%WSL_TARGET%"
