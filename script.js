// 全局變數
let bookData = {};
let platformRatings = [];

// OpenCC 繁簡轉換實例
let converter = null;

// API 設定
let apiSettings = {
    apiKey: '',
    modelName: 'gemini:gemini-2.0-flash-lite-preview-02-05'
};

// 初始化應用
document.addEventListener('DOMContentLoaded', function() {
    // 初始化 OpenCC
    initOpenCC();
    
    // 載入儲存的設定
    loadSettings();
    
    // 綁定 Enter 鍵事件
    document.getElementById('bookTitle').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchBook();
        }
    });
});

// 初始化 OpenCC 繁簡轉換
async function initOpenCC() {
    try {
        // 使用 s2t (簡體到繁體) 配置
        converter = OpenCC.Converter({ from: 't2s', to: 's2t' });
        console.log('OpenCC 初始化成功');
    } catch (error) {
        console.error('OpenCC 初始化失敗:', error);
    }
}

// 繁簡轉換函數
function convertToSimplified(text) {
    if (!converter) {
        console.warn('OpenCC 未初始化，返回原文');
        return text;
    }
    try {
        // 先轉為簡體
        const simplified = OpenCC.Converter({ from: 't2s', to: 's2t' })(text);
        return OpenCC.Converter({ from: 's2t', to: 't2s' })(text);
    } catch (error) {
        console.error('轉換失敗:', error);
        return text;
    }
}

// 主要搜索函數
async function searchBook() {
    const bookTitle = document.getElementById('bookTitle').value.trim();
    
    if (!bookTitle) {
        alert('請輸入書名');
        return;
    }
    
    // 顯示載入狀態
    showLoading();
    
    try {
        // 轉換為簡體（主要查詢用）
        const simplifiedTitle = convertToSimplified(bookTitle);
        
        // 初始化書籍資料
        bookData = {
            originalTitle: bookTitle,
            simplifiedTitle: simplifiedTitle,
            author: '',
            ratings: []
        };
        
        // 依序查詢各平台
        await searchAllPlatforms(bookTitle, simplifiedTitle);
        
        // 計算平均分數和推薦語
        calculateAverageAndRecommendation();
        
        // 顯示結果
        displayResults();
        
    } catch (error) {
        console.error('搜索過程中發生錯誤:', error);
        showError('搜索過程中發生錯誤，請稍後再試');
    }
}

// 使用 Gemini AI 查詢所有平台
async function searchAllPlatforms(originalTitle, simplifiedTitle) {
    if (!apiSettings.apiKey) {
        throw new Error('請先設定 Gemini API 金鑰');
    }
    
    try {
        const result = await searchWithGeminiAI(originalTitle);
        
        if (result && result.ratings && result.ratings.length > 0) {
            bookData.ratings = result.ratings;
            bookData.author = result.author || '未知';
            return;
        }
        
        throw new Error('AI 未找到任何評分資料');
    } catch (error) {
        console.error('AI 查詢失敗:', error);
        throw new Error(`查詢失敗: ${error.message}`);
    }
}

// 使用 Gemini AI 查詢書籍評分
async function searchWithGeminiAI(bookTitle) {
    const prompt = `請查詢書籍「${bookTitle}」在以下平台的評分和簡短摘要（繁體中文回覆）：

主要平台（優先查詢）：
1. 豆瓣讀書
2. Amazon Books  
3. Goodreads

備用平台（如果主要平台找不到）：
4. 博客來
5. 讀墨 (Readmoo)
6. Kobo

請以 JSON 格式回傳，格式如下：
{
    "title": "書名",
    "author": "作者",
    "ratings": [
        {
            "platform": "豆瓣",
            "rating": 7.8,
            "maxRating": 10,
            "summary": "書籍摘要或評價（繁體中文，50字內）"
        },
        {
            "platform": "Amazon",
            "rating": 4.2,
            "maxRating": 5,
            "summary": "書籍摘要或評價（繁體中文，50字內）"
        }
    ]
}

注意事項：
- 請提供真實存在的評分資料
- 如果某平台沒有該書籍，請跳過
- 評分請使用該平台的實際評分制度
- 摘要請使用繁體中文，簡潔明瞭
- 只回傳 JSON，不要其他文字`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${apiSettings.modelName}:generateContent?key=${apiSettings.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topK: 1,
                    topP: 1,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API 請求失敗: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('API 回應格式錯誤');
        }

        const aiResponse = data.candidates[0].content.parts[0].text;
        
        // 嘗試解析 JSON
        try {
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('AI 回應中未找到有效的 JSON');
            }
            
            const result = JSON.parse(jsonMatch[0]);
            
            // 正規化評分為 10 分制
            if (result.ratings) {
                result.ratings.forEach(rating => {
                    rating.normalizedRating = normalizeRating(rating.rating, rating.maxRating);
                });
            }
            
            return result;
        } catch (parseError) {
            console.error('JSON 解析失敗:', parseError);
            console.log('AI 原始回應:', aiResponse);
            throw new Error('AI 回應格式錯誤，無法解析 JSON');
        }
        
    } catch (error) {
        console.error('Gemini API 查詢失敗:', error);
        throw error;
    }
}

// 評分統一轉換邏輯
function normalizeRating(rating, maxRating) {
    return (rating / maxRating) * 10;
}

