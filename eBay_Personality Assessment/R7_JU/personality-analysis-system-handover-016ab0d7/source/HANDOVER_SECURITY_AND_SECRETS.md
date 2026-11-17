# 金鑰、帳號與敏感資料移交規範

## 重要原則

本文件只列出「金鑰名稱、用途、保管位置與移交方式」，不記錄任何實際 secret value。實際值不應出現在 Git、一般 Markdown、Email、截圖、Issue、聊天訊息或原始碼壓縮檔中。

## A. WebDev／部署環境

請在 WebDev 專案設定中確認以下環境變數已存在，再逐一輪替或以新工程師個別權限授權：

| 名稱 | 用途 | 移交方式 |
|---|---|---|
| `DATABASE_URL` | MySQL/TiDB 連線 | 建立新資料庫帳號或用密碼管理器分享；完成後輪替舊密碼 |
| `JWT_SECRET` | session cookie 簽章 | 由新環境重新產生；輪替後所有登入 session 可能需要重新登入 |
| `VITE_APP_ID` | Manus OAuth application ID | 確認 OAuth application 所有人與管理員 |
| `OAUTH_SERVER_URL` | OAuth server 位置 | 通常維持原值，確認新環境可讀取 |
| `OWNER_OPEN_ID` | 專案擁有者識別 | 改為新負責人前先確認 OAuth 帳號與 admin 權限 |
| `OWNER_NAME` | 專案擁有者名稱 | 依新負責人更新 |
| `BUILT_IN_FORGE_API_URL` | Manus 內建 API 入口 | 維持平台提供值 |
| `BUILT_IN_FORGE_API_KEY` | 後端內建 API 授權 | 必須以 server-side secret 保存並輪替 |
| `VITE_FRONTEND_FORGE_API_URL` | 前端 API 入口 | 確認是否仍被目前功能使用 |
| `VITE_FRONTEND_FORGE_API_KEY` | 前端可用 API key | 僅能使用可公開的受限 key；若不需要應移除 |
| `VITE_APP_TITLE` | 應用名稱 | 非秘密，可由新負責人確認 |
| `VITE_APP_LOGO` | logo URL | 非秘密，確認 URL 可公開存取 |

## B. OAuth 與管理員

- 確認 Manus OAuth application 的 owner、admin、redirect allowlist 與 callback 設定。
- 目前 callback 路徑為 `/api/oauth/callback`。
- 新工程師應使用自己的 OAuth 帳號登入，不共用原持有人的 Google／Manus 帳號。
- 透過後台團隊邀請加入新管理員；完成驗證後移除不再需要的管理員。
- 如更換網域，更新所有正式與 preview 網域的 OAuth allowlist。
- 交接後撤銷舊持有人的 session 與第三方登入授權。

## C. GitHub 與原始碼倉庫

- 將新工程師加入 repository 的最低必要權限，建議先使用 Write，發布權限另行授權。
- 不要將含有 access token 的 remote URL 傳給新工程師。
- 若曾把 token 放入 Git remote、shell history 或紀錄，應立即撤銷並重新建立 token。
- 將 CI/CD、Deploy key、Actions secret、Webhook secret 一併盤點。
- 交接完成後移除原持有人的個人 token，而非僅刪除本機 remote。

## D. 資料庫與個資

資料庫包含受測者姓名、生日、工作、家庭背景、問卷回答、DISC 答案與管理操作紀錄，屬於敏感個人資料。

移交資料庫時：

1. 先確認法律依據、隱私權政策與接任方的資料處理責任。
2. 只透過加密備份或平台原生 transfer 功能交付。
3. 不把 SQL dump 放進網站、Git repository 或公開雲端資料夾。
4. 備份檔使用獨立密碼加密，密碼透過另一個通道傳送。
5. 新工程師完成恢復測試後，再撤銷舊帳號與刪除臨時備份。
6. 保留刪除與恢復的操作紀錄。

## E. S3／物件儲存

品牌照片與其他媒體可能存放在 S3 相容儲存。移交時確認：

- bucket／project 名稱
- region
- object key 命名規則
- read／write policy
- CORS 設定
- presigned URL 或 storage proxy 設定
- lifecycle／備份／刪除規則
- 新工程師專用 access key

不要直接分享 root key。建立受限 service account，完成測試後撤銷舊 key。

## F. 網域與 DNS

確認新負責人擁有：

- 網域註冊商帳號
- DNS 管理權限
- DNSSEC／轉址設定（若有）
- SSL／TLS 驗證管理權限
- `personality.my` 與 `www.personality.my` 的管理權限

切換網域時保留原 Manus 網域作為備援，待新網域、OAuth、問卷送出、後台登入與下載功能都通過後再調整轉址。

## G. 交接完成後的輪替順序

建議順序如下：

1. 建立新工程師帳號與最小權限。
2. 建立加密備份並驗證可恢復。
3. 建立新的資料庫、S3、GitHub、OAuth 與平台 credentials。
4. 在 preview 套用新設定並完成 smoke test。
5. 發布新版本。
6. 確認正式環境可登入、提交、上傳品牌圖、匯出、查 Log。
7. 撤銷舊 credentials 與舊管理員權限。
8. 記錄輪替日期、執行人與驗證結果。
