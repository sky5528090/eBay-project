# 個人特質＆工作現況分析系統｜工程師交接總覽

> 文件用途：提供下一位工程師接手開發、部署、維護與故障排除。
> 
> 文件版本：2026-11-12
> 
> 交接基準版本：`016ab0d7`
> 
> 專案名稱：`personality-analysis-system`
> 
> 專案 ID：`oVrRMp2cVdywNfGBFX77QG`

## 1. 系統摘要

本系統是一套以繁體中文、溫暖日系風格呈現的個人特質與工作現況分析問卷，包含公開前台、PART 1 基本資料、PART 2「8→4→2→1」特質分析、PART 3 DISC 個人天賦行為模式，以及管理員後台。

目前技術架構為 React 19、TypeScript、Vite、Tailwind CSS 4、Express、tRPC 11、Drizzle ORM、MySQL/TiDB、S3 相容物件儲存與 Manus OAuth。正式環境使用 WebDev Reserved Hosting，以降低冷啟動。

## 2. 目前正式環境

目前已配置的網域包含：

- `https://personality.my`
- `https://www.personality.my`
- `https://personality-ovrrmp2c.manus.space`
- `https://ju-personality-ebay.manus.space`

網域、OAuth、資料庫、物件儲存與 hosting 的所有權，應在交接時一併轉移或建立雙管理員，直到新工程師完成 smoke test。

## 3. 主要功能

### 公開前台

- 首頁與品牌設定同步
- 問卷進度暫存與中斷後恢復
- PART 1 基本資料填寫
- 無兄弟姐妹／有兄弟姐妹條件流程
- PART 2 五個題組的 8→4→2→1 選擇與 50 分驗證
- PART 3 DISC 15 題分組測驗
- 前台結果頁、PNG 與 PDF 匯出
- 手機、平板、桌面版響應式版面
- 淺色／深色模式
- 品牌微笑浮水印、大小、透明度、位置與照片設定
- 隱私權頁與資料刪除申請

### 管理後台

- OAuth 管理員登入
- 問卷紀錄列表、篩選、分頁與 CSV 匯出
- 單筆受測者資料與結果檢視
- DISC 紙本式結果預覽與 PNG／PDF 匯出
- 統計分析
- 團隊邀請、角色管理、帳號停用／啟用
- 資料刪除申請與批次刪除
- 品牌設定與照片編輯器
- Log 操作紀錄、API 錯誤紀錄、搜尋、篩選與分頁

## 4. 原始碼導覽

```text
client/src/App.tsx                  路由、全站錯誤提示、頁面 lazy loading
client/src/pages/Home.tsx           前台問卷、結果頁、PNG/PDF 匯出
client/src/pages/AdminDashboard.tsx 後台資料、品牌、團隊、Log 與結果預覽
client/src/pages/AdminInvite.tsx    管理員邀請流程
client/src/pages/Privacy.tsx        隱私權與刪除申請
client/src/index.css                全站樣式、響應式、深色模式與列印版面
shared/basicQuestions.ts             PART 1 題目
shared/groupedQuestionnaire.ts       PART 2 題目、計分與 50 分驗證
shared/discQuestionnaire.ts          PART 3 題目、分組與答案驗證
shared/discResultVisualization.ts    DISC 紙本式 SVG 結果圖
shared/resultVisualization.ts         PART 2 結果圖
server/routers.ts                     tRPC 主路由
server/routers/adminTools.ts          管理員、品牌、Log、統計等 API
server/routers/questionnaire.ts       問卷、紀錄、刪除等 API
server/db.ts                          Drizzle 查詢與資料庫 helper
server/storage.ts                      S3／物件儲存操作
server/_core/                         OAuth、Express、tRPC、環境設定與平台整合
drizzle/schema.ts                     資料庫 schema
drizzle/*.sql                         migration 檔案
```

## 5. 本機啟動

需求：Node.js、pnpm 10、可用的 MySQL/TiDB 與必要環境變數。

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test -- --run
pnpm dev
```

本機預設服務埠為 `3000`。正式建置與啟動：

```bash
pnpm build
NODE_ENV=production pnpm start
```

## 6. 交接時必做的安全工作

1. 不要把 `.env`、資料庫密碼、JWT secret、OAuth secret、API key、S3 secret 或 GitHub token 放進原始碼包。
2. 由原持有人在 WebDev、OAuth、網域註冊商、GitHub、資料庫與物件儲存平台新增新工程師的個別帳號。
3. 完成雙人確認後，輪替所有高權限金鑰；不要把舊 token 直接長期交給新工程師。
4. 移除前持有人不再需要的帳號、SSH key、GitHub token、OAuth session 與密碼管理器分享權限。
5. 資料庫匯出、受測者個資與備份檔使用加密檔案及獨立通道傳遞。
6. 完成交接後執行完整 smoke test，再由新工程師確認可以獨立部署與回滾。

詳細清單請參考：

- `HANDOVER_SECURITY_AND_SECRETS.md`
- `HANDOVER_CHECKLIST.md`
- `DEPLOYMENT_GUIDE.md`
- `CUSTOM_DOMAIN_GUIDE.md`
- `SYSTEM_SPECIFICATION.md`

## 7. 驗證基準

交接基準版本已確認：

```bash
pnpm check
pnpm test -- --run
pnpm build
```

目前最後一次驗證結果：11 個測試檔、59 項測試通過，TypeScript 檢查通過，正式建置通過。

注意：React 19 與 Vite ESM 不支援 Internet Explorer。正式支援範圍為現代 Chrome、Firefox、Edge 與 Safari。

## 8. 交接完成判定

當新工程師能夠完成以下事項，即可視為技術交接完成：

- 以自己的帳號登入管理後台
- 在 preview 啟動問卷並完成一份測試資料
- 驗證 PART 2 結果為 50 分且可匯出
- 驗證 PART 3 DISC 結果、PNG 與 PDF
- 讀取 Log 並使用搜尋、API 錯誤篩選與分頁
- 修改品牌設定並確認前台同步
- 執行測試與正式 build
- 建立 checkpoint、發布版本並能回滾
- 說明資料庫備份與恢復流程

---

## 交接簽署欄

原持有人：____________________ 日期：____________

接任工程師：__________________ 日期：____________

專案負責人／公司代表：________ 日期：____________
