# 個人特質與工作現況分析系統 — 系統總結與規格書

> **專案名稱**：個人特質與工作現況分析系統 (Personality & Work Analysis System)  
> **系統架構**：React 19 + TypeScript + Tailwind CSS 4 (前端) / Express + tRPC + Drizzle ORM + MySQL/TiDB (後端)  
> **交付版本**：`73121db9` (已通過完整測試、型別檢查與正式建置)

---

## 一、 系統概述與設計理念

本系統旨在提供受測者一個溫暖、無壓力的自我探索空間，同時賦予管理員強大的後台數據治理能力。介面設計融合了日系莫蘭迪色系、柔和陰影與流暢的動態回饋，讓填寫過程如同與自我對話。

### 核心特色
1. **溫暖日系美學**：採用乳白底色、暖藍與柔粉雙主色，輔以浮動圓點與日系插畫風格。
2. **沉浸式一題一屏 (Card-per-Question)**：將 27 道完整問題獨立為卡片式介面，提升填寫專注度與流暢度。
3. **完成提示與快速返回**：填寫完畢後自動彈出精緻置中完成視窗，並附帶帶有深色 hover 效果的「返回」按鈕。
4. **安全後台與角色授權**：嚴格的 `admin` 權限控管、邀請授權機制與完整數據治理。

---

## 二、 畫面架構與介面清單

系統分為「公開前台」與「管理後台」兩大版塊，對應的主要畫面如下：

| 畫面代號 | 畫面名稱 | 路由 / 入口 | 功能與視覺重點 |
| :--- | :--- | :--- | :--- |
| **P-01** | 公開歡迎首頁 | `/` | 溫暖日系主視覺、標語、開始填寫 CTA 與管理員入口連結。 |
| **P-02** | 27題一題一屏填寫介面 | `/` (點擊開始後) | 動態進度條、當前題數計數器、單選/多選/文字輸入卡片與導航。 |
| **P-03** | 問卷完成提示小視窗 | 填寫完第27題送出後 | 置中彈跳卡片、顯示「已完成問卷，感謝您的填寫」與返回首頁按鈕。 |
| **P-04** | 公開隱私權與刪除申請頁 | `/privacy` | 說明資料保護政策、提供受測者自主填寫 Email/姓名/生日申請刪除。 |
| **A-01** | 管理員登入 / 授權頁 | `/admin`, `/admin/invite` | OAuth 登入驗證、管理員邀請碼接受與角色升級。 |
| **A-02** | 問卷數據管理後台 | `/admin` | 分頁列表、關鍵字搜尋、星座/血型/婚姻/日期進階篩選、CSV 匯出。 |
| **A-03** | 單筆問卷詳情檢視 | `/admin` (點擊檢視) | 完整呈現 27 題受測者答題內容與提交時間。 |
| **A-04** | 團隊角色與邀請管理 | `/admin` (團隊分頁) | 管理現有管理者、產生授權邀請連結。 |
| **A-05** | 統計圖表與分析報告 | `/admin` (統計分頁) | 總提交數、星座/血型/職業分佈與近期提交趨勢。 |
| **A-06** | 資料刪除審核管理 | `/admin` (刪除分頁) | 審核與執行受測者的資料刪除申請。 |

---

## 三、 功能規格與資料模型

### 1. 資料庫表格設計 (Drizzle Schema)
- **`users`**：記錄系統使用者（`id`, `openId`, `name`, `email`, `role` [user/admin], `createdAt` 等）。
- **`submissions`**：記錄 27 題完整問卷數據（基本資料、行為模式、提交日期時間戳記）。
- **`adminInvitations`**：記錄管理員邀請碼、建立者、狀態與過期時間。
- **`deletionRequests`**：記錄受測者的資料刪除申請（申請人識別資料、原因、狀態）。

### 2. 資料流與安全規格
- **API 通訊**：採用 tRPC 11 進行型別安全的前後端呼叫，所有後台路由皆透過 `adminProcedure` 進行嚴格的身分與角色校驗。
- **資料隱私**：所有問卷提交與刪除動作均受後端保護，確保一般大眾僅能提交與申請刪除，唯有 `admin` 可存取分析數據。

---

## 四、 Figma 可匯入設計結構規格

為便於在 Figma 中重建或導入此系統的 UI 結構，下表定義了各頁面的元件階層與 Layout 規範：

```text
[Personality Analysis System - Design System]
├── 01. Foundational Tokens
│   ├── Colors: --warm-cream (#fef9f2), --warm-blue (#789dbc), --warm-pink (#ffe3e3), --warm-ink (#4a4a4a)
│   ├── Typography: Sans-serif (Inter / System default), Responsive headings
│   └── Radius: 28px - 32px (Cards), 999px (Buttons/Pills)
├── 02. Public Landing Page (Desktop / Mobile)
│   ├── Top Navigation (Brand mark + Admin Login Link)
│   ├── Hero Section (Asymmetric Grid: Copy on left, Warm Illustration + Quote on right)
│   └── Footer (Warm notes & Privacy link)
├── 03. Questionnaire Card View
│   ├── Top Bar (Back button, Progress indicator, Question counter)
│   ├── Interactive Card (Question title, subtitle, Choice grid / Input fields)
│   └── Bottom Actions (Previous, Next / Submit, Privacy notice)
└── 04. Completion Modal & Admin Dashboard
    - Completion Modal: Centered backdrop blur, Checkmark badge, Title, Reassurance text, Hover-enabled Return button.
    - Admin Layout: Persistent sidebar navigation, Data tables, Filter bars, Statistical charts, and Action modals.
```

*註：由於 Figma 官方 API 需要獨立的 OAuth 憑證授權，您可以直接將上述「Figma 可匯入設計結構規格」複製貼上至 Figma 文字圖層，或依此結構建立 Frame 與 Auto Layout。*

---
**References**
- 專案程式碼路徑：`/home/ubuntu/personality-analysis-system`
- 交付版本驗證：`73121db9` (Passed Vitest, tsc, and Vite build)
