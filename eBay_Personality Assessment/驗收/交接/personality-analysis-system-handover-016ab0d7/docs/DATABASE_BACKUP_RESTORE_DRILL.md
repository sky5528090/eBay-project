# 資料庫備份與還原演練手冊

> 目的：讓專案持有人先在「測試資料庫」自行演練一次備份、還原與功能驗證。
>
> 重要限制：以下流程不應直接對 production 執行。正式資料包含姓名、生日、工作、家庭背景、問卷答案與 DISC 結果，屬於敏感個資。第一次演練請使用去識別化測試資料或 production 備份的受限副本。

## 一、演練目標

完成本演練後，應能回答四個問題：

1. 能否取得包含 schema、migration 狀態與資料的加密備份？
2. 能否在隔離的測試資料庫建立新資料庫並成功恢復？
3. 應用程式能否連到恢復後的資料庫並正常登入、查詢、提交與讀取品牌設定？
4. 如果恢復失敗，是否能保留原始備份、記錄錯誤並安全清除測試資料？

## 二、演練前準備

先準備一台只供演練使用的環境，建議使用本機 Docker MySQL、資料庫供應商的 staging instance，或 WebDev 的隔離 preview database。不要使用正式 production database 的連線字串直接測試。

需要準備：

- Node.js 與 pnpm
- 本專案原始碼與 `pnpm-lock.yaml`
- 一個測試資料庫連線字串
- 一個只具備測試資料庫權限的資料庫帳號
- 足夠的暫存磁碟空間
- 加密工具，例如 `gpg` 或平台原生 encrypted backup
- 一個安全的密碼管理器或獨立通道，用來傳遞備份密碼

建立演練資料夾：

```bash
mkdir -p ~/personality-backup-drill/{backup,restore,logs}
chmod 700 ~/personality-backup-drill
cd ~/personality-backup-drill
```

先確認本機不會把 secret 寫進 shell history。建議使用環境變數或互動式提示，不要把密碼直接寫在指令列：

```bash
read -rsp '測試資料庫密碼：' DRILL_DB_PASSWORD
export DRILL_DB_PASSWORD
printf '\n'
```

## 三、演練前的 production 保護措施

正式資料庫在整個演練期間只能讀取，不能做 migration、刪除、更新或測試提交。若使用 production 備份作為來源，先確認：

- 備份檔不會被放在 Git repository、網站靜態目錄或公開雲端連結。
- 備份檔已加密，且加密密碼透過不同通道傳遞。
- 接收者確實有權處理這些資料。
- 可以使用去識別化資料替代正式個資。
- 完成恢復驗證後會刪除暫存副本。

## 四、方法 A：使用資料庫供應商的原生備份

若資料庫供應商提供 snapshot／backup，優先使用原生方式，因為它通常能保留 charset、collation、index、trigger 與 timestamp。

操作順序：

1. 在資料庫管理介面建立一份標記清楚的 backup，例如 `handover-drill-YYYYMMDD`。
2. 將 backup 恢復到新的 staging database，不要覆蓋原 database。
3. 為 staging database 建立新的低權限連線帳號。
4. 將 staging 的 `DATABASE_URL` 暫時提供給本機或 preview 環境。
5. 執行下方的 schema、資料與應用程式驗證。
6. 演練成功後刪除 staging database、暫存連線字串與本機備份副本。

## 五、方法 B：使用 mysqldump 匯出

以下是傳統 MySQL／TiDB 相容的範例。將 `<...>` 替換成實際值；不要把真實密碼提交到檔案或聊天訊息。

### 1. 設定來源資料庫連線

```bash
export SOURCE_DB_HOST='<source-host>'
export SOURCE_DB_PORT='3306'
export SOURCE_DB_NAME='<source-database>'
export SOURCE_DB_USER='<read-only-export-user>'
read -rsp '來源資料庫密碼：' SOURCE_DB_PASSWORD
export SOURCE_DB_PASSWORD
printf '\n'
```

### 2. 確認連線與資料庫版本

```bash
MYSQL_PWD="$SOURCE_DB_PASSWORD" mysql \
  --host="$SOURCE_DB_HOST" \
  --port="$SOURCE_DB_PORT" \
  --user="$SOURCE_DB_USER" \
  --database="$SOURCE_DB_NAME" \
  --batch --skip-column-names \
  -e 'SELECT VERSION(), CURRENT_TIMESTAMP; SHOW TABLES;'
```

### 3. 匯出 schema 與資料

建議使用 transaction、single transaction、routines、events 與 triggers；若供應商不支援其中某項，記錄錯誤並依供應商文件調整。

```bash
BACKUP="${HOME}/personality-backup-drill/backup/submissions-$(date -u +%Y%m%dT%H%M%SZ).sql"

MYSQL_PWD="$SOURCE_DB_PASSWORD" mysqldump \
  --host="$SOURCE_DB_HOST" \
  --port="$SOURCE_DB_PORT" \
  --user="$SOURCE_DB_USER" \
  --databases "$SOURCE_DB_NAME" \
  --single-transaction \
  --routines \
  --events \
  --triggers \
  --hex-blob \
  --set-gtid-purged=OFF \
  --default-character-set=utf8mb4 \
  > "$BACKUP"

chmod 600 "$BACKUP"
sha256sum "$BACKUP" | tee "$BACKUP.sha256"
```

如果資料庫很大，請確認磁碟空間、執行時間與 provider 的連線 timeout。若 dump 失敗，不要重複對 production 進行寫入操作；先讀取錯誤並確認是否需要 provider 原生 backup。

