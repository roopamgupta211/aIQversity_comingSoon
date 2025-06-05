// AI Translation functionality using Gemini 2.5 Pro
// This is a module script that needs to be imported with type="module"

// Configuration
const GEMINI_API_KEY = "AIzaSyBr38XKvBXOz4eN8r9lkEuj2izj4Ag_zsg"; // Replace with your actual API key

// Translation state
let currentLanguage = 'en';
let isTranslating = false;
let translatedElements = new Set();
let genAI, model;

// Language configurations
const LANGUAGE_CONFIGS = {
    'hi': { name: 'Hindi', code: 'hi', native: 'हिंदी' },
    'kn': { name: 'Kannada', code: 'kn', native: 'ಕನ್ನಡ' },
    'ml': { name: 'Malayalam', code: 'ml', native: 'മലയാളം' },
    'gu': { name: 'Gujarati', code: 'gu', native: 'ગુજરાતી' },
    'mr': { name: 'Marathi', code: 'mr', native: 'मराठी' },
    'ta': { name: 'Tamil', code: 'ta', native: 'தமிழ்' },
    'te': { name: 'Telugu', code: 'te', native: 'తెలుగు' },
    'en': { name: 'English', code: 'en', native: 'English' }
};

// Initialize Gemini AI
async function initializeGemini() {
    try {
        const { GoogleGenerativeAI } = await import("https://esm.run/@google/generative-ai");
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash-8b" });
        console.log("Gemini AI initialized successfully");
    } catch (error) {
        console.error("Failed to initialize Gemini AI:", error);
    }
}

