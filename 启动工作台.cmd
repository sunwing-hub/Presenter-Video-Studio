@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo 请先安装 Node.js 24 LTS，并运行“安装工作台.cmd”。
  pause
  exit /b 1
)
node scripts/studio-launcher.mjs
pause
