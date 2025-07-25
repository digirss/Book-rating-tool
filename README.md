# 📘 AI 書籍評分與推薦查詢工具

一個功能完整的 AI 驅動書籍分析平台，使用 Google Gemini AI 提供專業的書籍評分查詢和深度分析。

🌐 **線上版本**: [https://digirss.github.io/Book-rating-tool/](https://digirss.github.io/Book-rating-tool/)

## ✨ 核心功能

### 🤖 AI 智能查詢
- 使用 Google Gemini AI 查詢真實書籍評分
- 支援 4 種 Gemini 模型選擇（含收費標示）
- 採用 GPT-4o 驗證的成功查詢模式
- 強化繁體中文支援，自動轉換簡繁體和兩岸用語

### 📊 多平台整合
**主要平台**（優先查詢）：
- 豆瓣讀書
- Amazon Books
- Goodreads

**備用平台**（找不到時才查詢）：
- 博客來
- 讀墨 (Readmoo)
- Kobo

### 📋 豐富內容展示
- **💡 核心理念** - 書籍的 Main Ideal（100字內）
- **📋 五大重點摘要** - 每項 50 字內的精要摘要
- **❓ 三個核心問題** - 深度探討書籍價值
- **👶 給小朋友看** - 一句話總結

### 🔗 互動式體驗
- **點擊評分卡片** - 直接跳轉到原始評分頁面
- **智能搜尋連結** - 英文平台使用英文書名，中文平台使用中文書名
- **自動購書連結** - 5 個平台直接搜尋書籍

### 📄 專業報告功能
- 完整 Markdown 報告匯出
- 支援三種資料模式：單書評分、作者著作、無評分書籍
- 自動生成購書連結

## 🤖 支援的 AI 模型

| 模型 | 收費狀況 | 特色 |
|------|---------|------|
| **Gemini 1.5 Flash** (推薦) | 🆓 免費額度內 | 速度快、準確度高，日常使用最佳選擇 |
| **Gemini 1.5 Pro** | 💰 付費使用 | 最高準確度，複雜查詢專用 |
| **Gemini 2.0 Flash** (實驗版) | 🆓 免費額度內 | 最新實驗版本，功能強大 |
| **Gemini 1.0 Pro** | 🆓 免費額度內 | 穩定版本，基礎功能齊全 |

## 🎯 搜尋模式

### 📚 彈性搜尋支援
- **書名搜尋** - 只輸入書名，查詢該書籍
- **作者搜尋** - 只輸入作者，查詢該作者的所有著作
- **精確搜尋** - 同時輸入書名和作者，精確查詢

### 🌏 智能語言適配
- **英文平台** (Amazon、Goodreads) - 自動使用英文原書名搜尋
- **中文平台** (豆瓣、博客來、讀墨、Kobo) - 使用中文書名搜尋
- **自動清理** - 移除「資訊不足」等干擾文字

## 📊 推薦程度分級

| 平均分數範圍 | 推薦程度 | 說明 |
|-------------|---------|------|
| ≥ 8.5 | 非常推薦 | 高品質書籍，強烈建議閱讀 |
| 7.0 ~ 8.4 | 可考慮閱讀 | 品質良好，值得一讀 |
| 6.0 ~ 6.9 | 勉強一讀 | 普通品質，可依個人興趣選擇 |
| < 6.0 | 不推薦 | 品質較低，不建議閱讀 |

## 🚀 快速開始

### 1. 設定 API 金鑰
1. 前往 [Google AI Studio](https://aistudio.google.com/)
2. 使用 Google 帳號登入
3. 點擊「Get API Key」→「Create API key in new project」
4. 複製產生的 API 金鑰
5. 在工具中點擊「⚙️ API 設定」，輸入金鑰並儲存

### 2. 選擇 AI 模型
- **新手推薦**: Gemini 1.5 Flash（免費且效果好）
- **專業用戶**: Gemini 1.5 Pro（付費但準確度最高）
- **嘗鮮體驗**: Gemini 2.0 Flash 實驗版

### 3. 開始查詢
1. 輸入書名或作者（支援繁簡體中文）
2. 點擊「🔍 查詢」
3. 等待 AI 分析（10-30 秒）
4. 查看詳細分析結果
5. 點擊評分卡片查看原始評價
6. 匯出 Markdown 報告

## 🔧 技術架構

### 核心技術
- **前端框架**: 純 HTML5/CSS3/ES6 JavaScript
- **AI 服務**: Google Gemini API（多模型支援）
- **資料儲存**: localStorage（安全的本地儲存）
- **檔案匯出**: 原生 Blob API

### 安全特性
- **本地儲存**: API 金鑰僅存於用戶瀏覽器
- **不上傳資料**: 所有資料處理在本地進行
- **安全提醒**: 完整的使用安全指南

### 響應式設計
- **跨裝置支援**: 桌面、平板、手機完美適配
- **現代 UI**: 漸層背景、動畫效果、直觀操作
- **無障礙設計**: 清楚的視覺層次和操作提示

## 📁 專案結構

```
book-rating-tool/
├── index.html                    # 主頁面（含 API 設定介面）
├── style.css                     # 響應式樣式設計
├── script.js                     # 核心邏輯（AI 查詢、資料處理）
└── README.md                     # 專案說明文件
```

## 🌟 獨特特色

### 🎨 使用者體驗
- **一鍵操作**: 從查詢到匯出只需幾次點擊
- **視覺回饋**: 載入動畫、狀態提示、錯誤處理
- **智能提示**: 動態模型說明、平台收費標示

### 🔍 準確性提升
- **平台優先順序**: 主要平台優先，備用平台補充
- **資料來源透明**: 明確標示 AI 生成內容
- **錯誤處理**: 詳細的錯誤訊息和除錯資訊

### 🚀 效能優化
- **快速回應**: 選用高效 Gemini 1.5 Flash 作為預設
- **批次處理**: 智能的 API 調用策略
- **本地快取**: 設定資料本地儲存

## ⚠️ 重要說明

### 📋 使用須知
- ✅ 需要有效的 Google Gemini API 金鑰
- ✅ 支援所有現代瀏覽器（Chrome、Firefox、Safari、Edge）
- ⚠️ API 金鑰僅儲存在本地，請勿在公共電腦使用
- ⚠️ AI 生成內容僅供參考，建議自行驗證

### 💰 費用資訊
- **免費額度**: Gemini API 提供慷慨的免費使用額度
- **付費模型**: Gemini 1.5 Pro 需要付費，但準確度最高
- **費用控制**: 可在 Google AI Studio 中設定使用限制
- **詳細定價**: [Google AI 定價頁面](https://ai.google.dev/pricing)

### 🔒 隱私安全
- 🔐 所有資料本地處理，不上傳任何個人資訊
- 🛡️ API 金鑰加密儲存在 localStorage
- 🔄 提供完整的設定清除功能
- 📱 HTTPS 部署確保傳輸安全

## 🚀 部署說明

### GitHub Pages 部署
1. Fork 此專案到您的 GitHub 帳號
2. 進入專案設定 → Pages
3. 選擇 `main` 分支作為來源
4. 幾分鐘後即可透過 GitHub Pages URL 訪問

### 本地開發
```bash
# 克隆專案
git clone https://github.com/your-username/Book-rating-tool.git
cd Book-rating-tool

# 直接用瀏覽器開啟 index.html
# 或使用簡單的本地伺服器
python -m http.server 8000
# 然後訪問 http://localhost:8000
```

## 🤝 貢獻指南

歡迎提交 Issue 和 Pull Request！

### 開發歷程
- 🔄 所有功能都經過實際測試和用戶反饋優化
- 🎯 持續改進中，歡迎功能建議

## 📄 授權協議

此專案採用 MIT 授權協議，供學習和參考使用。

---

*最後更新：2025年7月13日*  
*專案維護：Leon & Claude*  
*技術支援：如有問題請提交 GitHub Issue*