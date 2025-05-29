// translation-system.js

class DynamicTranslator {
    constructor() {
        this.geminiApiKey = 'AIzaSyBr38XKvBXOz4eN8r9lkEuj2izj4Ag_zsg'; // Replace with your key
        this.currentLanguage = 'en';
        this.translationCache = new Map();
        this.isTranslating = false;
        this.supportedLanguages = {
            'hi': 'Hindi',
            'kn': 'Kannada', 
            'ml': 'Malayalam',
            'gu': 'Gujarati',
            'mr': 'Marathi',
            'ta': 'Tamil',
            'te': 'Telugu'
        };
    }

    // User consent modal
    showConsentModal(targetLanguage) {
        const modal = document.createElement('div');
        modal.id = 'translationConsentModal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 20000; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                    <h3 style="margin-bottom: 15px; color: #101E3D;">Translate to ${this.supportedLanguages[targetLanguage]}?</h3>
                    <p style="margin-bottom: 25px; color: #666;">We can translate this page content to ${this.supportedLanguages[targetLanguage]} for you. This may take a moment.</p>
                    <div style="display: flex; gap: 15px; justify-content: center;">
                        <button id="acceptTranslation" style="background: #F7A621; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;">Yes, Translate</button>
                        <button id="declineTranslation" style="background: #ccc; color: #333; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;">No, Keep English</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('acceptTranslation').onclick = () => {
            modal.remove();
            this.startTranslation(targetLanguage);
        };
        
        document.getElementById('declineTranslation').onclick = () => {
            modal.remove();
            this.setupLanguageSwitcher('en');
        };
    }

