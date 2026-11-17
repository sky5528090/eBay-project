# 正式交接 Email 範本

## Email 主旨

【系統交接】個人特質＆工作現況分析系統｜原始碼、部署文件與接手驗收

## Email 內容

您好：

為確保「個人特質＆工作現況分析系統」後續能持續維護、修正與部署，現將系統的原始碼、技術文件、部署說明、資料庫備份／還原演練流程與接手檢查清單整理完成，提供您進行技術交接。

本次交接的系統基準版本為 `016ab0d7`。系統目前包含公開問卷前台、PART 1 基本資料、PART 2 8→4→2→1 特質分析、PART 3 DISC 個人天賦行為模式、測驗結果 PNG／PDF 匯出、管理後台、團隊權限、品牌設定、資料刪除流程與 Log 操作紀錄。

附件或分享檔案中的文件用途如下：

1. `HANDOVER_README.md`：系統架構、原始碼導覽、功能範圍、正式環境與交接完成標準。
2. `HANDOVER_SECURITY_AND_SECRETS.md`：帳號、OAuth、WebDev、GitHub、資料庫、S3 與網域金鑰的安全移交規範。
3. `HANDOVER_CHECKLIST.md`：接手工程師可逐項執行的權限、功能、測試、備份與發布驗收清單。
4. `DATABASE_BACKUP_RESTORE_DRILL.md`：先在隔離環境演練資料庫備份、還原、應用程式驗證與清理的完整步驟。
5. `HANDOVER_DATA_EXPORT_RUNBOOK.md`：正式資料、個資、資料表、物件儲存與加密備份的交接原則。
6. `DEPLOYMENT_GUIDE.md`：WebDev、OAuth、資料庫、S3、migration、發布與回滾說明。
7. `CUSTOM_DOMAIN_GUIDE.md`：自訂網域、DNS、HTTPS 與 OAuth callback 注意事項。
8. `SYSTEM_SPECIFICATION.md`：系統規格、畫面結構與主要功能說明。

原始碼封存包包含可建置的專案原始碼、`package.json`、`pnpm-lock.yaml`、前後端程式、共用題目與計分邏輯、資料庫 schema、migration 與測試。封存包不包含 `node_modules`、建置產物、正式資料庫 dump、實際 API key、OAuth secret、JWT secret、S3 access key、GitHub token 或其他敏感憑證。

### 金鑰與帳號安全注意事項

實際金鑰不會放在一般 Email、原始碼壓縮檔或 Markdown 文件內。請使用 WebDev Secrets、密碼管理器或其他具備存取紀錄與撤銷功能的安全方式，分開移交以下項目：資料庫連線權限、WebDev 專案權限、OAuth application 管理權限、GitHub repository 權限、S3／物件儲存權限與網域 DNS 管理權限。

請使用您自己的個人帳號接手，不要共用原持有人的登入資訊。建議先建立新帳號與最小必要權限，完成備份恢復與正式 smoke test 後，再輪替高權限金鑰並撤銷原帳號或舊 token。若需要正式受測者資料，請先確認個資處理責任、用途、保存期限與加密交付方式；若只是維護程式，建議使用去識別化測試資料。

請先依 `DATABASE_BACKUP_RESTORE_DRILL.md` 在隔離環境完成一次還原演練，再依 `HANDOVER_CHECKLIST.md` 完成登入、問卷、PART 2、PART 3、結果匯出、品牌設定、Log、刪除流程、建置與回滾驗收。

請於完成後回覆以下資訊：

- 是否已成功取得並解壓原始碼封存包
- `pnpm check`、`pnpm test -- --run`、`pnpm build` 是否通過
- 是否已完成資料庫備份與還原演練
- 是否已完成 WebDev、GitHub、OAuth、資料庫、S3 與網域權限確認
- 是否已完成正式環境 smoke test
- 目前仍需補充或修正的項目

本次交接不代表自動轉移所有平台、網域、資料庫或第三方服務的所有權。各項權限應在雙方確認後，依實際平台完成正式轉移與撤銷。

謝謝。

原持有人：____________________

聯絡方式：____________________

交接日期：____________________
