# Project TODO - 擴充功能任務清單（角色管理、統計圖表、隱私與刪除）

## 1. 擴充資料庫 Schema 與 Migration
- [x] 在 `drizzle/schema.ts` 新增 `adminInvitations` 表格（邀請碼、建立者、狀態、過期時間）
- [x] 在 `drizzle/schema.ts` 新增 `deletionRequests` 表格（申請人 email/姓名、原因、狀態、處理時間）
- [x] 產生並執行對應的 migration SQL 檔

## 2. 後端 API 開發與單元測試
- [x] 開發管理員邀請與角色管理 API（列出管理員、發送邀請、撤銷管理員權限）
- [x] 開發統計圖表與分析報告 API（星座分佈、血型分佈、婚姻與職業統計、提交趨勢）
- [x] 開發資料刪除申請與管理 API（前台提交刪除申請、後台審核與刪除問卷紀錄）
- [x] 編寫擴充功能的 vitest 單元測試

## 3. 前台與後台 UI 整合
- [x] 後台新增「管理員團隊與邀請」分頁（檢視目前管理者、產生邀請連結／授權新管理員）
- [x] 後台新增「統計圖表與分析報告」分頁（使用圖表視覺化星座、血型、職業與答題趨勢）
- [x] 後台新增「資料刪除管理」分頁（審核與執行資料刪除申請）
- [x] 前台首頁或頁尾新增「隱私權政策與資料刪除申請」頁面與表單

## 4. 驗證與發布
- [x] 執行 TypeScript 檢查、完整 vitest 測試套件、正式建置
- [x] 執行 `webdev_save_checkpoint` 建立最新可發布版本

## Release gap follow-up

- [x] 執行 `webdev_save_checkpoint` 儲存包含管理員邀請、統計圖表、隱私頁與刪除流程的最新版本
- [x] 保存並交付新的 checkpoint/version ID，確認其對應到目前已通過 `pnpm test`、`pnpm check`、`pnpm build` 的程式狀態

## UI text revision

- [x] 移除首頁右側主視覺卡片中「也好好陪伴自己／STEPS, SOFT HEART」裝飾文字
- [x] 執行型別檢查並更新預覽畫面
- [x] 建立包含文字移除修改的最新發布版本

## UI revision checkpoint follow-up

- [x] 執行 `webdev_save_checkpoint` 儲存包含首頁文字移除修改的最新版本
- [x] 向使用者交付新的 checkpoint/version ID，確認其對應到本次已通過 `pnpm test`、`pnpm check`、`pnpm build` 的程式狀態

## Submission completion modal

- [x] 問卷提交成功後顯示「已完成問卷，感謝您的填寫」小視窗
- [x] 在完成提示視窗加入「返回」按鈕並回到問卷首頁
- [x] 補充完成狀態回歸測試並建立最新發布版本

## Completion modal checkpoint follow-up

- [x] 執行 `webdev_save_checkpoint` 儲存包含提交完成小視窗與返回首頁按鈕的最新版本
- [x] 向使用者交付新的 checkpoint/version ID，確認其對應到本次已通過 `pnpm test`、`pnpm check`、`pnpm build` 的程式狀態
