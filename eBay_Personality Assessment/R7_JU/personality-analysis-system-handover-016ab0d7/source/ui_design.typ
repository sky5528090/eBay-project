
#set page(
  paper: "a4",
  flipped: true,
  margin: (x: 2cm, y: 1.5cm),
  fill: rgb("FEF9F2"),
  header: align(right)[
    #text(size: 9pt, fill: rgb("789DBC"))[個人特質與工作現況分析系統 — Figma 風格 UI 設計規範與介面藍圖]
  ],
  footer: context [
    #grid(
      columns: (1fr, 1fr),
      text(size: 9pt, fill: rgb("888888"))[Confidential & Proprietary Design Spec],
      align(right, text(size: 9pt, fill: rgb("888888"))[Page #counter(page).display()])
    )
  ]
)

#set text(
  font: ("Noto Sans CJK TC", "Noto Sans TC", "Helvetica Neue", "Arial"),
  size: 11pt,
  fill: rgb("4A4A4A")
)

#let brandBlue = rgb("789DBC")
#let brandPink = rgb("FFE3E3")
#let brandGreen = rgb("A8D5BA")
#let darkText = rgb("4A4A4A")
#let cardBg = rgb("FFFFFF")
#let borderColor = rgb("E8E8E8")

#let mockupBox(title: "", content: none) = {
  block(
    width: 100%,
    fill: cardBg,
    inset: 15pt,
    radius: 12pt,
    stroke: 1pt + borderColor,
    stack(
      text(weight: "bold", size: 12pt, fill: brandBlue, title),
      v(8pt),
      content
    )
  )
}

// 封面頁
#align(center + horizon)[
  #text(size: 26pt, weight: "bold", fill: brandBlue)[個人特質與工作現況分析系統]
  #v(10pt)
  #text(size: 16pt, fill: darkText)[Figma 風格介面設計藍圖與視覺規範]
  #v(30pt)
  #block(
    fill: brandPink,
    inset: (x: 20pt, y: 10pt),
    radius: 20pt,
    text(size: 11pt, weight: "bold", fill: rgb("D885A3"))[溫暖日系風格 • 沉浸式問卷與管理後台]
  )
  #v(40pt)
  #text(size: 10pt, fill: rgb("888888"))[日期：2026年8月 | 版本：v1.0]
]

#pagebreak()

// 目錄與設計規範
#text(size: 18pt, weight: "bold", fill: brandBlue)[1. 設計系統與核心視覺規範 (Design Tokens)]
#v(10pt)

本系統採用溫暖日系莫蘭迪色系，營造療癒、專業且值得信賴的填寫氛圍。以下為設計規範清單：

#v(5pt)
#table(
  columns: (1fr, 2fr, 3fr),
  align: (center, left, left),
  fill: (col, row) => if row == 0 { brandBlue } else { none },
  stroke: 0.5pt + borderColor,
  [色票名稱], [HEX 數值], [應用場景],
  [Primary (主色)], [rgb("789DBC")], [按鈕、標題、選中邊框、主導視覺],
  [Accent (粉嫩輔助)], [rgb("FFE3E3")], [標籤、背景點綴、進度條未滿色],
  [Success (成功色)], [rgb("A8D5BA")], [提交成功、核取指標、完成狀態],
  [Background (背景色)], [rgb("FEF9F2")], [全域漸層背景、卡片底座],
  [Text (文字色)], [rgb("4A4A4A")], [主要內文、問題標題、表單說明]
)

#v(15pt)
#text(size: 14pt, weight: "bold", fill: brandBlue)[2. 核心介面架構]
#v(5pt)
本專案包含三大核心模組：
1. 公開前台（歡迎首頁與一題一屏問卷）：不需登入，點擊開始後以卡片彈跳方式流暢填寫 27 題，自動同步至資料庫。
2. 管理員後台（僅限 Admin 角色）：提供所有填寫紀錄列表、關鍵字搜尋、分頁、詳細內容檢視。
3. 資料匯出功能：支援一鍵將全部 27 題及提交時間戳記匯出為 CSV 檔。

#pagebreak()

// 畫面 1 & 2
#text(size: 16pt, weight: "bold", fill: brandBlue)[畫面一：前台歡迎首頁 (Landing Page)]
#v(10pt)

#mockupBox(title: "Screen 01: 公開前台歡迎首頁", content: [
  #grid(
    columns: (1fr, 1fr),
    gutter: 20pt,
    text(size: 10pt, [
      設計佈局與互動說明：
      - 置中療癒卡片設計，襯托溫暖背景。
      - 標題：「特質分析調查」。
      - 核心文案：「每個人都有屬於自己的天賦，與其努力成為別人，不如好好認識自己。」
      - 互動元素：點擊「開始填寫」按鈕後，無刷新平滑轉場至一題一屏填寫介面。
    ]),
    block(
      fill: rgb("FFFFFF"),
      inset: 12pt,
      radius: 8pt,
      stroke: 0.5pt + borderColor,
      align(center, [
        #text(size: 14pt)[🌱]
        #v(4pt)
        #text(weight: "bold", fill: brandBlue)[特質分析調查]
        #v(4pt)
        #text(size: 9pt, fill: rgb("888888"))[每個人都有屬於自己的天賦\n與其努力成為別人，不如好好認識自己。]
        #v(8pt)
        #block(fill: brandBlue, inset: (x: 12pt, y: 6pt), radius: 15pt, text(fill: white, size: 9pt)[開始填寫])
      ])
    )
  )
])

