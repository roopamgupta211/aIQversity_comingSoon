// AI Translation functionality
// Standalone version - Upgraded for real-time feel with Intersection Observer

// Configuration
const GEMINI_API_KEY = "AIzaSyBr38XKvBXOz4eN8r9lkEuj2izj4Ag_zsg"; // Replace with your actual API key



// Translation state
let currentLanguage = 'en';
let isTranslating = false; // Indicates if the main translatePage setup is running
let translatedElements = new Map(); // Element -> type ('html', 'placeholder', etc.)
let originalContentCache = new Map(); // Stores original English content for elements
let genAI, model;

// Intersection Observer
let intersectionObserver = null;
let observedElementData = new Map(); // Stores data for elements being observed

// Language configurations
const LANGUAGE_CONFIGS = {
    'hi': { name: 'Hindi', code: 'hi', native: 'हिंदी' },
    'kn': { name: 'Kannada', code: 'kn', native: 'ಕನ್ನಡ' },
    'ml': { name: 'Malayalam', code: 'ml', native: 'മലയാളം' },
    'gu': { name: 'Gujarati', code: 'gu', native: 'ગુજરાતી' },
    'mr': { name: 'Marathi', code: 'mr', native: 'मराठी' },
    'ta': { name: 'Tamil', code: 'ta', native: 'தமிழ்' }, // Note: Original native was Bengali, corrected to Tamil
    'te': { name: 'Telugu', code: 'te', native: 'తెలుగు' },
    'en': { name: 'English', code: 'en', native: 'English' }
};

// Initialize Gemini AI
async function initializeGemini() {
    try {
        const { GoogleGenerativeAI } = await import("https://esm.run/@google/generative-ai");
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash-preview-05-20" }); // Ensure this model ID is current
        console.log("Translation service initialized");
    } catch (error) {
        console.error("Translation service unavailable:", error);
        // Potentially disable translation UI if service fails to init
    }
}

