@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "TARGET_DIR=%USERPROFILE%\Projects\personality-analysis-system"
set "DATABASE_URL=mysql://personality:personality_dev_password@127.0.0.1:3307/personality_analysis"
set "PORT=3000"
set "NODE_ENV=development"

if not exist "%TARGET_DIR%\package.json" (
  echo 尚未建立本機專案，請先執行 setup-and-start-windows.bat
  pause
  exit /b 1
)

cd /d "%TARGET_DIR%"
docker compose -f docker-compose.local.yml up -d
start "Personality Analysis System" /D "%TARGET_DIR%" cmd /k "set DATABASE_URL=%DATABASE_URL%&& set PORT=3000&& set NODE_ENV=development&& pnpm dev"
echo 系統啟動中：http://localhost:3000/
pause
endlocal