#v(15pt)
#text(size: 16pt, weight: "bold", fill: brandBlue)[畫面二：前台一題一屏填寫介面 (Card-per-Question)]
#v(10pt)

#mockupBox(title: "Screen 02: 一題一屏問卷卡片", content: [
  #grid(
    columns: (1fr, 1fr),
    gutter: 20pt,
    text(size: 10pt, [
      功能與體驗設計：
      - 頂部進度條：動態顯示 1 / 27 與百分比進度。
      - 題目顯示：支援短文字、日期、長文 textarea、單選與多選。
      - 導航按鈕：底部提供上一題與下一題。
      - 快捷操作：支援鍵盤左右方向鍵切換、Enter 鍵直接跳下一題。
    ]),
    block(
      fill: rgb("FFFFFF"),
      inset: 12pt,
      radius: 8pt,
      stroke: 0.5pt + borderColor,
      [
        #text(size: 9pt, weight: "bold", fill: brandBlue)[特質分析 (1 / 27)]
        #v(4pt)
        #text(size: 9pt, weight: "bold")[姓名 / 暱稱]
        #v(4pt)
        #block(fill: rgb("FAFAFA"), inset: 8pt, radius: 4pt, stroke: 0.5pt + borderColor, text(size: 8pt, fill: rgb("AAAAAA"))[請輸入您的答案...])
        #v(8pt)
        #grid(
          columns: (1fr, 1fr),
          block(fill: borderColor, inset: 6pt, align(center, text(size: 8pt)[上一題])),
          block(fill: brandBlue, inset: 6pt, align(center, text(size: 8pt, fill: white)[下一題]))
        )
      ]
    )
  )
])

#pagebreak()

// 畫面 3 & 4
#text(size: 16pt, weight: "bold", fill: brandBlue)[畫面三：管理員後台列表與搜尋 (Admin Dashboard)]
#v(10pt)

#mockupBox(title: "Screen 03: 後台填寫紀錄管理", content: [
  #grid(
    columns: (1fr, 1fr),
    gutter: 20pt,
    text(size: 10pt, [
      權限與後台功能：
      - 權限控管：僅限 admin 角色帳號登入。
      - 搜尋與篩選：支援依姓名、星座、職業進行關鍵字過濾。
      - 資料表格：展示流水號、姓名、生日、填寫時間及檢視詳情按鈕。
      - 批次導出：提供匯出完整 CSV 按鈕，支援離線分析。
    ]),
    block(
      fill: rgb("FFFFFF"),
      inset: 10pt,
      radius: 8pt,
      stroke: 0.5pt + borderColor,
      [
        #text(size: 9pt, weight: "bold")[問卷管理後台 | 總計 12 筆]
        #v(4pt)
        #block(fill: rgb("F0F0F0"), inset: 6pt, radius: 4pt, text(size: 8pt, fill: rgb("666666"))[搜尋姓名、星座、職業...])
        #v(4pt)
        #table(
          columns: (1fr, 1.5fr, 1.2fr, 1fr),
          align: (center, left, left, center),
          stroke: 0.3pt + borderColor,
          text(size: 7pt, weight: "bold")[ID], text(size: 7pt, weight: "bold")[姓名], text(size: 7pt, weight: "bold")[星座], text(size: 7pt, weight: "bold")[操作],
          text(size: 7pt)[1], text(size: 7pt)[王小明], text(size: 7pt)[天秤座], text(size: 7pt, fill: brandBlue)[詳情],
          text(size: 7pt)[2], text(size: 7pt)[李小華], text(size: 7pt)[水瓶座], text(size: 7pt, fill: brandBlue)[詳情]
        )
      ]
    )
  )
])

#v(15pt)
#text(size: 16pt, weight: "bold", fill: brandBlue)[畫面四：單筆紀錄詳情頁 (Submission Detail)]
#v(10pt)

#mockupBox(title: "Screen 04: 問卷詳細內容檢視", content: [
  #grid(
    columns: (1fr, 1fr),
    gutter: 20pt,
    text(size: 10pt, [
      詳情頁設計特色：
      - 完整呈現：一次展現 27 個欄位的完整填寫內容，分門別類。
      - 時間戳記：清晰記錄精確提交時間。
      - 友善返回：提供返回列表按鈕，便於管理員快速審閱多筆資料。
    ]),
    block(
      fill: rgb("FFFFFF"),
      inset: 10pt,
      radius: 8pt,
      stroke: 0.5pt + borderColor,
      [
        #text(size: 9pt, weight: "bold", fill: brandBlue)[問卷詳情 #01 - 王小明]
        #v(4pt)
        #text(size: 8pt)[提交時間: 2026-08-13 10:30]
        #text(size: 8pt)[生日: 1995-05-20 | 血型: O型]
        #text(size: 8pt)[職業: 軟體工程師 (3年)]
        #text(size: 8pt)[工作行為模式: 決定者 / 直來直往]
        #v(6pt)
        #block(fill: brandBlue, inset: (x: 8pt, y: 4pt), radius: 4pt, text(fill: white, size: 8pt)[返回列表])
      ]
    )
  )
])