// 計算平均分數和推薦語
function calculateAverageAndRecommendation() {
    if (bookData.ratings.length === 0) {
        return;
    }
    
    // 確保所有評分都已正規化為 10 分制
    bookData.ratings.forEach(rating => {
        if (!rating.normalizedRating) {
            rating.normalizedRating = normalizeRating(rating.rating, rating.maxRating);
        }
    });
    
    // 計算平均分
    const totalScore = bookData.ratings.reduce((sum, rating) => sum + rating.normalizedRating, 0);
    bookData.averageScore = (totalScore / bookData.ratings.length).toFixed(1);
    
    // 生成推薦語
    const avgScore = parseFloat(bookData.averageScore);
    if (avgScore >= 8.5) {
        bookData.recommendation = '非常推薦';
    } else if (avgScore >= 7.0) {
        bookData.recommendation = '可考慮閱讀';
    } else if (avgScore >= 6.0) {
        bookData.recommendation = '勉強一讀';
    } else {
        bookData.recommendation = '不推薦';
    }
}

// 顯示結果
function displayResults() {
    // 隱藏載入狀態
    hideLoading();
    
    // 更新書籍資訊
    document.getElementById('bookTitleResult').textContent = bookData.originalTitle;
    document.getElementById('bookAuthor').textContent = `作者：${bookData.author || '未知'}`;
    
    // 更新平台評分
    const platformRatingsContainer = document.getElementById('platformRatings');
    platformRatingsContainer.innerHTML = '';
    
    bookData.ratings.forEach(rating => {
        const card = createPlatformCard(rating);
        platformRatingsContainer.appendChild(card);
    });
    
    // 更新平均分數和推薦語
    document.getElementById('averageScore').textContent = bookData.averageScore;
    document.getElementById('recommendation').textContent = bookData.recommendation;
    
    // 顯示結果區域
    document.getElementById('resultsSection').style.display = 'block';
}

// 創建平台評分卡片
function createPlatformCard(rating) {
    const card = document.createElement('div');
    card.className = 'platform-card';
    
    const ratingDisplay = rating.maxRating === 10 
        ? `${rating.rating} / 10`
        : `${rating.rating} / ${rating.maxRating} → ${rating.normalizedRating.toFixed(1)} / 10`;
    
    card.innerHTML = `
        <div class="platform-header">
            <span class="platform-name">${rating.platform}</span>
            <span class="platform-rating">${ratingDisplay}</span>
        </div>
        <div class="platform-summary">${rating.summary}</div>
    `;
    
    return card;
}

// 匯出 Markdown
function exportToMarkdown() {
    if (!bookData.ratings || bookData.ratings.length === 0) {
        alert('沒有資料可匯出');
        return;
    }
    
    let markdown = `# 書名：${bookData.originalTitle}\n`;
    markdown += `## 作者：${bookData.author || '未知'}\n\n`;
    
    // 各平台評分
    bookData.ratings.forEach(rating => {
        const ratingDisplay = rating.maxRating === 10 
            ? `${rating.rating} / 10`
            : `${rating.rating} / ${rating.maxRating} → ${rating.normalizedRating.toFixed(1)} / 10`;
        
        markdown += `### ${rating.platform} 評分：${ratingDisplay}\n`;
        markdown += `摘要：${rating.summary}\n\n`;
    });
    
    markdown += `---\n\n`;
    markdown += `### 平均評分：${bookData.averageScore} / 10\n`;
    markdown += `### 推薦程度：${bookData.recommendation}\n`;
    
    // 下載檔案
    downloadMarkdown(markdown, `${bookData.originalTitle}_評分報告.md`);
}

// 下載 Markdown 檔案
function downloadMarkdown(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

// UI 控制函數
function showLoading() {
    document.getElementById('loadingSection').style.display = 'block';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loadingSection').style.display = 'none';
}

function showError(message) {
    hideLoading();
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorSection').style.display = 'block';
    document.getElementById('resultsSection').style.display = 'none';
}

// API 設定相關函數
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

function saveSettings() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const modelName = document.getElementById('modelName').value.trim();
    
    if (!apiKey) {
        alert('請輸入 API 金鑰');
        return;
    }
    
    if (!modelName) {
        alert('請輸入模型名稱');
        return;
    }
    
    // 儲存到本地存儲
    apiSettings.apiKey = apiKey;
    apiSettings.modelName = modelName;
    
    localStorage.setItem('bookRatingTool_apiKey', apiKey);
    localStorage.setItem('bookRatingTool_modelName', modelName);
    
    // 顯示成功訊息
    const status = document.getElementById('settingsStatus');
    status.textContent = '✅ 設定已儲存';
    status.style.color = '#28a745';
    
    setTimeout(() => {
        status.textContent = '';
        document.getElementById('settingsPanel').style.display = 'none';
    }, 2000);
}

function loadSettings() {
    // 從本地存儲載入設定
    const savedApiKey = localStorage.getItem('bookRatingTool_apiKey');
    const savedModelName = localStorage.getItem('bookRatingTool_modelName');
    
    if (savedApiKey) {
        apiSettings.apiKey = savedApiKey;
        document.getElementById('apiKey').value = savedApiKey;
    }
    
    if (savedModelName) {
        apiSettings.modelName = savedModelName;
        document.getElementById('modelName').value = savedModelName;
    } else {
        // 設定預設模型
        document.getElementById('modelName').value = 'gemini:gemini-2.0-flash-lite-preview-02-05';
    }
}