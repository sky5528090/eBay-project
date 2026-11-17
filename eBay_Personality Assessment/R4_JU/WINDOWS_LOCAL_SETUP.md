# Windows 本機安裝與啟動說明

## 前置條件

請先安裝並啟動以下工具：

1. **Node.js 20 或以上版本**：<https://nodejs.org/>
2. **Docker Desktop**：<https://www.docker.com/products/docker-desktop/>
3. Windows PowerShell 或命令提示字元。

本專案不建議直接在原始桌面掛載同步路徑執行 `pnpm install`，因為該路徑會造成 `node_modules` symlink、刪除暫存資料夾與 pnpm store 發生 `disk I/O error`。批次檔會將專案複製至：

```text
%USERPROFILE%\Projects\personality-analysis-system
```

這是 Windows 本機一般磁碟路徑，適合安裝依賴與執行開發服務。

## 一鍵安裝與啟動

在目前專案資料夾中雙擊：

```text
setup-and-start-windows.bat
```

或在命令提示字元執行：

```bat
setup-and-start-windows.bat
```

批次檔會依序完成：

1. 檢查 Node.js、Docker Desktop 與 pnpm。
2. 複製專案至 `%USERPROFILE%\Projects\personality-analysis-system`。
3. 建立本機 `.env`。
4. 啟動 MySQL 與 MinIO。
5. 等待 MySQL ready。
6. 以 hoisted node linker 安裝 pnpm 依賴，降低 Windows symlink 問題。
7. 執行 `pnpm db:push` 建立資料庫表格。
8. 啟動 React／Express 開發服務。

## 使用網址

| 服務 | 網址 |
|---|---|
| 公開問卷 | <http://localhost:3000/> |
| 管理員後台 | <http://localhost:3000/admin> |
| MinIO Console | <http://localhost:9001/> |

本機 MinIO Console 登入資訊：

```text
帳號：personality_admin
密碼：personality_storage_password
```

## 第二次啟動

專案複製完成後，可直接雙擊：

```text
start-windows.bat
```

## 停止服務

停止網站：在開發服務視窗按 `Ctrl+C`。

停止 MySQL 與 MinIO：

```bat
cd /d "%USERPROFILE%\Projects\personality-analysis-system"
docker compose -f docker-compose.local.yml down
```

若要連同資料一併刪除，請審慎執行：

```bat
docker compose -f docker-compose.local.yml down -v
```

這會刪除本機 MySQL 與 MinIO 的 Docker volumes。

## 常見問題

### pnpm 仍出現 I/O 錯誤

請確認命令提示字元目前位於：

```text
%USERPROFILE%\Projects\personality-analysis-system
```

不要在 `/mnt/...` 的同步掛載路徑執行安裝。若 VS Code 或其他 Node 程序鎖定檔案，先關閉它們，再重新執行批次檔。

### Docker 尚未 ready

先開啟 Docker Desktop，等待左下角顯示 Docker Engine running，再重新執行批次檔。

### 3000 埠被占用

可先關閉占用 3000 埠的程式，或修改批次檔中的：

```bat
set "PORT=3000"
```

以及 `server/_core/index.ts` 所使用的啟動埠設定。
