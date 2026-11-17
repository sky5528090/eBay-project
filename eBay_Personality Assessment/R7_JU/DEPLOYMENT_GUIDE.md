# 個人特質＆工作現況分析系統｜正式部署設定說明

## 1. 部署結論

本系統已部署於 Manus WebDev 的全端雲端環境，使用 `web-db-user` 架構，包含前端、Node.js 伺服器、MySQL/TiDB 資料庫、S3 相容檔案儲存與 Manus OAuth 登入。

目前正式版本：`3493da11`

目前正式網址：

- `https://personality-ovrrmp2c.manus.space`

目前檢查結果：正式網址 HTTP 200、開發預覽 HTTP 200、工作樹乾淨、依賴正常、TypeScript 無錯誤、42 項 Vitest 測試通過，且正式建置成功。

這是受管理的雲端部署，不需要自行維護 Linux 主機、Nginx、PM2、TLS 憑證或 Docker 主機。正式環境由 WebDev 的託管服務執行，專案 checkpoint 是發布與回溯的版本單位。

## 2. 系統架構

```text
使用者瀏覽器
    │ HTTPS
    ▼
Manus WebDev 正式網域
    ├─ Vite/React 前端
    └─ Node.js/Express + tRPC API
             ├─ Manus OAuth：管理員登入與 session
             ├─ MySQL/TiDB：問卷、品牌、團隊、刪除請求
             └─ S3 相容儲存：品牌照片與結果圖相關媒體
```

前端由 Vite 建置，後端由 Express 啟動。tRPC API 統一掛在 `/api/trpc`，OAuth callback 使用 `/api/oauth/callback`。資料庫只保存結構化資料與檔案參照，不直接保存大型圖片二進位內容。

## 3. 建置與啟動設定

`package.json` 的正式設定如下：

```json
{
  "build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js",
  "test": "vitest run",
  "check": "tsc --noEmit"
}
```

WebDev 專案設定使用：

```text
Build command: pnpm run build
Test command:  pnpm test
Dev command:   pnpm run dev
Port:          3000
Template:      web-db-user
```

正式環境不應使用 `pnpm run dev`。開發伺服器只供本機或 WebDev preview 使用；正式服務使用建置後的 `dist/index.js`。

## 4. 環境變數與密鑰

環境變數必須在 WebDev 專案的 secrets/environment 設定中管理，不要提交 `.env`，也不要把值寫進前端原始碼、Git、截圖或部署文件。下面只列出名稱與用途，不列出任何敏感值。

| 變數 | 用途 | 是否必要 |
|---|---|---|
| `DATABASE_URL` | MySQL/TiDB 連線字串 | 必要 |
| `JWT_SECRET` | session cookie 簽章 | 必要 |
| `VITE_APP_ID` | Manus OAuth application ID | 必要 |
| `OAUTH_SERVER_URL` | OAuth 伺服器位置 | 必要 |
| `VITE_OAUTH_PORTAL_URL` | 前端登入入口 | 必要 |
| `OWNER_OPEN_ID` | 專案擁有者識別 | 必要 |
| `OWNER_NAME` | 專案擁有者名稱 | 必要 |
| `BUILT_IN_FORGE_API_URL` | Manus 內建 API 入口 | 依功能必要 |
| `BUILT_IN_FORGE_API_KEY` | 後端內建 API 授權 | 依功能必要 |
| `VITE_FRONTEND_FORGE_API_URL` | 前端可用的內建 API 入口 | 依功能必要 |
| `VITE_FRONTEND_FORGE_API_KEY` | 前端允許使用的 API key | 依功能必要 |
| `VITE_APP_TITLE` | 瀏覽器標題與應用名稱 | 建議 |
| `VITE_APP_LOGO` | 應用 logo URL | 建議 |
| `VITE_ANALYTICS_ENDPOINT` | 分析服務入口 | 選用 |
| `VITE_ANALYTICS_WEBSITE_ID` | 分析網站識別 | 選用 |

安全原則：`DATABASE_URL`、`JWT_SECRET`、`BUILT_IN_FORGE_API_KEY` 必須只存在於 server-side secrets。只有名稱以 `VITE_` 開頭的變數會被編譯進瀏覽器，因此不要把資料庫密碼或 server-only key 加上 `VITE_` 前綴。

## 5. 資料庫與 migration

資料庫 schema 位於 `drizzle/schema.ts`，migration 位於 `drizzle/migrations/`。正式資料庫變更請遵循以下流程：

1. 修改 `drizzle/schema.ts`。
2. 執行 `pnpm drizzle-kit generate`。
3. 閱讀新產生的 SQL，確認只包含預期變更。
4. 使用專案提供的資料庫執行工具套用 migration。
5. 執行 `pnpm check`、`pnpm test` 與 `pnpm build`。
6. 在 preview 執行一次實際流程後，再建立 checkpoint。
7. 以 checkpoint 作為正式發布版本。

不要直接刪除既有欄位或重建 production table。問卷系統需要保留舊受測者紀錄，因此新增欄位應優先設為可空並讓前台與後台支援舊資料。不要把圖片 bytes 存入資料庫；只保存 S3 URL、object key 與裁切／位置／縮放設定。

目前主要資料包含：受測者基本資料、兄弟姐妹條件欄位、五組 8→4→2→1 選擇與分數、DISC 15 題答案、品牌名稱、品牌照片與浮水印設定、團隊邀請與資料刪除請求。