    // Translate text using Gemini API
    async translateText(text, targetLanguage) {
        const cacheKey = `${text}_${targetLanguage}`;
        if (this.translationCache.has(cacheKey)) {
            return this.translationCache.get(cacheKey);
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${this.geminiApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
						role:'user',
                        parts: [{
                            text: `Translate the following text to ${this.supportedLanguages[targetLanguage]}. Return only the translation, no explanations: "${text}"`
                        }]
                    }]
                })
            });

            const data = await response.json();
            const translation = data.candidates[0].content.parts[0].text.trim();
            
            // Cache the translation
            this.translationCache.set(cacheKey, translation);
            return translation;
        } catch (error) {
            console.error('Translation error:', error);
            return text; // Return original text if translation fails
        }
    }

    // Start translation process
    async startTranslation(targetLanguage) {
        if (this.isTranslating) return;
        this.isTranslating = true;
        this.currentLanguage = targetLanguage;

        // Show loading indicator
        this.showLoadingIndicator();

        // Get all elements to translate
        const elementsToTranslate = document.querySelectorAll('[data-translate="true"]');
        
        // Translate visible elements first (lazy loading)
        const visibleElements = Array.from(elementsToTranslate).filter(el => this.isElementVisible(el));
        const hiddenElements = Array.from(elementsToTranslate).filter(el => !this.isElementVisible(el));

        // Translate visible elements first
        await this.translateElements(visibleElements, targetLanguage);
        
        // Set up intersection observer for hidden elements
        this.setupLazyTranslation(hiddenElements, targetLanguage);
        
        this.hideLoadingIndicator();
        this.setupLanguageSwitcher(targetLanguage);
        this.isTranslating = false;
    }

    // Check if element is visible
    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
    }

    // Translate array of elements
    async translateElements(elements, targetLanguage) {
        const batchSize = 5; // Process 5 elements at a time
        
        for (let i = 0; i < elements.length; i += batchSize) {
            const batch = elements.slice(i, i + batchSize);
            const promises = batch.map(async (element) => {
                const originalText = element.textContent.trim();
                if (originalText) {
                    const translation = await this.translateText(originalText, targetLanguage);
                    element.textContent = translation;
                }
            });
            await Promise.all(promises);
        }
    }

    // Setup lazy translation for hidden elements
    setupLazyTranslation(hiddenElements, targetLanguage) {
        const observer = new IntersectionObserver(async (entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting && !entry.target.dataset.translated) {
                    const element = entry.target;
                    const originalText = element.textContent.trim();
                    if (originalText) {
                        const translation = await this.translateText(originalText, targetLanguage);
                        element.textContent = translation;
                        element.dataset.translated = 'true';
                    }
                    observer.unobserve(element);
                }
            }
        });

        hiddenElements.forEach(element => observer.observe(element));
    }

    // Loading indicator
    showLoadingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'translationLoader';
        indicator.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: #101E3D; color: white; padding: 15px 20px; border-radius: 8px; z-index: 15000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 20px; height: 20px; border: 2px solid #F7A621; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <span>Translating page...</span>
                </div>
            </div>
            <style>
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        `;
        document.body.appendChild(indicator);
    }

    hideLoadingIndicator() {
        const indicator = document.getElementById('translationLoader');
        if (indicator) indicator.remove();
    }

    // Language switcher (updated for dynamic translation)
    setupLanguageSwitcher(currentLang) {
        const existingSwitcher = document.getElementById('languageSwitcherContainer');
        if (existingSwitcher) existingSwitcher.remove();

        const switcherContainer = document.createElement('div');
        switcherContainer.id = 'languageSwitcherContainer';
        switcherContainer.style.cssText = `
            position: fixed; bottom: 20px; left: 20px; z-index: 10000; 
            font-family: Arial, sans-serif;
        `;

        const currentLangName = currentLang === 'en' ? 'English' : this.supportedLanguages[currentLang];
        const dropdownButton = document.createElement('button');
        dropdownButton.innerHTML = `🌐 ${currentLangName}`;
        dropdownButton.style.cssText = `
            padding: 12px 18px; background: rgba(16, 30, 61, 0.95); color: white;
            border: 1px solid rgba(247, 166, 33, 0.5); border-radius: 8px;
            font-size: 14px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;

        const dropdownContent = document.createElement('div');
        dropdownContent.style.cssText = `
            display: none; position: absolute; bottom: 100%; left: 0; margin-bottom: 5px;
            background: rgba(16, 30, 61, 0.95); min-width: 180px; border-radius: 8px;
            box-shadow: 0 0 15px rgba(0,0,0,0.5); max-height: 200px; overflow-y: auto;
        `;

        // Add English option
        this.addLanguageOption(dropdownContent, 'English', 'en', currentLang);
        
        // Add other language options
        Object.entries(this.supportedLanguages).forEach(([code, name]) => {
            this.addLanguageOption(dropdownContent, name, code, currentLang);
        });

        dropdownButton.onclick = () => {
            dropdownContent.style.display = dropdownContent.style.display === 'none' ? 'block' : 'none';
        };

        switcherContainer.appendChild(dropdownButton);
        switcherContainer.appendChild(dropdownContent);
        document.body.appendChild(switcherContainer);

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!switcherContainer.contains(e.target)) {
                dropdownContent.style.display = 'none';
            }
        });
    }

    addLanguageOption(container, name, code, currentLang) {
        const option = document.createElement('a');
        option.textContent = name;
        option.href = '#';
        option.style.cssText = `
            color: white; padding: 12px 18px; text-decoration: none; display: block;
            font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.1);
            ${code === currentLang ? 'background: rgba(247, 166, 33, 0.3); font-weight: bold;' : ''}
        `;

        option.onmouseover = () => {
            if (code !== currentLang) option.style.background = 'rgba(247, 166, 33, 0.2)';
        };
        option.onmouseout = () => {
            if (code !== currentLang) option.style.background = 'transparent';
        };

        option.onclick = async (e) => {
            e.preventDefault();
            if (code !== currentLang) {
                if (code === 'en') {
                    // Reload page for English
                    window.location.reload();
                } else {
                    // Translate to selected language
                    await this.startTranslation(code);
                }
            }
            container.style.display = 'none';
        };

        container.appendChild(option);
    }
}
