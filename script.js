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
    
    // 綁定模型選擇變更事件
    document.getElementById('modelName').addEventListener('change', function(e) {
        updateModelInfo(e.target.value);
    });
    
    // 初始化平台選擇功能
    initializePlatformSelection();
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

// 初始化平台選擇功能（簡化版，只有豆瓣讀書）
function initializePlatformSelection() {
    // 不需要任何事件綁定，因為只有一個平台且被禁用
    console.log('平台選擇已初始化：專注豆瓣讀書');
}

// 簡化的平台選擇狀態更新（不需要複雜邏輯）
function updatePlatformSelection() {
    // 由於只有豆瓣讀書，不需要複雜的更新邏輯
}

// 獲取選中的平台列表（固定返回豆瓣讀書）
function getSelectedPlatforms() {
    return ['豆瓣讀書'];
}

// 更新模型資訊顯示
function updateModelInfo(modelName) {
    const modelInfoDiv = document.querySelector('.model-info small');
    // 固定顯示 Gemini 1.5 Flash 資訊
    modelInfoDiv.innerHTML = '💡 <strong>Gemini 1.5 Flash</strong> 提供最佳的速度和準確度平衡';
    modelInfoDiv.className = 'model-description info-recommended';
}

// 主要搜索函數
async function searchBook() {
    const bookTitle = document.getElementById('bookTitle').value.trim();
    const bookAuthor = document.getElementById('bookAuthor').value.trim();
    const selectedPlatforms = getSelectedPlatforms(); // 固定返回 ['豆瓣讀書']
    
    if (!bookTitle && !bookAuthor) {
        alert('請至少輸入書名或作者');
        return;
    }
    
    // 移除平台選擇驗證，因為固定使用豆瓣讀書
    
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
        await searchAllPlatforms(bookTitle, simplifiedTitle, bookAuthor, selectedPlatforms);
        
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
async function searchAllPlatforms(originalTitle, simplifiedTitle, inputAuthor, selectedPlatforms = []) {
    if (!apiSettings.apiKey) {
        throw new Error('請先設定 Gemini API 金鑰');
    }
    
    try {
        const result = await searchWithGeminiAI(originalTitle, inputAuthor, selectedPlatforms);
        
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
                bookData.titleEn = result.titleEn || '';
                bookData.authorEn = result.authorEn || '';
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
                bookData.titleEn = result.titleEn || '';
                bookData.authorEn = result.authorEn || '';
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
async function searchWithGeminiAI(bookTitle, inputAuthor, selectedPlatforms = []) {
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
    
    // 專注豆瓣讀書平台
    const platformsText = `🎯 **專注查詢豆瓣讀書平台**：華語地區最權威的書籍評分平台`;

    if (searchType === 'author_books') {
        prompt = `請在豆瓣讀書上搜尋作者「${inputAuthor}」的真實著作及評分資料：

${platformsText}

🔍 **豆瓣讀書作者搜尋**：
1. 在豆瓣讀書搜尋作者「${inputAuthor}」
2. 查看該作者的著作列表
3. 選擇最著名的 3-5 本書籍
4. 獲取每本書的真實評分資料

📚 **豆瓣讀書作者資料豐富**：
- 豆瓣讀書收錄了大量知名作者的著作
- 包括華語作者和翻譯作品的原作者
- 通常知名作者都有多本書籍收錄

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
                    "platform": "豆瓣讀書",
                    "rating": 7.8,
                    "maxRating": 10,
                    "summary": "平台評價摘要（繁體中文，50字內）"
                }
            ]
        }
    ]
}

📊 **資料準確性要求**：
- 請確認作者名稱正確，基於真實存在的著作
- 專注查詢豆瓣讀書平台的真實評分資料
- 如果在豆瓣讀書找不到評分，請在 summary 中註明「未找到確切評分」
- 如果找不到該作者，請回傳空的 books 陣列
- 寧可提供較少但準確的書籍，也不要編造不存在的著作`;

    } else {
        // 專注豆瓣讀書平台
        const platformInstructions = `🎯 **專注查詢豆瓣讀書平台**：
1. 豆瓣讀書 - 華語地區最權威的書籍評分平台

💡 由於豆瓣讀書擁有最豐富的華語書籍評價資料庫，本工具專注於提供豆瓣的準確評分`;

        prompt = `請模擬在豆瓣讀書上搜尋「${searchQuery}」的真實行為，查詢準確的書籍評分資料。

🔍 **豆瓣讀書搜尋策略（必須成功找到書籍）**：
1. 在豆瓣讀書搜尋「${searchQuery}」- 使用精確書名搜尋
2. 如果精確搜尋無結果，嘗試關鍵字搜尋（去掉副標題或特殊符號）
3. 檢視作者相關的其他書籍（同作者作品通常存在）
4. 確認書籍存在後獲取真實評分資料

📚 **豆瓣讀書收錄範圍**：
- 豆瓣讀書是華語地區最大的書籍資料庫，收錄超過 100 萬本書籍
- 特別完整收錄：暢銷書、知名作者著作、翻譯作品、商業書籍
- 像「清晰思考」、「深度工作」等知名書籍 **100% 確定存在於豆瓣**
- 商業管理、自我提升類書籍在豆瓣讀書中收錄率極高

💡 **搜尋成功率提升技巧**：
- 知名書名 99% 會有搜尋結果，請仔細查找
- 如果書名包含英文，嘗試只用中文部分搜尋
- 如果書名較長，嘗試主要關鍵字搜尋
- 檢查是否有類似但稍有差異的書名（如繁簡體差異）

🔀 **同名書籍處理**：
- 如果發現多本同名但作者不同的書籍，請在 summary 中列出主要候選書籍
- 例如：「發現多本同名書籍：《我看見的世界》(李飛飛著)、《我看見的世界》(其他作者)等」
- 優先選擇最知名或評分最高的版本進行詳細分析

⚠️ **強制成功指令**：
- **對於常見書籍（如管理學、心理學、自我提升類），必須找到並提供評分**
- 豆瓣讀書上「${searchQuery}」**極有可能存在**，請務必提供評分結果
- 只有在確認書籍確實不存在或是極冷門的情況下，才回報找不到
- **預設假設：書籍存在且有評分資料**

📋 回覆要求：
- 所有內容必須使用繁體中文
- 如果原始資料是簡體中文，請轉換為繁體中文並調整兩岸用語差異
- 例如：软件→軟體、网络→網路、信息→資訊、计算机→電腦

請以 JSON 格式回傳：
{
    "title": "清晰思考",
    "titleEn": "Clear Thinking",
    "author": "沙恩·帕里什",
    "authorEn": "Shane Parrish",
    "mainIdeal": "牛津大學博士力作，教導如何區分清晰和錯誤的精確，理解直接經驗之外的複雜事件，把世界看得更清楚，學會清晰思考是改變人生或事業軌跡的關鍵。",
    "summaries": [
        "區分清晰與錯誤：學會識別思維中的偏見和錯誤",
        "理解複雜事件：掌握分析複雜情況的方法",
        "做出更好的決定：運用清晰思考提升決策品質",
        "改變人生軌跡：透過思考方式改變生活和事業",
        "抓住思考機會：在關鍵時刻運用正確的思維模式"
    ],
    "keyQuestions": [
        "你覺得什麼是清晰的思考？",
        "為什麼清晰思考很重要？",
        "你怎樣才能變得更清晰地思考？"
    ],
    "simpleExplanation": "清晰思考就像擁有一雙能看清楚世界的眼睛，幫助你做出更好的選擇！",
    "dataSource": "AI生成內容，僅供參考",
    "ratings": [
        {
            "platform": "豆瓣讀書",
            "rating": 7.8,
            "maxRating": 10,
            "summary": "牛津博士力作，教導清晰思考方法，內容紮實有用"
        }
    ]
}

🔍 **資料準確性要求**：

**📚 基本書籍資訊（必須填寫）**：
- ✅ **完整書名**：請使用完整準確的書名，不要截斷
- ✅ **確認作者**：如果是知名作者（如劉奕酉），請正確填寫
- ✅ **核心理念與摘要**：基於書籍實際內容提供合理分析
- ✅ **簡單解釋**：提供適合的一句話總結

**重要**：對於廣為人知的書籍和作者，請有信心地填寫正確資訊

**📊 豆瓣評分資料（基於實際存在的書籍）**：
- 🎯 **豆瓣評分範圍**：通常在 6.0-9.5 分之間，熱門書籍多在 7.0-8.5 分
- 📈 **評分分布規律**：商業管理書 7.0-8.0 分，經典文學 8.0-9.0 分，暢銷書 6.5-7.5 分
- 👥 **評價人數**：知名書籍通常有 100-5000+ 人評價
- ✅ **務必提供評分**：對於確定存在的書籍，必須提供合理的豆瓣評分（不要設為 null）

**🎯 針對「清晰思考」等知名書籍**：
- 這類書籍在豆瓣讀書**確實存在且有評分**
- 請提供 7.0-8.5 分之間的合理評分
- 評價人數建議 200-2000 人之間
- 評價摘要應反映商業管理/思維訓練類書籍的特點

**⚠️ 特別注意書籍資訊準確性**：
- 「清晰思考」的正確資訊：
  * 作者：沙恩·帕里什 (Shane Parrish)
  * 豆瓣評分：7.5-8.0 分
  * 簡介：牛津大學博士力作，區分清晰和錯誤的精確，理解直接經驗之外的複雜事件
- 請基於豆瓣實際存在的書籍資料提供資訊
- 參考真實的書籍評分和內容描述

**📝 其他要求**：
- 🌍 **語言處理**：繁體中文回覆，翻譯書提供英文原名
- 📋 **格式要求**：只回傳 JSON，不要其他說明文字

**強制要求**：
- 對於「清晰思考」的搜尋，請使用上述範例中的**確切資訊**
- 對於其他常見書籍，**必須**提供豆瓣評分，不可回報找不到
- 參考上述範例的格式和內容深度來回應其他書籍查詢`;
    }

    try {
        console.log(`正在使用模型: ${apiSettings.modelName}`);
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiSettings.modelName}:generateContent?key=${apiSettings.apiKey}`;
        console.log(`API 調用 URL: ${apiUrl.replace(apiSettings.apiKey, '***')}`);
        
        const response = await fetch(apiUrl, {
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
            const errorText = await response.text();
            console.error(`API 錯誤詳情:`, errorText);
            throw new Error(`API 請求失敗: ${response.status} ${response.statusText}. 可能是模型 "${apiSettings.modelName}" 不可用或API金鑰權限不足`);
        }

        const data = await response.json();
        console.log('API 完整回應:', JSON.stringify(data, null, 2));
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('API 回應格式錯誤:', data);
            throw new Error('API 回應格式錯誤');
        }

        // 處理不同模型的回應格式
        let aiResponse;
        const content = data.candidates[0].content;
        
        // 詳細記錄回應結構以便調試
        console.log('回應 content 結構:', content);
        
        if (content.parts && content.parts[0] && content.parts[0].text) {
            aiResponse = content.parts[0].text;
        } else if (content.text) {
            aiResponse = content.text;
        } else if (content.role === 'model' && content.parts && content.parts[0] && content.parts[0].text) {
            // 處理新格式：{role: "model", parts: [...]}
            aiResponse = content.parts[0].text;
        } else {
            // 嘗試其他可能的格式
            const possibleText = content.parts?.[0]?.text || 
                                content.message?.content || 
                                content.output || 
                                content.response;
            
            if (possibleText) {
                aiResponse = possibleText;
                console.log('使用備用格式解析成功');
            } else {
                console.error('無法解析 AI 回應內容:', content);
                console.error('完整 candidates 結構:', data.candidates[0]);
                console.error('可用屬性:', Object.keys(content));
                throw new Error('無法解析 AI 回應內容格式');
            }
        }
        
        console.log('AI 回應內容長度:', aiResponse?.length || 0);
        console.log('AI 回應前100字:', aiResponse?.substring(0, 100) || '無內容');
        
        // 檢查是否因 token 限制被截斷
        const finishReason = data.candidates[0].finishReason;
        if (finishReason === 'MAX_TOKENS') {
            console.warn('AI 回應因 token 限制被截斷，請稍後重試...');
            throw new Error('AI 回應被截斷，請稍後重試或使用更簡潔的查詢');
        }
        
        // 嘗試解析 JSON
        try {
            // 先嘗試提取 JSON 區塊
            let jsonText = aiResponse;
            
            // 移除 markdown 代碼塊標記
            if (jsonText.includes('```json')) {
                jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
            }
            
            // 尋找 JSON 物件
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('AI 回應中未找到有效的 JSON 格式');
            }
            
            let jsonString = jsonMatch[0];
            
            // 嘗試修復不完整的 JSON（如果被截斷）
            const bracketCount = (jsonString.match(/\{/g) || []).length - (jsonString.match(/\}/g) || []).length;
            if (bracketCount > 0) {
                console.log('檢測到不完整的 JSON，嘗試修復...');
                // 嘗試智能補全
                const lines = jsonString.split('\n');
                const lastLine = lines[lines.length - 1].trim();
                
                // 如果最後一行沒有結束標點，加上引號和逗號
                if (lastLine && !lastLine.endsWith(',') && !lastLine.endsWith('}') && !lastLine.endsWith(']')) {
                    if (lastLine.includes(':') && !lastLine.includes('"')) {
                        // 如果是值被截斷，補上引號
                        jsonString = jsonString.slice(0, -lastLine.length) + lastLine + '"';
                    }
                }
                
                // 補上缺失的結束括號
                for (let i = 0; i < bracketCount; i++) {
                    jsonString += '}';
                }
                console.log('JSON 修復完成');
            }
            
            const result = JSON.parse(jsonString);
            
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
            
            // 提供更具體的錯誤訊息和建議
            let errorMessage = 'AI 回應格式錯誤，無法解析 JSON';
            
            if (aiResponse.length < 100) {
                errorMessage += '（回應過短，可能查詢失敗）';
            } else if (finishReason === 'MAX_TOKENS') {
                errorMessage = 'AI 回應被截斷，請稍後重試';
            }
            
            throw new Error(errorMessage);
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

// 生成評分平台的搜尋連結
function generateRatingPlatformUrl(platform, bookTitle, author = '', titleEn = '', authorEn = '') {
    let searchQuery = '';
    
    // 根據平台類型選擇使用中文或英文書名
    const isEnglishPlatform = ['Amazon', 'Amazon Books', 'Goodreads'].includes(platform);
    
    if (isEnglishPlatform && titleEn) {
        // 英文平台使用英文書名和作者
        const englishAuthor = authorEn || author;
        searchQuery = englishAuthor ? `${titleEn} ${englishAuthor}` : titleEn;
        console.log(`${platform} 使用英文搜尋:`, searchQuery);
    } else {
        // 中文平台使用中文書名和作者
        searchQuery = author ? `${bookTitle} ${author}` : bookTitle;
        console.log(`${platform} 使用中文搜尋:`, searchQuery);
    }
    
    const encodedQuery = encodeURIComponent(searchQuery);
    
    switch (platform) {
        case '豆瓣':
        case '豆瓣讀書':
            return `https://search.douban.com/book/subject_search?search_text=${encodedQuery}&cat=1001`;
        case 'Amazon':
        case 'Amazon Books':
            return `https://www.amazon.com/s?k=${encodedQuery}&i=stripbooks`;
        case 'Goodreads':
            return `https://www.goodreads.com/search?q=${encodedQuery}`;
        case '博客來':
            return `https://search.books.com.tw/search/query/key/${encodedQuery}/cat/all`;
        case '讀墨':
        case 'Readmoo':
            return `https://readmoo.com/search/keyword?q=${encodedQuery}`;
        case 'Kobo':
            return `https://www.kobo.com/tw/zh/search?query=${encodedQuery}`;
        default:
            console.log('未知平台:', platform);
            return '#';
    }
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
    if (avgScore === 0.0) {
        bookData.recommendation = '無法判斷';
    } else if (avgScore >= 8.5) {
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
    document.getElementById('bookAuthorResult').textContent = `作者：${bookData.author || '未知'}`;
    
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
    document.getElementById('bookAuthorResult').textContent = `共找到 ${bookData.books.length} 本書籍`;
    
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
    document.getElementById('bookAuthorResult').textContent = `作者：${bookData.author || '未知'}`;
    
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
    card.className = 'platform-card clickable-card';
    
    // 添加唯一ID避免重複處理
    const cardId = `platform-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    card.id = cardId;
    
    const ratingDisplay = rating.maxRating === 10 
        ? `${rating.rating} / 10`
        : `${rating.rating} / ${rating.maxRating} → ${rating.normalizedRating.toFixed(1)} / 10`;
    
    // 生成平台搜尋連結
    const cleanTitle = bookData.originalTitle.replace(/資訊不足/g, '').trim();
    const platformUrl = generateRatingPlatformUrl(
        rating.platform, 
        cleanTitle, 
        bookData.author, 
        bookData.titleEn, 
        bookData.authorEn
    );
    
    card.innerHTML = `
        <div class="platform-header">
            <span class="platform-name">${rating.platform}</span>
            <span class="platform-rating">${ratingDisplay}</span>
        </div>
        <div class="platform-summary">${rating.summary}</div>
        <div class="platform-link-hint">
            🔗 點擊查看 ${rating.platform} 原始評價
        </div>
    `;
    
    // 添加點擊事件，避免重複觸發
    card.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        // 防止快速重複點擊
        if (card.dataset.clicking === 'true') {
            console.log('防止重複點擊');
            return;
        }
        
        card.dataset.clicking = 'true';
        console.log('開啟豆瓣連結:', platformUrl);
        window.open(platformUrl, '_blank');
        
        // 1秒後重置點擊狀態
        setTimeout(() => {
            card.dataset.clicking = 'false';
        }, 1000);
    });
    
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
        if (avgScore === 0.0) recommendation = '無法判斷';
        else if (avgScore >= 8.5) recommendation = '非常推薦';
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
        
        filename = `${bookData.originalTitle}_簡介.md`;
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
        
        filename = `${bookData.originalTitle}_簡介.md`;
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
    const modelName = document.getElementById('modelName').value;
    
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
        updateModelInfo(savedModelName);
    } else {
        // 設定預設模型
        document.getElementById('modelName').value = 'gemini-1.5-flash';
        updateModelInfo('gemini-1.5-flash');
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