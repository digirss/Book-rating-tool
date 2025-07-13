# 📘 AI 書籍評分與推薦查詢工具

一個使用 Google Gemini AI 的書籍評分查詢工具，透過 AI 查詢多個書評平台的真實評分資料。

## ✨ 功能特色

- 🤖 使用 Google Gemini AI 查詢真實書籍評分
- 🔍 支援繁體/簡體中文書名搜尋
- 📊 整合多個書評平台評分
- 🎯 自動計算平均分數與推薦程度
- 📄 一鍵匯出 Markdown 評分報告
- ⚙️ 可自訂 API 金鑰和 AI 模型
- 💻 純前端實現，可部署至 GitHub Pages
- 📱 響應式設計，支援行動裝置

## 🌐 支援平台

### 主要查詢來源（優先）
- 豆瓣讀書
- Amazon Books
- Goodreads

### 備用查詢來源
- 博客來
- 讀墨 (Readmoo)
- Kobo

## 🔧 技術實現

- **AI 服務**: Google Gemini API
- **支援模型**: gemini:gemini-2.0-flash-lite-preview-02-05（可自訂）
- **前端框架**: 純 HTML/CSS/JavaScript
- **繁簡轉換**: OpenCC.js
- **評分統一**: 自動轉換為 10 分制
- **檔案匯出**: 原生 JavaScript Blob API
- **資料儲存**: localStorage（API 金鑰本地儲存）

## 📊 推薦程度分級

| 平均分數範圍 | 推薦程度 |
|-------------|---------|
| ≥ 8.5       | 非常推薦 |
| 7.0 ~ 8.4   | 可考慮閱讀 |
| 6.0 ~ 6.9   | 勉強一讀 |
| < 6.0       | 不推薦 |

## 🚀 使用方式

### 設定 API 金鑰（首次使用）
1. 打開 `index.html` 檔案
2. 點擊「⚙️ API 設定」按鈕
3. 輸入你的 Google Gemini API 金鑰
4. 確認模型名稱（預設：gemini:gemini-2.0-flash-lite-preview-02-05）
5. 點擊「💾 儲存設定」

### 查詢書籍評分
1. 在搜尋框輸入書名（繁體或簡體皆可）
2. 點擊「🔍 查詢」按鈕
3. 等待 AI 查詢各平台評分（約 10-30 秒）
4. 查看評分結果和推薦程度
5. 可選擇匯出 Markdown 報告

### 🔑 如何取得 Gemini API 金鑰
1. 前往 [Google AI Studio](https://aistudio.google.com/)
2. 登入 Google 帳號
3. 點擊「Get API Key」
4. 創建新的 API 金鑰
5. 複製金鑰並貼到工具設定中

## 📁 檔案結構

```
book-rating-tool/
├── index.html      # 主頁面
├── style.css       # 樣式檔案
├── script.js       # 核心邏輯
└── README.md       # 說明文件
```

## 🔮 未來改進

- [ ] 新增更多 AI 模型支援（Claude、GPT 等）
- [ ] 實現書籍封面顯示
- [ ] 新增評分歷史記錄功能
- [ ] 支援批量查詢功能
- [ ] 新增書評網站直接連結
- [ ] 實現評分趨勢分析

## ⚠️ 注意事項

- 需要有效的 Google Gemini API 金鑰
- API 金鑰儲存在瀏覽器本地，請勿在公共電腦使用
- 查詢速度取決於 AI 模型回應時間
- 評分準確度取決於 AI 的知識庫（截至訓練時間）
- 建議使用 HTTPS 協定以確保 API 安全性

## 💰 費用說明

- Google Gemini API 有免費額度限制
- 超出免費額度後會產生費用
- 建議查看 [Google AI 定價](https://ai.google.dev/pricing) 了解詳情

## 📄 授權

此專案僅供學習和參考使用。
