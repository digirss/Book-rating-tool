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
        } else if (bookData.noRatings) {
            displayNoRatingsResults();
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
                bookData.dataSource = result.dataSource || 'AI生成內容，僅供參考';
                return;
            }
            // 處理單本書籍（有評分）
            else if (result.ratings && result.ratings.length > 0) {
                bookData.ratings = result.ratings;
                bookData.author = result.author || '未知';
                bookData.mainIdeal = result.mainIdeal || '';
                bookData.summaries = result.summaries || [];
                bookData.keyQuestions = result.keyQuestions || [];
                bookData.simpleExplanation = result.simpleExplanation || '';
                bookData.dataSource = result.dataSource || 'AI生成內容，僅供參考';
                return;
            }
            // 處理找到書籍但無評分的情況
            else if (result.title && result.author) {
                bookData.noRatings = true;
                bookData.author = result.author;
                bookData.mainIdeal = result.mainIdeal || '';
                bookData.summaries = result.summaries || [];
                bookData.keyQuestions = result.keyQuestions || [];
                bookData.simpleExplanation = result.simpleExplanation || '';
                bookData.dataSource = result.dataSource || 'AI生成內容，僅供參考';
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
        prompt = `請查詢書籍「${searchQuery}」的詳細資訊和評分資料。

⭐ 查詢平台優先順序：
【主要平台】（優先查詢）：
1. 豆瓣讀書
2. Amazon Books  
3. Goodreads

【備用平台】（主要平台找不到時才查詢）：
4. 博客來
5. 讀墨 (Readmoo)
6. Kobo

📋 回覆要求：
- 所有內容必須使用繁體中文
- 如果原始資料是簡體中文，請轉換為繁體中文並調整兩岸用語差異
- 例如：软件→軟體、网络→網路、信息→資訊、计算机→電腦

請以 JSON 格式回傳：
{
    "title": "書名（繁體中文）",
    "author": "作者（繁體中文）",
    "mainIdeal": "書籍核心理念（繁體中文，100字內，說明這本書的核心思想和主要價值）",
    "summaries": [
        "摘要1：重點概念（50字內）",
        "摘要2：實用方法（50字內）",
        "摘要3：案例分析（50字內）",
        "摘要4：深度見解（50字內）",
        "摘要5：實踐應用（50字內）"
    ],
    "keyQuestions": [
        "這本書想解決什麼問題？",
        "作者提出了哪些創新觀點？",
        "讀者可以從中獲得什麼實用知識？"
    ],
    "simpleExplanation": "一句話總結給十歲小朋友看（繁體中文，30字內）",
    "dataSource": "AI生成內容，僅供參考",
    "ratings": [
        {
            "platform": "豆瓣",
            "rating": 7.8,
            "maxRating": 10,
            "summary": "平台評價摘要（繁體中文，50字內）"
        }
    ]
}

🔍 重要注意事項：
- 確保書籍資訊真實存在，不可編造虛假內容
- 評分必須來自實際平台，不可虛構
- 如果找不到評分，ratings 陣列設為空
- 所有簡體中文內容必須轉換為繁體中文
- 調整大陸用語為台灣用語（如：信息→資訊、软件→軟體）
- 只回傳 JSON，不要其他說明文字`;
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

// 生成購買連結，將書名帶入搜尋 URL
function generatePurchaseLinks(bookTitle, author = '') {
    // 清理書名，移除不必要的文字
    let cleanTitle = bookTitle
        .replace(/資訊不足/g, '')
        .replace(/\s+/g, ' ')  // 將多個空格合併為單個空格
        .trim();
    
    // 清理作者名稱
    let cleanAuthor = author ? author.replace(/資訊不足/g, '').trim() : '';
    
    const searchQuery = cleanAuthor ? `${cleanTitle} ${cleanAuthor}` : cleanTitle;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    return [
        {
            platform: "博客來",
            url: `https://search.books.com.tw/search/query/key/${encodedQuery}/cat/all`
        },
        {
            platform: "Amazon",
            url: `https://www.amazon.com/s?k=${encodedQuery}&i=stripbooks`
        },
        {
            platform: "誠品",
            url: `https://www.eslite.com/search?query=${encodedQuery}`
        },
        {
            platform: "讀墨",
            url: `https://readmoo.com/search/keyword?q=${encodedQuery}`
        },
        {
            platform: "Kobo",
            url: `https://www.kobo.com/tw/zh/search?query=${encodedQuery}`
        }
    ];
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

// 顯示無評分但有書籍資訊的結果
function displayNoRatingsResults() {
    // 隱藏載入狀態
    hideLoading();
    
    // 顯示摘要區域，隱藏平均分數區域
    document.querySelector('.book-summary').style.display = 'block';
    document.querySelector('.summary-section').style.display = 'none';
    
    // 更新書籍資訊
    const cleanTitle = bookData.originalTitle.replace(/資訊不足/g, '').trim();
    document.getElementById('bookTitleResult').textContent = cleanTitle;
    document.getElementById('bookAuthor').textContent = `作者：${bookData.author || '未知'}`;
    
    // 更新書籍內容
    const mainIdealText = bookData.mainIdeal || '暫無核心理念';
    const dataSourceWarning = bookData.dataSource ? `\n\n⚠️ ${bookData.dataSource}` : '';
    document.getElementById('mainIdeal').textContent = mainIdealText + dataSourceWarning;
    
    // 更新五大摘要
    const summariesContainer = document.getElementById('summaries');
    summariesContainer.innerHTML = '';
    if (bookData.summaries && bookData.summaries.length > 0) {
        bookData.summaries.forEach(summary => {
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'summary-item';
            summaryDiv.textContent = summary;
            summariesContainer.appendChild(summaryDiv);
        });
    } else {
        summariesContainer.innerHTML = '<div class="summary-item">暫無詳細摘要</div>';
    }
    
    // 更新核心問題
    const questionsContainer = document.getElementById('keyQuestions');
    questionsContainer.innerHTML = '';
    if (bookData.keyQuestions && bookData.keyQuestions.length > 0) {
        bookData.keyQuestions.forEach(question => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item';
            questionDiv.textContent = question;
            questionsContainer.appendChild(questionDiv);
        });
    } else {
        questionsContainer.innerHTML = '<div class="question-item">暫無核心問題</div>';
    }
    
    document.getElementById('simpleExplanation').textContent = bookData.simpleExplanation || '暫無簡易說明';
    
    // 顯示無評分提示和購買連結
    const platformRatingsContainer = document.getElementById('platformRatings');
    platformRatingsContainer.innerHTML = `
        <div class="no-ratings-card">
            <div class="no-ratings-header">
                <h3>📊 評分資訊</h3>
                <p>很抱歉，暫時找不到這本書在各大評分平台的資料。</p>
            </div>
            
            <div class="purchase-links">
                <h4>🛒 購書連結</h4>
                <div class="links-container">
                    ${generatePurchaseLinks(bookData.originalTitle, bookData.author).map(link => `
                        <a href="${link.url}" target="_blank" class="purchase-link">
                            ${link.platform}
                        </a>
                    `).join('')}
                </div>
            </div>
            
            <div class="suggestion">
                <p>💡 建議：您可以嘗試直接到各大購書網站搜尋，或等待更多評分資料上線。</p>
            </div>
        </div>
    `;
    
    // 顯示結果區域
    document.getElementById('resultsSection').style.display = 'block';
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
    const cleanTitle = bookData.originalTitle.replace(/資訊不足/g, '').trim();
    document.getElementById('bookTitleResult').textContent = cleanTitle;
    document.getElementById('bookAuthor').textContent = `作者：${bookData.author || '未知'}`;
    
    // 更新書籍內容
    const mainIdealText = bookData.mainIdeal || '暫無核心理念';
    const dataSourceWarning = bookData.dataSource ? `\n\n⚠️ ${bookData.dataSource}` : '';
    document.getElementById('mainIdeal').textContent = mainIdealText + dataSourceWarning;
    
    // 更新五大摘要
    const summariesContainer = document.getElementById('summaries');
    summariesContainer.innerHTML = '';
    if (bookData.summaries && bookData.summaries.length > 0) {
        bookData.summaries.forEach(summary => {
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'summary-item';
            summaryDiv.textContent = summary;
            summariesContainer.appendChild(summaryDiv);
        });
    } else {
        summariesContainer.innerHTML = '<div class="summary-item">暫無詳細摘要</div>';
    }
    
    // 更新核心問題
    const questionsContainer = document.getElementById('keyQuestions');
    questionsContainer.innerHTML = '';
    if (bookData.keyQuestions && bookData.keyQuestions.length > 0) {
        bookData.keyQuestions.forEach(question => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item';
            questionDiv.textContent = question;
            questionsContainer.appendChild(questionDiv);
        });
    } else {
        questionsContainer.innerHTML = '<div class="question-item">暫無核心問題</div>';
    }
    
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
    if (!bookData.originalTitle && !bookData.books) {
        alert('沒有資料可匯出');
        return;
    }
    
    let markdown = '';
    let filename = '';
    
    // 處理作者著作列表
    if (bookData.isAuthorSearch && bookData.books) {
        markdown = `# ${bookData.author} 的著作列表\n\n`;
        
        bookData.books.forEach((book, index) => {
            markdown += `## ${index + 1}. ${book.title}\n\n`;
            
            if (book.mainSummary) {
                markdown += `### 📖 書籍摘要\n${book.mainSummary}\n\n`;
            }
            
            if (book.simpleExplanation) {
                markdown += `### 👶 給小朋友看\n${book.simpleExplanation}\n\n`;
            }
            
            if (book.ratings && book.ratings.length > 0) {
                markdown += `### 評分資料\n`;
                book.ratings.forEach(rating => {
                    const ratingDisplay = rating.maxRating === 10 
                        ? `${rating.rating} / 10`
                        : `${rating.rating} / ${rating.maxRating} → ${((rating.rating / rating.maxRating) * 10).toFixed(1)} / 10`;
                    
                    markdown += `- **${rating.platform}**：${ratingDisplay} - ${rating.summary}\n`;
                });
                markdown += `\n`;
            }
            
            markdown += `---\n\n`;
        });
        
        filename = `${bookData.author}_著作列表.md`;
    }
    // 處理單本書籍（有評分）
    else if (bookData.ratings && bookData.ratings.length > 0) {
        markdown = `# 書名：${bookData.originalTitle}\n`;
        markdown += `## 作者：${bookData.author || '未知'}\n\n`;
        
        // 核心理念
        if (bookData.mainIdeal) {
            markdown += `## 💡 核心理念\n`;
            markdown += `${bookData.mainIdeal}\n\n`;
        }
        
        // 五大重點摘要
        if (bookData.summaries && bookData.summaries.length > 0) {
            markdown += `## 📋 五大重點摘要\n`;
            bookData.summaries.forEach((summary, index) => {
                markdown += `${index + 1}. ${summary}\n`;
            });
            markdown += `\n`;
        }
        
        // 核心問題探討
        if (bookData.keyQuestions && bookData.keyQuestions.length > 0) {
            markdown += `## ❓ 核心問題探討\n`;
            bookData.keyQuestions.forEach((question, index) => {
                markdown += `Q${index + 1}: ${question}\n`;
            });
            markdown += `\n`;
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
        
        filename = `${bookData.originalTitle}_評分報告.md`;
    }
    // 處理無評分書籍
    else {
        markdown = `# 書名：${bookData.originalTitle}\n`;
        markdown += `## 作者：${bookData.author || '未知'}\n\n`;
        
        // 核心理念
        if (bookData.mainIdeal) {
            markdown += `## 💡 核心理念\n`;
            markdown += `${bookData.mainIdeal}\n\n`;
        }
        
        // 五大重點摘要
        if (bookData.summaries && bookData.summaries.length > 0) {
            markdown += `## 📋 五大重點摘要\n`;
            bookData.summaries.forEach((summary, index) => {
                markdown += `${index + 1}. ${summary}\n`;
            });
            markdown += `\n`;
        }
        
        // 核心問題探討
        if (bookData.keyQuestions && bookData.keyQuestions.length > 0) {
            markdown += `## ❓ 核心問題探討\n`;
            bookData.keyQuestions.forEach((question, index) => {
                markdown += `Q${index + 1}: ${question}\n`;
            });
            markdown += `\n`;
        }
        
        // 簡易說明
        if (bookData.simpleExplanation) {
            markdown += `## 👶 給小朋友看\n`;
            markdown += `${bookData.simpleExplanation}\n\n`;
        }
        
        markdown += `---\n\n`;
        markdown += `## 📊 評分資訊\n`;
        markdown += `很抱歉，暫時找不到這本書在各大評分平台的資料。\n\n`;
        
        // 購書連結
        markdown += `## 🛒 購書連結\n`;
        const cleanExportTitle = bookData.originalTitle.replace(/資訊不足/g, '').trim();
        generatePurchaseLinks(cleanExportTitle, bookData.author).forEach(link => {
            markdown += `- [${link.platform}](${link.url})\n`;
        });
        markdown += `\n`;
        
        markdown += `## 💡 建議\n`;
        markdown += `您可以嘗試直接到各大購書網站搜尋，或等待更多評分資料上線。\n`;
        
        filename = `${bookData.originalTitle}_書籍資訊.md`;
    }
    
    // 下載檔案
    downloadMarkdown(markdown, filename);
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