### 4. 加密備份

以下示範使用互動式 GPG 密碼。密碼不得與 `.sql` 檔案放在同一個資料夾或同一封 Email。

```bash
gpg --symmetric --cipher-algo AES256 --output "$BACKUP.gpg" "$BACKUP"
sha256sum "$BACKUP.gpg" | tee "$BACKUP.gpg.sha256"
rm -f "$BACKUP"
```

請將 `.gpg` 與 checksum 分開保存，解密密碼透過密碼管理器或口頭／另一個安全通道傳遞。

## 六、在隔離資料庫還原

### 1. 建立新的測試資料庫

請由資料庫管理員或 provider 介面建立新的空白資料庫，例如：

```text
personality_handover_drill
```

不要用 production database 名稱，避免誤操作。

### 2. 解密並檢查檔案

```bash
cd ~/personality-backup-drill/restore
gpg --output restored.sql --decrypt ../backup/submissions-<timestamp>.sql.gpg
sha256sum --check ../backup/submissions-<timestamp>.sql.gpg.sha256
chmod 600 restored.sql
```

若 checksum 不一致，立即停止，不要還原該檔案。

### 3. 還原資料

```bash
export RESTORE_DB_HOST='<staging-host>'
export RESTORE_DB_PORT='3306'
export RESTORE_DB_NAME='personality_handover_drill'
export RESTORE_DB_USER='<staging-restore-user>'
read -rsp '測試資料庫密碼：' RESTORE_DB_PASSWORD
export RESTORE_DB_PASSWORD
printf '\n'

MYSQL_PWD="$RESTORE_DB_PASSWORD" mysql \
  --host="$RESTORE_DB_HOST" \
  --port="$RESTORE_DB_PORT" \
  --user="$RESTORE_DB_USER" \
  --database="$RESTORE_DB_NAME" \
  --default-character-set=utf8mb4 \
  < restored.sql
```

如果 dump 內含 `CREATE DATABASE` 或 `USE`，請先閱讀檔頭，確認不會指向 production database。必要時使用供應商提供的 restore wizard，而不是直接執行 SQL。

## 七、還原後資料庫驗證

```bash
MYSQL_PWD="$RESTORE_DB_PASSWORD" mysql \
  --host="$RESTORE_DB_HOST" \
  --port="$RESTORE_DB_PORT" \
  --user="$RESTORE_DB_USER" \
  --database="$RESTORE_DB_NAME" \
  --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM submissions; SELECT COUNT(*) FROM site_settings; SELECT COUNT(*) FROM admin_audit_logs;"
```

接著檢查主要表格與欄位：

```bash
MYSQL_PWD="$RESTORE_DB_PASSWORD" mysql \
  --host="$RESTORE_DB_HOST" \
  --port="$RESTORE_DB_PORT" \
  --user="$RESTORE_DB_USER" \
  --database="$RESTORE_DB_NAME" \
  -e 'SHOW TABLES; DESCRIBE submissions; DESCRIBE site_settings; DESCRIBE admin_audit_logs;'
```

確認 `drizzle/schema.ts` 與正式使用的 migration 都已存在。不要在沒有確認 schema 差異前直接執行 `drizzle-kit migrate`。

## 八、連接應用程式的驗證

在本機或隔離 preview 內設定測試資料庫的 `DATABASE_URL`，並補上必要的非 production secrets。不要把測試 secret 寫入 Git。

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test -- --run
pnpm build
pnpm dev
```

依序驗證：

1. 首頁可開啟。
2. OAuth 或測試管理員帳號可登入。
3. 後台紀錄列表可讀取。
4. Log 可搜尋、分頁與 API 錯誤篩選。
5. 品牌設定可讀取，品牌名稱與浮水印欄位存在。
6. 使用測試資料完成一份問卷，不要使用真實受測者資料。
7. PART 2 結果、PART 3 DISC 結果與 PNG／PDF 可以產生。
8. 測試刪除流程只對測試資料執行。

## 九、判定成功與失敗

### 成功條件

- checksum 通過。
- 所有預期表格存在。
- row count 與來源備份記錄一致或差異有合理說明。
- `pnpm check`、`pnpm test -- --run`、`pnpm build` 通過。
- 應用程式能完成登入、問卷、結果、品牌與 Log smoke test。

### 失敗處理

若恢復失敗，保留原始加密備份與錯誤 log，記錄時間、指令、資料庫版本與錯誤訊息。不要直接修改原始 dump，也不要再次對 production 執行破壞性指令。先刪除失敗的 staging database，建立新的隔離環境後再重試。

## 十、演練結束清理

確認結果已記錄後：

```bash
unset SOURCE_DB_PASSWORD RESTORE_DB_PASSWORD DRILL_DB_PASSWORD
rm -f ~/personality-backup-drill/restore/restored.sql
rm -rf ~/personality-backup-drill/restore
```

依資料保留政策刪除本機加密備份或移交至指定的加密備份庫。確認 staging database、臨時 IAM 帳號與測試 object key 都已清除或標記用途。

## 十一、演練記錄

| 欄位 | 紀錄 |
|---|---|
| 演練日期（UTC） | ____________________ |
| 執行人 | ____________________ |
| 來源 backup ID | ____________________ |
| 還原目標 | ____________________ |
| schema／版本 | ____________________ |
| row count 是否核對 | □ 是　□ 否 |
| 應用程式 smoke test | □ 通過　□ 未通過 |
| 是否清除 staging 與暫存檔 | □ 是　□ 否 |
| 異常與後續行動 | ____________________ |