// Fast progress indicator
function createProgressIndicator() {
    const existing = document.getElementById('translationProgress');
    if (existing) existing.remove();
    
    const progressDiv = document.createElement('div');
    progressDiv.id = 'translationProgress';
    progressDiv.className = 'translation-progress';
    progressDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span class="ai-icon">⚡</span>
            <div>
                <div style="font-weight: bold; font-size: 14px;">Fast AI Translation</div>
                <div style="font-size: 12px; opacity: 0.8;">Powered by Gemini 2.5 Pro</div>
            </div>
        </div>
        <div class="translation-progress-bar">
            <div class="translation-progress-fill" id="progressFill" style="width: 0%"></div>
        </div>
        <div style="font-size: 11px; margin-top: 5px; opacity: 0.7;" id="progressText">Preparing...</div>
    `;
    document.body.appendChild(progressDiv);
    return progressDiv;
}

function updateProgress(percentage, text) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    if (progressFill) progressFill.style.width = percentage + '%';
    if (progressText) progressText.textContent = text;
}

function removeProgressIndicator() {
    const progressDiv = document.getElementById('translationProgress');
    if (progressDiv) {
        setTimeout(() => progressDiv.remove(), 800);
    }
}

// OPTIMIZED: Scan and batch elements efficiently
function scanAndBatchElements() {
    const batches = [];
    const selectors = [
        'h1, h2, h3, h4, h5, h6',
        'nav a, nav span, nav button',
        'p, span:not(.skip-translate)',
        'button:not(.skip-translate), a:not(.skip-translate)',
        'label, [placeholder], [alt], [title]'
    ];
    
    selectors.forEach((selector, priority) => {
        const batch = [];
        document.querySelectorAll(selector).forEach(el => {
            if (shouldTranslateElement(el)) {
                const textData = extractTextData(el);
                if (textData.text && textData.text.length > 1) {
                    batch.push({
                        element: el,
                        ...textData,
                        priority
                    });
                }
            }
        });
        
        if (batch.length > 0) {
            // Split large batches for faster processing
            const chunkSize = 15; // Optimal batch size for speed
            for (let i = 0; i < batch.length; i += chunkSize) {
                batches.push({
                    items: batch.slice(i, i + chunkSize),
                    priority
                });
            }
        }
    });
    
    return batches.sort((a, b) => a.priority - b.priority);
}

function shouldTranslateElement(element) {
    if (translatedElements.has(element)) return false;
    if (element.classList.contains('skip-translate') ||
        element.closest('script, style, code, pre') ||
        element.tagName === 'SCRIPT' ||
        element.tagName === 'STYLE') return false;
    
    const text = element.textContent?.trim();
    return (text && text.length > 1 && /[a-zA-Z]/.test(text)) ||
           element.hasAttribute('placeholder') || 
           element.hasAttribute('alt') || 
           element.hasAttribute('title');
}

function extractTextData(element) {
    if (element.hasAttribute('placeholder')) {
        return { text: element.getAttribute('placeholder'), type: 'placeholder' };
    }
    if (element.hasAttribute('alt')) {
        return { text: element.getAttribute('alt'), type: 'alt' };
    }
    if (element.hasAttribute('title')) {
        return { text: element.getAttribute('title'), type: 'title' };
    }
    return { text: element.textContent?.trim(), type: 'text' };
}

// OPTIMIZED: Batch translate multiple elements at once
async function batchTranslate(batch, targetLanguage) {
    if (!model) {
        console.error("Gemini model not initialized");
        return;
    }

    const { items } = batch;
    
    // Create text array for batch translation
    const textsToTranslate = items.map((item, index) => `${index + 1}. ${item.text}`).join('\n');
    
    // Add shimmer to all elements in batch
    items.forEach(item => item.element.classList.add('translating'));
    
    try {
        const prompt = `Translate the following numbered texts to ${LANGUAGE_CONFIGS[targetLanguage].name} (${LANGUAGE_CONFIGS[targetLanguage].native}). 
Maintain the same tone, context, and format. Return ONLY the translated texts with their numbers, one per line:

${textsToTranslate}`;
        
        // Use streaming for faster perception
        const result = await model.generateContentStream(prompt);
        let fullResponse = '';
        
        for await (const chunk of result.stream) {
            fullResponse += chunk.text();
        }
        
        // Parse response and apply translations
        const translations = parseTranslationResponse(fullResponse);
        
        items.forEach((item, index) => {
            const translatedText = translations[index + 1];
            if (translatedText) {
                applyTranslation(item, translatedText);
                
                // Cache translation
                const cacheKey = `translation_${targetLanguage}_${item.text}`;
                localStorage.setItem(cacheKey, translatedText);
            }
        });
        
    } catch (error) {
        console.error('Batch translation error:', error);
        items.forEach(item => item.element.classList.remove('translating'));
    }
}

function parseTranslationResponse(response) {
    const translations = {};
    const lines = response.split('\n');
    
    lines.forEach(line => {
        const match = line.match(/^(\d+)\.\s*(.+)$/);
        if (match) {
            const index = parseInt(match[1]);
            const translation = match[2].trim();
            translations[index] = translation;
        }
    });
    
    return translations;
}

function applyTranslation(item, translatedText) {
    const { element, type } = item;
    
    setTimeout(() => {
        element.classList.remove('translating');
        
        switch (type) {
            case 'placeholder':
                element.setAttribute('placeholder', translatedText);
                break;
            case 'alt':
                element.setAttribute('alt', translatedText);
                break;
            case 'title':
                element.setAttribute('title', translatedText);
                break;
            default:
                element.textContent = translatedText;
        }
        
        element.classList.add('translated');
        translatedElements.add(element);
    }, 50);
}

// OPTIMIZED: Process multiple batches in parallel
async function translatePage(targetLanguage) {
    if (isTranslating || targetLanguage === 'en') return;
    
    // Initialize Gemini if not already done
    if (!model) {
        await initializeGemini();
        if (!model) {
            alert('Translation service is not available. Please try again later.');
            return;
        }
    }
    
    isTranslating = true;
    currentLanguage = targetLanguage;
    
    const progressIndicator = createProgressIndicator();
    const batches = scanAndBatchElements();
    
    updateProgress(10, `Processing ${batches.length} content groups...`);
    
    // Process priority batches first (headers, navigation)
    const priorityBatches = batches.filter(b => b.priority <= 1);
    const otherBatches = batches.filter(b => b.priority > 1);
    
    // Translate priority content first
    if (priorityBatches.length > 0) {
        updateProgress(25, 'Translating headers and navigation...');
        await Promise.all(priorityBatches.map(batch => batchTranslate(batch, targetLanguage)));
    }
    
    updateProgress(60, 'Translating main content...');
    
    // Process remaining batches in parallel (max 3 at a time for rate limiting)
    const chunkSize = 3;
    for (let i = 0; i < otherBatches.length; i += chunkSize) {
        const chunk = otherBatches.slice(i, i + chunkSize);
        await Promise.all(chunk.map(batch => batchTranslate(batch, targetLanguage)));
        
        const progress = 60 + ((i + chunkSize) / otherBatches.length) * 35;
        updateProgress(Math.min(progress, 95), `Translating content... ${i + chunkSize}/${otherBatches.length}`);
    }
    
    updateProgress(100, 'Translation complete!');
    setTimeout(() => {
        removeProgressIndicator();
        isTranslating = false;
    }, 1000);
}

// Fast confirmation dialog
function showTranslationDialog(targetLanguage) {
    const langConfig = LANGUAGE_CONFIGS[targetLanguage];
    const confirmed = confirm(
        `🚀 Fast AI Translation to ${langConfig.name} (${langConfig.native})\n\n` +
        'This will translate the page content in seconds using batch processing.'
    );
    
    if (confirmed) {
        translatePage(targetLanguage);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeGemini();
});

// Expose functions globally
window.translatePage = translatePage;
window.showTranslationDialog = showTranslationDialog;
window.LANGUAGE_CONFIGS = LANGUAGE_CONFIGS; 