## 6. OAuth 與管理員權限

公開問卷可直接由首頁使用。後台使用 Manus OAuth 登入，伺服器端依 `ctx.user` 與角色限制受保護 procedure。管理員登入流程如下：

1. 從正式網站進入管理員入口。
2. 由 Manus OAuth 完成登入與 callback。
3. server 建立或讀取 session cookie。
4. 只有具備 `admin` 權限的帳號可以查看受測者紀錄、品牌設定、統計、團隊與刪除管理。
5. 新管理員應透過後台邀請機制加入，不要直接把管理員密碼寫在程式碼或資料庫備註。

若更換正式網域，必須同步確認 OAuth provider 的 redirect/callback allowlist，至少包含新的正式網域與 `/api/oauth/callback`；否則使用者會卡在登入回呼階段。

## 7. S3 與品牌圖片

品牌照片由後端上傳至 S3 相容儲存，資料庫保存 URL/key 與以下設定：

- 焦點 X/Y 位置
- 顯示縮放比例
- 浮水印大小
- 浮水印透明度

前端會先做 WebP 壓縮與裁切互動，後台提供拖曳、縮放、建議優化、移除照片與預覽。移除照片時應同時清除資料庫 reference，並釋放前端 Blob URL。

正式部署時不要將大型媒體放到 `client/public/` 或 `client/src/assets/`。小型設定檔才可放在 `client/public/`；圖片與媒體使用物件儲存。

## 8. 網域與 HTTPS

目前已提供受管理的永久網址：

```text
https://personality-ovrrmp2c.manus.space
```

該網址使用 HTTPS。若日後要改成自訂網域，準備以下資料：

1. 自訂網域名稱。
2. 網域 DNS 管理權限。
3. WebDev 平台提供的 CNAME 或驗證紀錄。
4. OAuth redirect/callback allowlist 更新權限。

一般流程是先在 WebDev 專案加入自訂網域，再依平台指示新增 DNS CNAME／TXT，等待 DNS 與 TLS 憑證驗證完成，最後更新 OAuth callback 設定。切換完成前保留 Manus 網域作為備援入口，不要先刪除舊網域。

## 9. 正式更新流程

每次更新建議依此順序：

```bash
cd /home/ubuntu/personality-analysis-system
pnpm check
pnpm test
pnpm build
```

接著：

1. 在 preview 檢查首頁、PART 1、PART 2、PART 3、完成頁與後台結果頁。
2. 手機寬度檢查 DISC 表格內部水平滑動、固定題號欄與深色模式。
3. 若有 schema 變更，先套用並驗證 migration。
4. 建立描述清楚的 checkpoint。
5. 從 checkpoint 發布正式版本。
6. 以正式 HTTPS 網域執行首頁與登入 smoke test。

正式 smoke test 至少包括：首頁 HTTP 200、開始填寫、沒有兄弟姐妹的條件流程、PART 2 50 分驗證、PART 3 15 題、完成頁兩種結果、管理員登入、單筆紀錄、DISC PNG 下載、品牌設定與 CSV 匯出。

## 10. 回滾與故障處理

若新版本出現前端錯誤，先保留資料庫與檔案儲存，不要直接刪資料。回到前一個已驗證 checkpoint，重新發布前一版，再檢查錯誤日誌。若是 migration 問題，先停止再次套用同一 migration，確認資料庫實際 schema 與 `drizzle/schema.ts` 的差異，再建立向前修復 migration。

常見問題：

- **OAuth redirect error**：確認正式網域、callback 路徑與 OAuth allowlist 完全一致。
- **資料庫連線失敗**：確認 `DATABASE_URL` 仍存在、TLS 參數正確且資料庫服務可用。
- **品牌圖片不顯示**：確認 S3 URL/key、權限與前端 preview URL 是否已釋放／更新。
- **後台沒有資料**：確認帳號角色是 `admin`，並檢查 tRPC authorization error。
- **手機表格超出頁面**：確認 `disc-paper-result-wrap` 仍使用內部 `overflow-x: auto`，不要對整個 body 開啟水平捲軸。
- **中文亂碼**：確認 SVG 使用 UTF-8 宣告、Traditional Chinese 字型 fallback 與正確的 XML escape。

## 11. 備份與安全維運建議

正式使用前請確認資料庫供應商已開啟可用的備份與恢復方案，並安排定期測試恢復。後台 CSV 匯出可作為業務層備份，但不能取代資料庫備份。備份檔不得公開放在網站靜態目錄。

定期輪替 OAuth、JWT 與 API secrets；輪替後立刻測試管理員登入、問卷提交、品牌圖片上傳與結果圖產生。限制管理員邀請權限，僅讓必要角色查看個人資料與刪除請求。正式環境不得在 log 印出密鑰、完整資料庫連線字串或受測者敏感資料。

## 12. 發布完成檢查表

- [x] 正式 HTTPS 網域可回應
- [x] Web、server、database、user capabilities 已啟用
- [x] OAuth、資料庫與檔案儲存架構已配置
- [x] 42 項 Vitest 通過
- [x] TypeScript 檢查通過
- [x] 正式 build 通過
- [x] 穩定版本 checkpoint `3493da11` 已建立
- [ ] 若使用自訂網域，完成 DNS 與 OAuth allowlist 更新
- [ ] 由專案擁有者確認正式資料庫備份／恢復政策
- [ ] 上線前以真實管理員帳號完成一次 smoke test
