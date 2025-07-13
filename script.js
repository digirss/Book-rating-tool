// 全局變數
let bookData = {};
let platformRatings = [];


// API 設定
let apiSettings = {
    apiKey: '',
    modelName: 'gemini-1.5-flash'
};

// 初始化應用
document.addEventListener('DOMContentLoaded', function() {
    // 載入儲存的設定
    loadSettings();
    
    // 綁定 Enter 鍵事件
    document.getElementById('bookTitle').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchBook();
        }
    });
    
    document.getElementById('bookAuthor').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchBook();
        }
    });
});

// 簡單的繁簡轉換（基本字符對應）
function convertToSimplified(text) {
    // 基本繁簡對應
    const tradToSimp = {
        '書': '书', '評': '评', '獲': '获', '與': '与', '為': '为',
        '說': '说', '經': '经', '過': '过', '開': '开', '關': '关',
        '來': '来', '會': '会', '時': '时', '個': '个', '這': '这',
        '們': '们', '對': '对', '學': '学', '體': '体', '現': '现',
        '機': '机', '動': '动', '語': '语', '長': '长', '問': '问',
        '題': '题', '發': '发', '當': '当', '種': '种', '進': '进'
    };
    
    let result = text;
    for (let [trad, simp] of Object.entries(tradToSimp)) {
        result = result.replace(new RegExp(trad, 'g'), simp);
    }
    return result;
}

// 主要搜索函數
async function searchBook() {
    const bookTitle = document.getElementById('bookTitle').value.trim();
    const bookAuthor = document.getElementById('bookAuthor').value.trim();
    
    if (!bookTitle && !bookAuthor) {
        alert('請至少輸入書名或作者');
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
            inputAuthor: bookAuthor,
            author: '',
            ratings: []
        };
        
        // 依序查詢各平台
        await searchAllPlatforms(bookTitle, simplifiedTitle, bookAuthor);
        
        // 處理結果顯示
        if (bookData.isAuthorSearch) {
            displayAuthorResults();
        } else {
            // 計算平均分數和推薦語
            calculateAverageAndRecommendation();
            // 顯示結果
            displayResults();
        }
        
    } catch (error) {
        console.error('搜索過程中發生錯誤:', error);
        if (error.message.includes('未找到任何評分資料')) {
            showError('找不到這本書的評分資料，請檢查書名是否正確或嘗試輸入作者名稱');
        } else {
            showError('查詢過程中發生錯誤，請稍後再試');
        }
    }
}

// 使用 Gemini AI 查詢所有平台
async function searchAllPlatforms(originalTitle, simplifiedTitle, inputAuthor) {
    if (!apiSettings.apiKey) {
        throw new Error('請先設定 Gemini API 金鑰');
    }
    
    try {
        const result = await searchWithGeminiAI(originalTitle, inputAuthor);
        
        if (result) {
            // 處理作者著作列表
            if (result.books && result.books.length > 0) {
                bookData.isAuthorSearch = true;
                bookData.author = result.author || inputAuthor;
                bookData.books = result.books;
                return;
            }
            // 處理單本書籍
            else if (result.ratings && result.ratings.length > 0) {
                bookData.ratings = result.ratings;
                bookData.author = result.author || '未知';
                bookData.mainSummary = result.mainSummary || '';
                bookData.simpleExplanation = result.simpleExplanation || '';
                return;
            }
        }
        
        throw new Error('AI 未找到任何評分資料');
    } catch (error) {
        console.error('AI 查詢失敗:', error);
        throw new Error(`查詢失敗: ${error.message}`);
    }
}

