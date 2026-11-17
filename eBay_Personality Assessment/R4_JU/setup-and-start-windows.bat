@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

echo ================================================
echo   個人特質與工作現況分析系統 - Windows 安裝啟動器
echo ================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [錯誤] 找不到 Node.js。
  echo 請先安裝 Node.js 20 或以上版本：https://nodejs.org/
  pause
  exit /b 1
)

where docker >nul 2>nul
if errorlevel 1 (
  echo [錯誤] 找不到 Docker Desktop。
  echo 請先安裝並啟動 Docker Desktop：https://www.docker.com/products/docker-desktop/
  pause
  exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
  echo [提示] 找不到 pnpm，嘗試透過 Corepack 啟用 pnpm...
  call corepack enable
  call corepack prepare pnpm@10.4.1 --activate
  where pnpm >nul 2>nul
  if errorlevel 1 (
    echo [錯誤] 無法啟用 pnpm，請手動執行：npm install -g pnpm@10.4.1
    pause
    exit /b 1
  )
)

set "SOURCE_DIR=%~dp0"
set "TARGET_DIR=%USERPROFILE%\Projects\personality-analysis-system"

if not exist "%USERPROFILE%\Projects" mkdir "%USERPROFILE%\Projects"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo [1/6] 複製專案至：
echo       %TARGET_DIR%
robocopy "%SOURCE_DIR%" "%TARGET_DIR%" /E /R:2 /W:2 /XD node_modules .pnpm-store dist .git /XF .env package-lock.json /NFL /NDL /NJH /NJS /NP
if errorlevel 8 (
  echo [錯誤] 專案複製失敗。
  pause
  exit /b 1
)

cd /d "%TARGET_DIR%"

if not exist "%TARGET_DIR%\.env" (
  if exist "%TARGET_DIR%\.env.local.example" (
    copy /Y "%TARGET_DIR%\.env.local.example" "%TARGET_DIR%\.env" >nul
    echo [提示] 已從 .env.local.example 建立 .env
  ) else (
    echo [錯誤] 找不到 .env.local.example
    pause
    exit /b 1
  )
)

set "DATABASE_URL=mysql://personality:personality_dev_password@127.0.0.1:3307/personality_analysis"
set "PORT=3000"
set "NODE_ENV=development"

if not exist "%TARGET_DIR%\docker-compose.local.yml" (
  echo [錯誤] 找不到 docker-compose.local.yml
  pause
  exit /b 1
)

echo [2/6] 啟動 MySQL 與 MinIO...
docker compose -f docker-compose.local.yml up -d
if errorlevel 1 (
  echo [錯誤] Docker 服務啟動失敗，請確認 Docker Desktop 已完成啟動。
  pause
  exit /b 1
)

echo [3/6] 等待 MySQL 啟動...
set /a RETRIES=0
:wait_mysql
set /a RETRIES+=1
docker compose -f docker-compose.local.yml exec -T mysql mysqladmin ping -h localhost -uroot -proot_dev_password >nul 2>nul
if not errorlevel 1 goto mysql_ready
if !RETRIES! GEQ 30 (
  echo [錯誤] MySQL 等待逾時。
  docker compose -f docker-compose.local.yml logs --tail=40 mysql
  pause
  exit /b 1
)
timeout /t 2 /nobreak >nul
goto wait_mysql
:mysql_ready

echo [4/6] 安裝前端與後端依賴...
pnpm install --config.node-linker=hoisted --network-concurrency=1 --fetch-retries=5 --fetch-timeout=300000
if errorlevel 1 (
  echo [錯誤] pnpm 依賴安裝失敗。
  echo 若遇到檔案鎖定，請關閉 VS Code、Vite、Node.js 後重新執行本檔案。
  pause
  exit /b 1
)

echo [5/6] 建立與同步資料庫 schema...
pnpm db:push
if errorlevel 1 (
  echo [錯誤] 資料庫 schema 同步失敗。
  pause
  exit /b 1
)

echo [6/6] 啟動開發服務...
echo.
echo 系統網址：http://localhost:3000/
echo 管理後台：http://localhost:3000/admin
echo MinIO Console：http://localhost:9001/
echo.
echo 按 Ctrl+C 可停止網站；資料庫與儲存服務可用以下指令停止：
echo docker compose -f docker-compose.local.yml down
start "Personality Analysis System" /D "%TARGET_DIR%" cmd /k "set DATABASE_URL=%DATABASE_URL%&& set PORT=3000&& set NODE_ENV=development&& pnpm dev"

echo 已開啟新的服務視窗。
echo 專案位置：%TARGET_DIR%
pause
endlocal