// Fast progress indicator
function createProgressIndicator() {
    const existing = document.getElementById('translationProgress');
    if (existing) existing.remove();
    
    const progressDiv = document.createElement('div');
    progressDiv.id = 'translationProgress';
    progressDiv.className = 'translation-progress'; // Ensure CSS for this class is present
    progressDiv.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
    <span id="progressText" style="font-size: 14px; color: #374151;">Translating</span>
    <span id="progressPercentage" style="font-size: 12px; color: #6b7280;">0%</span>
    </div>
    <div class="translation-progress-bar">
    <div class="translation-progress-fill" id="progressFill" style="width: 0%"></div>
    </div>
    `;
    document.body.appendChild(progressDiv);
    return progressDiv;
}

function updateProgress(percentage, text) {
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');
    const progressText = document.getElementById('progressText');
    if (progressFill) progressFill.style.width = percentage + '%';
    if (progressPercentage) progressPercentage.textContent = Math.round(percentage) + '%';
    if (progressText && text) progressText.textContent = text;
}

function removeProgressIndicator() {
    const progressDiv = document.getElementById('translationProgress');
    if (progressDiv) {
        // Fade out then remove for smoother UX
        progressDiv.style.opacity = '0';
        setTimeout(() => progressDiv.remove(), 500); // Match CSS transition if any
    }
}

// Check if text contains "aIQversity" which should never be translated
function containsPreservedText(text) {
    return text && text.toLowerCase().includes('aiqversity');
}

// Get element position for top-to-bottom ordering
function getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return rect.top + window.scrollY;
}

// Helper to check if element is in viewport (for initial translation)
function isElementInViewport(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return false;
    const rect = el.getBoundingClientRect();
    return (
        rect.top < window.innerHeight && rect.bottom >= 0 &&
        rect.left < window.innerWidth && rect.right >= 0
    );
}

// Extract content that needs translation
function extractTranslatableContent(element) {
    if (originalContentCache.has(element)) {
        return originalContentCache.get(element);
    }

    let originalData = { content: null, type: 'html', textContent: null }; // Default structure

    if (element.hasAttribute('placeholder')) {
        const placeholder = element.getAttribute('placeholder');
        if (!containsPreservedText(placeholder)) {
            originalData = { content: placeholder, type: 'placeholder' };
        }
    }
    if (element.hasAttribute('alt')) {
        const alt = element.getAttribute('alt');
        if (!containsPreservedText(alt)) {
            originalData = { content: alt, type: 'alt' };
        }
    }
    if (element.hasAttribute('title')) {
        const title = element.getAttribute('title');
        if (!containsPreservedText(title)) {
            originalData = { content: title, type: 'title' };
        }
    }

    // If we haven't found a specific attribute to translate, or if we want to prioritize HTML content
    if (originalData.content === null || originalData.type === 'html') {
        const htmlContent = element.innerHTML.trim();
        const textContent = element.textContent.trim();

        if (!containsPreservedText(textContent) && textContent.length > 1) {
            originalData = {
                content: htmlContent,
                textContent: textContent, // Store original textContent for cache key generation
                type: 'html'
            };
        }
    }
    
    // If content was found and is valid, store it in the original content cache
    if (originalData.content && originalData.content.length > 1) {
        originalContentCache.set(element, originalData);
    }
    return originalData;
}

// Get all translatable elements, sorted top-to-bottom
function getAllTranslatableElementsSorted() {
    const selectors = [
        'h1, h2, h3, h4, h5, h6',
        'nav a, nav span, nav button',
        'p, div.text-lg, div.text-xl, div.text-base, div.text-sm',
        'button:not(.skip-translate), a:not(.skip-translate)',
        'label, span:not(.skip-translate)',
        'li, td, th',
        '[placeholder]:not(svg *)',
        '[alt]:not(svg *)',
        '[title]:not(svg *)'
    ];
    
    const allElementsData = [];
    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            const contentData = extractTranslatableContent(el);
            if (contentData.content && contentData.content.length > 1) {
                allElementsData.push({
                    element: el,
                    ...contentData,
                    position: getElementPosition(el)
                });
            }
        });
    });
    
    allElementsData.sort((a, b) => a.position - b.position);
    console.log(`📍 Scanned ${allElementsData.length} potential elements (top-to-bottom order)`);
    return allElementsData;
}

function shouldTranslateElement(element) {
    // ... (Keep existing shouldTranslateElement function as is)
    if (translatedElements.has(element)) return false;
    if (element.classList.contains('skip-translate')) return false;
    if (element.tagName === 'TITLE' || element.closest('title')) return false;
    if (element.tagName === 'SVG' || 
    element.closest('svg') || 
    element.namespaceURI === 'http://www.w3.org/2000/svg') return false;
    if (element.closest('script, style, code, pre') ||
    element.tagName === 'SCRIPT' ||
    element.tagName === 'STYLE') return false;
    
    const innerHTML = element.innerHTML;
    const textContent = element.textContent?.trim();
    const outerHTML = element.outerHTML;
    
    if (textContent) {
    const cleanText = textContent.replace(/\s+/g, '').toLowerCase();
    if (cleanText === 'aiqversity' || 
    textContent.toLowerCase() === 'aiqversity' ||
    textContent.toLowerCase().includes('aiqversity')) {
    return false;
    }
    }
    if (innerHTML) {
    if (innerHTML.includes('a<span style="color: #F7A621">IQ</span>versity')) {
    return false;
    }
    if (innerHTML === 'IQ' && 
    (element.style.color === '#F7A621' || element.getAttribute('style')?.includes('#F7A621'))) {
    return false;
    }
    }
    if (outerHTML && outerHTML.includes('a<span style="color: #F7A621">IQ</span>versity')) {
    return false;
    }
    if (element.closest('span') && 
    element.closest('span').innerHTML && 
    element.closest('span').innerHTML.includes('a<span style="color: #F7A621">IQ</span>versity')) {
    return false;
    }
    if (element.querySelector('span[style*="#F7A621"]') && 
    textContent && textContent.toLowerCase().includes('aiqversity')) {
    return false;
    }
    
    const specialClasses = ['logo', 'icon', 'brand', 'code', 'syntax', 'highlight'];
    if (specialClasses.some(cls => element.className.includes(cls))) return false;
    
    if (element.classList.contains('float-animation') || 
    element.classList.contains('logo-shine') ||
    element.classList.contains('dashboard-mockup')) return false;
    
    if (containsPreservedText(textContent)) return false;
    if (!textContent || textContent.length < 2) {
        // Still check attributes if textContent is short/missing
        if (!(element.hasAttribute('placeholder') && !containsPreservedText(element.getAttribute('placeholder'))) &&
            !(element.hasAttribute('alt') && !containsPreservedText(element.getAttribute('alt'))) &&
            !(element.hasAttribute('title') && !containsPreservedText(element.getAttribute('title')))) {
            return false;
        }
    }
    
    return /[a-zA-Z]/.test(textContent) ||
    (element.hasAttribute('placeholder') && !containsPreservedText(element.getAttribute('placeholder'))) || 
    (element.hasAttribute('alt') && !containsPreservedText(element.getAttribute('alt'))) || 
    (element.hasAttribute('title') && !containsPreservedText(element.getAttribute('title')));
}

// Batch translate multiple elements
async function batchTranslate(batch, targetLanguage) {
    if (!model) {
        console.error("Gemini model not initialized");
        return;
    }

    const { items } = batch;
    if (!items || items.length === 0) return;

    items.forEach(item => item.element.classList.add('translating'));

    console.log(`--- Debug: batchTranslate for ${targetLanguage} ---`);
    console.log(`Number of items in batch: ${items.length}`);

    const contentToTranslate = items.map((item, index) => {
        if (item.type === 'html') {
            return `${index + 1}. HTML: ${item.content}`;
        } else {
            return `${index + 1}. ${item.type.toUpperCase()}: ${item.content}`;
        }
    }).join('\n\n');
    
    try {
        const prompt = `You are a web translation expert. Translate the following numbered content to ${LANGUAGE_CONFIGS[targetLanguage].name} (${LANGUAGE_CONFIGS[targetLanguage].native}).

CRITICAL RULES:
1. Do NOT translate "aIQversity" - keep it exactly as "aIQversity".
2. For HTML content: Translate ONLY the text content, preserve ALL HTML tags, attributes, styles, and structure EXACTLY.
3. For placeholder/alt/title content: Translate the text only.
4. Maintain the same tone, context, and format.
5. Return ONLY the translated content with numbers, preserving the original structure. If a piece of content should not be translated (e.g., it's already in the target language or is just a brand name like "aIQversity" based on rules), return the original content for that number.

Content to translate:

${contentToTranslate}`;
    
        const result = await model.generateContentStream(prompt);
        let fullResponse = '';
        for await (const chunk of result.stream) {
            fullResponse += chunk.text();
        }
    
        const translations = parseTranslationResponse(fullResponse);
    
        items.forEach((item, index) => {
            const translatedContent = translations[index + 1];
            console.log(`Item ${index + 1}: Type: ${item.type}`);
            console.log(`  Element:`, item.element);
            // console.log(`  Original Content being sent to Gemini:`, sourceContentForPrompt);
            // Check if translated content is meaningful and different
            if (translatedContent && translatedContent.trim() !== '' && translatedContent !== item.content) {
                applyTranslation(item, translatedContent);
                // Use original textContent (if available) or original content for a more stable cache key
                const originalTextForCache = item.textContent || item.content; 
                const cacheKey = `translation_${targetLanguage}_${originalTextForCache}`;
                try {
                    localStorage.setItem(cacheKey, translatedContent);
                } catch (e) {
                    console.warn("Could not cache translation, localStorage might be full.", e);
                }
            } else {
                // If no translation or same as original, remove shimmer and don't mark as translated
                item.element.classList.remove('translating');
            }
        });
    
    } catch (error) {
        console.error('Batch translation error:', error);
        items.forEach(item => item.element.classList.remove('translating'));
    }
}

// NEW: Intersection Observer callback
async function handleIntersection(entries, observer) {
    const newlyVisibleItems = [];
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const element = entry.target;
            if (observedElementData.has(element)) {
                const item = observedElementData.get(element);
                // Re-check shouldTranslateElement, as it also checks translatedElements set
                if (shouldTranslateElement(item.element)) {
                    newlyVisibleItems.push(item);
                }
                observer.unobserve(element);
                observedElementData.delete(element);
            }
        }
    });

    if (newlyVisibleItems.length > 0) {
        // Small visual cue for on-scroll translation (optional)
        // newlyVisibleItems.forEach(item => item.element.classList.add('translating-onscroll'));
        
        await batchTranslate({ items: newlyVisibleItems }, currentLanguage);
        
        // setTimeout(() => {
        //     newlyVisibleItems.forEach(item => item.element.classList.remove('translating-onscroll'));
        // }, 200);
    }
}

// MODIFIED: translatePage function
async function translatePage(targetLanguage) {
    if (targetLanguage === 'en') {
        // Revert all translated elements to their original English content
        if (translatedElements.size > 0) {
            console.log("Reverting to English...");
            translatedElements.forEach((type, element) => {
                revertElementToOriginal(element);
            });
        }
        translatedElements.clear();
        currentLanguage = 'en';
        isTranslating = false;
        if (intersectionObserver) {
            intersectionObserver.disconnect();
            observedElementData.clear();
        }
        // No full page reload needed if we manually revert
        // Optionally, remove progress indicator if it was somehow shown
        removeProgressIndicator(); 
        console.log("Page reverted to English.");
        return;
    }

    if (isTranslating && currentLanguage === targetLanguage) return; 

    if (!model) {
        await initializeGemini();
        if (!model) {
            alert('Translation service unavailable. Please try again later.');
            return;
        }
    }

    // If current language is not English and not the target language, revert to English first
    if (currentLanguage !== 'en' && currentLanguage !== targetLanguage) {
        console.log(`Switching from ${currentLanguage} to ${targetLanguage}. Reverting to English first.`);
        if (translatedElements.size > 0) {
            translatedElements.forEach((type, element) => {
                revertElementToOriginal(element);
            });
        }
        translatedElements.clear(); // Clear before re-populating for the new language
        // currentLanguage will be set to targetLanguage below
    }

    isTranslating = true;
    currentLanguage = targetLanguage;

    if (intersectionObserver) {
        intersectionObserver.disconnect();
    }
    observedElementData.clear();
    // translatedElements is cleared above if switching from non-English, or will be managed per-element
    // If switching from English to non-English, translatedElements should be empty or will be handled by shouldTranslateElement
    if (currentLanguage !== 'en' && Object.keys(LANGUAGE_CONFIGS).includes(currentLanguage)) {
        // Only clear if we are *not* coming from english and are going to a new non-english lang
        // This was already handled by the block above this - this is a safety check / clarification
    } else {
        // if targetLanguage is the first non-english lang, translatedElements should be empty.
        translatedElements.clear(); 
    }

    const progressIndicator = createProgressIndicator();
    updateProgress(10, "Scanning page...");

    const allPotentialElements = getAllTranslatableElementsSorted(); // This will now use original content
    const initialBatchItems = [];
    const elementsToObserve = [];

    allPotentialElements.forEach(item => {
        // item.content and item.textContent from extractTranslatableContent are now original English
        if (shouldTranslateElement(item.element)) { 
            const originalTextForCache = item.textContent || item.content;
            const cacheKey = `translation_${targetLanguage}_${originalTextForCache}`;
            const cachedTranslation = localStorage.getItem(cacheKey);
            if (cachedTranslation) {
                applyTranslation(item, cachedTranslation); 
            } else if (isElementInViewport(item.element)) {
                initialBatchItems.push(item);
            } else {
                elementsToObserve.push(item);
            }
        }
    });
    
    if (initialBatchItems.length > 0) {
        updateProgress(30, "Translating visible content...");
        await batchTranslate({ items: initialBatchItems }, targetLanguage);
        updateProgress(70, "Visible content processed.");
    } else {
        updateProgress(70, "No new visible content to translate immediately.");
    }

    // Setup Intersection Observer for the rest
    intersectionObserver = new IntersectionObserver(handleIntersection, {
        rootMargin: "200px 0px 200px 0px", // Start loading when 200px away from viewport
        threshold: 0.01 // Trigger when even a tiny part is visible
    });

    elementsToObserve.forEach(item => {
        // Ensure we don't observe elements already translated from cache or by initial batch
        if (shouldTranslateElement(item.element)) {
            observedElementData.set(item.element, item);
            intersectionObserver.observe(item.element);
        }
    });
    
    const remainingToObserve = observedElementData.size;
    if (remainingToObserve > 0) {
         updateProgress(100, `Translation active. ${remainingToObserve} elements will translate on scroll.`);
    } else if (initialBatchItems.length > 0) {
        updateProgress(100, "All content processed.");
    } else {
        updateProgress(100, "Page is up to date or in English.");
    }


    setTimeout(() => {
        removeProgressIndicator();
        isTranslating = false; // Mark main setup as done
    }, initialBatchItems.length > 0 || remainingToObserve > 0 ? 2000 : 500); // Shorter if nothing was done
}

function revertElementToOriginal(element) {
    if (originalContentCache.has(element)) {
        const originalData = originalContentCache.get(element);
        const originalContent = originalData.content;
        const type = originalData.type;

        if (originalContent === null) return; // Should not happen if cached correctly

        switch (type) {
            case 'placeholder':
                element.setAttribute('placeholder', originalContent);
                break;
            case 'alt':
                element.setAttribute('alt', originalContent);
                break;
            case 'title':
                element.setAttribute('title', originalContent);
                break;
            case 'html':
                element.innerHTML = originalContent;
                break;
        }
        element.classList.remove('translated', 'translating');
    }
}

function parseTranslationResponse(response) {
    // ... (Keep existing parseTranslationResponse function as is)
    const translations = {};
    const sections = response.split(/\n\s*\n/);
    
    sections.forEach(section => {
        const lines = section.split('\n');
        const firstLine = lines[0];
        // Regex to capture number, optional type (HTML:, PLACEHOLDER:, etc.), and content
        const match = firstLine.match(/^(\d+)\.\s*(?:(HTML|PLACEHOLDER|ALT|TITLE):\s*)?(.*)$/s);

        if (match) {
            const index = parseInt(match[1]);
            let content = match[3]; // Content from the first line after the type

            // If it's multi-line content (e.g. HTML was on first line, content on next)
            // or if content itself is multi-line
            if (lines.length > 1) {
                const remainingLines = lines.slice(1).join('\n');
                // If content from first line was empty and type was present, remainingLines is the content
                // Otherwise, append remainingLines to content from first line.
                if (content.trim() === '' && match[2]) {
                     content = remainingLines;
                } else {
                     content = content + '\n' + remainingLines;
                }
            }
            translations[index] = content.trim();
        } else if (section.trim() !== "") { // Handle cases where a section might not match, but isn't empty
            // This could be a malformed part of the response. For now, log it.
            // console.warn("Could not parse section:", section);
        }
    });
    return translations;
}

function applyTranslation(item, translatedContent) {
    const { element, type } = item;
    
    // Remove shimmer and apply translation with a slight delay for smoother visual updates
    // The 'translating' class is added in batchTranslate
    setTimeout(() => {
        element.classList.remove('translating');
    
        switch (type) {
            case 'placeholder':
                element.setAttribute('placeholder', translatedContent);
                break;
            case 'alt':
                element.setAttribute('alt', translatedContent);
                break;
            case 'title':
                element.setAttribute('title', translatedContent);
                break;
            case 'html':
                element.innerHTML = translatedContent;
                break;
        }
    
        element.classList.add('translated');
        translatedElements.set(element, type); // Mark as translated with its type
    }, 50); // Small delay for visual effect
}

// Professional confirmation dialog (from language-switcher, but good to have if used standalone)
function showTranslationDialog(targetLanguage) {
    // This function is primarily called by language-switcher.js now.
    // If translation-standalone.js is truly standalone, this can be used.
    const langConfig = LANGUAGE_CONFIGS[targetLanguage];
    if (!langConfig) {
        console.error("Invalid language code:", targetLanguage);
        return;
    }
    const confirmed = confirm(
        `Translate page to ${langConfig.name}?\n\nThis will translate the current page content while preserving "aIQversity" branding and styling.`
    );
    
    if (confirmed) {
        translatePage(targetLanguage);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => { // Delay to ensure other scripts/DOM modifications are done
        initializeGemini();
    }, 1000);
});

// Expose functions globally for language-switcher.js or direct calls
window.translatePage = translatePage;
window.showTranslationDialog = showTranslationDialog; // If needed by other scripts
window.LANGUAGE_CONFIGS = LANGUAGE_CONFIGS; // If needed by other scripts