// 使用 Gemini AI 查詢書籍評分
async function searchWithGeminiAI(bookTitle, inputAuthor) {
    let searchType = '';
    let searchQuery = '';
    
    if (bookTitle && inputAuthor) {
        // 精確查詢特定書籍
        searchType = 'specific_book';
        searchQuery = `書名：${bookTitle}，作者：${inputAuthor}`;
    } else if (bookTitle) {
        // 只查詢書名
        searchType = 'book_only';
        searchQuery = `書名：${bookTitle}`;
    } else if (inputAuthor) {
        // 查詢作者的所有著作
        searchType = 'author_books';
        searchQuery = `作者：${inputAuthor}`;
    }
    
    let prompt = '';
    
    if (searchType === 'author_books') {
        prompt = `請列出作者「${inputAuthor}」的主要著作及其評分資料（繁體中文回覆）：

請以 JSON 格式回傳該作者的多本書籍：
{
    "author": "作者名稱",
    "books": [
        {
            "title": "書名1",
            "mainSummary": "書籍主旨摘要（繁體中文，100字內）",
            "simpleExplanation": "用一句話總結給十歲小朋友看（繁體中文，30字內）",
            "ratings": [
                {
                    "platform": "豆瓣",
                    "rating": 7.8,
                    "maxRating": 10,
                    "summary": "平台評價摘要（繁體中文，50字內）"
                }
            ]
        },
        {
            "title": "書名2",
            "mainSummary": "...",
            "simpleExplanation": "...",
            "ratings": [...]
        }
    ]
}

注意事項：
- 請確認作者名稱正確
- 列出該作者最著名的 3-5 本書
- 每本書都要有評分資料
- 如果找不到該作者，請回傳空的 books 陣列`;

    } else {
        prompt = `請查詢書籍「${searchQuery}」在以下平台的評分和簡短摘要（繁體中文回覆）：

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
    "mainSummary": "書籍主旨摘要（繁體中文，100字內，說明這本書的核心內容和主要觀點）",
    "simpleExplanation": "用一句話總結給十歲小朋友看（繁體中文，30字內，用簡單易懂的語言）",
    "ratings": [
        {
            "platform": "豆瓣",
            "rating": 7.8,
            "maxRating": 10,
            "summary": "平台評價摘要（繁體中文，50字內）"
        },
        {
            "platform": "Amazon",
            "rating": 4.2,
            "maxRating": 5,
            "summary": "平台評價摘要（繁體中文，50字內）"
        }
    ]
}

注意事項：
- 請務必核對書名和作者是否正確匹配
- 只查詢確實存在且評分資料可靠的書籍
- 如果找不到確切的書籍，請回傳空的 ratings 陣列
- 如果某平台沒有該書籍，請跳過
- 評分請使用該平台的實際評分制度
- mainSummary：說明書籍的核心內容、主要觀點和價值
- simpleExplanation：用十歲小朋友能理解的簡單語言解釋
- 所有文字請使用繁體中文，簡潔明瞭
- 只回傳 JSON，不要其他文字`;
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiSettings.apiKey}`, {
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

// 顯示作者著作列表結果
function displayAuthorResults() {
    // 隱藏載入狀態
    hideLoading();
    
    // 更新標題顯示為作者名稱
    document.getElementById('bookTitleResult').textContent = `${bookData.author} 的著作`;
    document.getElementById('bookAuthor').textContent = `共找到 ${bookData.books.length} 本書籍`;
    
    // 隱藏單本書的摘要區域
    document.querySelector('.book-summary').style.display = 'none';
    
    // 顯示作者的所有著作
    const platformRatingsContainer = document.getElementById('platformRatings');
    platformRatingsContainer.innerHTML = '';
    
    bookData.books.forEach(book => {
        const bookCard = createAuthorBookCard(book);
        platformRatingsContainer.appendChild(bookCard);
    });
    
    // 隱藏平均分數區域（因為是多本書）
    document.querySelector('.summary-section').style.display = 'none';
    
    // 顯示結果區域
    document.getElementById('resultsSection').style.display = 'block';
}

// 顯示單本書結果
function displayResults() {
    // 隱藏載入狀態
    hideLoading();
    
    // 顯示摘要和平均分數區域
    document.querySelector('.book-summary').style.display = 'block';
    document.querySelector('.summary-section').style.display = 'block';
    
    // 更新書籍資訊
    document.getElementById('bookTitleResult').textContent = bookData.originalTitle;
    document.getElementById('bookAuthor').textContent = `作者：${bookData.author || '未知'}`;
    
    // 更新書籍摘要
    document.getElementById('mainSummary').textContent = bookData.mainSummary || '暫無摘要';
    document.getElementById('simpleExplanation').textContent = bookData.simpleExplanation || '暫無簡易說明';
    
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

// 創建作者書籍卡片
function createAuthorBookCard(book) {
    const card = document.createElement('div');
    card.className = 'author-book-card';
    
    // 計算該書的平均分
    let totalScore = 0;
    let validRatings = 0;
    
    book.ratings.forEach(rating => {
        const normalizedRating = (rating.rating / rating.maxRating) * 10;
        totalScore += normalizedRating;
        validRatings++;
    });
    
    const averageScore = validRatings > 0 ? (totalScore / validRatings).toFixed(1) : '無評分';
    
    // 生成推薦語
    let recommendation = '無評分';
    if (validRatings > 0) {
        const avgScore = parseFloat(averageScore);
        if (avgScore >= 8.5) recommendation = '非常推薦';
        else if (avgScore >= 7.0) recommendation = '可考慮閱讀';
        else if (avgScore >= 6.0) recommendation = '勉強一讀';
        else recommendation = '不推薦';
    }
    
    card.innerHTML = `
        <div class="book-header">
            <h3 class="book-title">${book.title}</h3>
            <div class="book-score">
                <span class="score">${averageScore}/10</span>
                <span class="recommendation">${recommendation}</span>
            </div>
        </div>
        
        <div class="book-summaries">
            <div class="main-summary-inline">
                <strong>📖 內容：</strong>${book.mainSummary || '暫無摘要'}
            </div>
            <div class="simple-explanation-inline">
                <strong>👶 簡單說：</strong>${book.simpleExplanation || '暫無簡易說明'}
            </div>
        </div>
        
        <div class="book-ratings">
            ${book.ratings.map(rating => {
                const ratingDisplay = rating.maxRating === 10 
                    ? `${rating.rating}/10`
                    : `${rating.rating}/${rating.maxRating} → ${((rating.rating / rating.maxRating) * 10).toFixed(1)}/10`;
                
                return `
                    <div class="rating-item">
                        <span class="platform">${rating.platform}</span>
                        <span class="rating">${ratingDisplay}</span>
                        <span class="summary">${rating.summary}</span>
                    </div>
                `;
            }).join('')}
        </div>
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
    
    // 書籍摘要
    if (bookData.mainSummary) {
        markdown += `## 📖 書籍摘要\n`;
        markdown += `${bookData.mainSummary}\n\n`;
    }
    
    // 簡易說明
    if (bookData.simpleExplanation) {
        markdown += `## 👶 給小朋友看\n`;
        markdown += `${bookData.simpleExplanation}\n\n`;
    }
    
    markdown += `---\n\n`;
    
    // 各平台評分
    bookData.ratings.forEach(rating => {
        const ratingDisplay = rating.maxRating === 10 
            ? `${rating.rating} / 10`
            : `${rating.rating} / ${rating.maxRating} → ${rating.normalizedRating.toFixed(1)} / 10`;
        
        markdown += `### ${rating.platform} 評分：${ratingDisplay}\n`;
        markdown += `評價：${rating.summary}\n\n`;
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
    console.log('toggleSettings 被呼叫');
    const panel = document.getElementById('settingsPanel');
    
    if (!panel) {
        console.error('找不到 settingsPanel 元素');
        return;
    }
    
    const currentDisplay = window.getComputedStyle(panel).display;
    console.log('當前顯示狀態:', currentDisplay);
    
    if (currentDisplay === 'none') {
        panel.style.display = 'block';
        console.log('設定為顯示');
    } else {
        panel.style.display = 'none';
        console.log('設定為隱藏');
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
        document.getElementById('modelName').value = 'gemini-1.5-flash';
    }
}

function clearSettings() {
    if (confirm('確定要清除所有 API 設定嗎？此操作無法復原。')) {
        // 清除本地存儲
        localStorage.removeItem('bookRatingTool_apiKey');
        localStorage.removeItem('bookRatingTool_modelName');
        
        // 清除記憶體中的設定
        apiSettings.apiKey = '';
        apiSettings.modelName = 'gemini-1.5-flash';
        
        // 清除輸入欄位
        document.getElementById('apiKey').value = '';
        document.getElementById('modelName').value = 'gemini-1.5-flash';
        
        // 顯示成功訊息
        const status = document.getElementById('settingsStatus');
        status.textContent = '🗑️ 設定已清除';
        status.style.color = '#dc3545';
        
        setTimeout(() => {
            status.textContent = '';
        }, 3000);
    }
}