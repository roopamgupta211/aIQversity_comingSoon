/* aIQversity Main Application JavaScript - Consolidated and Optimized */

// ============================================================================
// GLOBAL CONFIGURATION
// ============================================================================

const CONFIG = {
    // API Keys (move to environment variables in production)
    GEMINI_API_KEY: 'AIzaSyBr38XKvBXOz4eN8r9lkEuj2izj4Ag_zsg',
    MAPS_API_KEY: 'AIzaSyBr38XKvBXOz4eN8r9lkEuj2izj4Ag_zsg',
    FORM_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzddb27FVgEJ61ZoGJr6ZV8bk76KR4bY3YDqXLP8v-p2LLy6ptkScfUewwjBQPk_Yo1XA/exec',
    
    // Supported languages
    SUPPORTED_LANGUAGES: {
        'hi': 'Hindi',
        'kn': 'Kannada', 
        'ml': 'Malayalam',
        'gu': 'Gujarati',
        'mr': 'Marathi',
        'ta': 'Tamil',
        'te': 'Telugu'
    },
    
    // State to language mapping
    STATE_LANGUAGE_MAP: {
        'karnataka': 'kn',
        'kerala': 'ml',
        'gujarat': 'gu',
        'maharashtra': 'mr',
        'tamil nadu': 'ta',
        'telangana': 'te',
        'andhra pradesh': 'te'
    },
    
    HINDI_STATES: [
        'uttar pradesh', 'delhi', 'bihar', 'rajasthan', 'madhya pradesh',
        'haryana', 'jharkhand', 'chhattisgarh', 'uttarakhand', 'himachal pradesh'
    ]
};

// ============================================================================
// TRANSLATION SYSTEM CLASS
// ============================================================================

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
        this.intersectionObserver = null; // To hold the observer instance

        // Store original texts when the class is instantiated
        this.storeOriginalTexts();
    }

    // New method to store original text content
    storeOriginalTexts() {
        document.querySelectorAll('[data-translate="true"]').forEach(element => {
            // Store the initial text content in a data attribute
            element.dataset.originalText = element.textContent.trim();
        });
    }

    showConsentModal(targetLanguage) {
        // ... (your existing code for consent modal - no changes needed here)
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
            localStorage.setItem('preferredLanguage', 'en'); // User chose English
            this.currentLanguage = 'en'; // Explicitly set
            this.setupLanguageSwitcher('en');
        };
    }

    async translateText(text, targetLanguage) {
        // Use original text for cache key if available, otherwise current text
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
                        role: 'user',
                        parts: [{
                            text: `Translate the following text to ${this.supportedLanguages[targetLanguage]} based on daily use dialects. Return only the translation, no explanations: "${text}"; if "aIQversity" is present in the text, keep it as is and do not translate; Return only the translation.`
                        }]
                    }]
                })
            });
            if (!response.ok) {
                console.error(`Translation API error: ${response.status}`, await response.text());
                return text; // Return original text on API error
            }
            const data = await response.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                const translation = data.candidates[0].content.parts[0].text.trim();
                this.translationCache.set(cacheKey, translation);
                return translation;
            } else {
                console.error('Translation error: Unexpected API response format.', data);
                return text;
            }
        } catch (error) {
            console.error('Translation fetch error:', error);
            return text; // Return original text if translation fails
        }
    }

    async startTranslation(targetLanguage) {
        // Avoid re-translation if already on the target language and not currently translating
        if (this.currentLanguage === targetLanguage && !this.isTranslating) {
             // Check if elements actually need re-translation (e.g. if some failed before)
            const needsUpdate = Array.from(document.querySelectorAll('[data-translate="true"]'))
                                   .some(el => el.dataset.translatedTo !== targetLanguage);
            if (!needsUpdate) return;
        }
        if (this.isTranslating && this.currentLanguage === targetLanguage) return;


        this.isTranslating = true;
        this.currentLanguage = targetLanguage;

        this.showLoadingIndicator();

        const elementsToTranslate = Array.from(document.querySelectorAll('[data-translate="true"]'));
        const visibleElements = [];
        const hiddenElements = [];

        elementsToTranslate.forEach(el => {
            if (this.isElementVisible(el)) {
                visibleElements.push(el);
            } else {
                hiddenElements.push(el);
            }
        });

        await this.translateElements(visibleElements, targetLanguage);
        this.setupLazyTranslation(hiddenElements, targetLanguage); // This will (re)create the observer

        this.hideLoadingIndicator();
        this.setupLanguageSwitcher(targetLanguage);
        this.isTranslating = false;
    }

    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom >= 0 && rect.left < window.innerWidth && rect.right >= 0;
    }

    async translateElements(elements, targetLanguage) {
        const batchSize = 40; // Adjusted batch size
        for (let i = 0; i < elements.length; i += batchSize) {
            const batch = elements.slice(i, i + batchSize);
            const promises = batch.map(async (element) => {
                // Always use originalText if available
                const textToTranslate = element.dataset.originalText || element.textContent.trim();
                
                // Only translate if not already translated to the target language
                if (textToTranslate && element.dataset.translatedTo !== targetLanguage) {
                    const translation = await this.translateText(textToTranslate, targetLanguage);
                    element.textContent = translation;
                    element.dataset.translatedTo = targetLanguage;
                }
            });
            await Promise.all(promises);
        }
    }

    setupLazyTranslation(elementsToObserve, targetLanguage) {
        // Disconnect previous observer if it exists
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }

        this.intersectionObserver = new IntersectionObserver(async (entries, observerInstance) => {
            const elementsForBatch = [];
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    const element = entry.target;
                     // Check if it needs translation to the current targetLanguage
                    if (element.dataset.translatedTo !== targetLanguage) {
                        elementsForBatch.push(element);
                    }
                    // Unobserve after it has been processed for intersection,
                    // regardless of whether it was translated this specific time.
                    // It will be re-observed if startTranslation is called again for a new language.
                    observerInstance.unobserve(element);
                }
            }
            if (elementsForBatch.length > 0) {
                await this.translateElements(elementsForBatch, targetLanguage);
            }

        }, { rootMargin: '0px', threshold: 0.1 }); // Trigger when 10% visible

        elementsToObserve.forEach(element => {
            // Only observe if it's not already translated to the current target language
            if (element.dataset.translatedTo !== targetLanguage) {
                this.intersectionObserver.observe(element);
            }
        });
    }

    showLoadingIndicator() {
        // ... (your existing centered loading indicator code)
        const indicator = document.createElement('div');
        indicator.id = 'translationLoader';
        indicator.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #101E3D; color: white; padding: 20px 30px; border-radius: 10px; z-index: 15000; box-shadow: 0 6px 18px rgba(0,0,0,0.35); display: flex; align-items: center; gap: 15px;">
                <div style="width: 24px; height: 24px; border: 3px solid #F7A621; border-top: 3px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <span style="font-size: 16px;">Translating page...</span>
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

    setupLanguageSwitcher(currentLang) {
        // ... (your existing switcher code - but ensure it correctly reflects currentLang)
        let switcherContainer = document.getElementById('languageSwitcherContainer');
        let dropdownButton;
        let dropdownContent;

        if (!switcherContainer) {
            switcherContainer = document.createElement('div');
            switcherContainer.id = 'languageSwitcherContainer';
            switcherContainer.style.cssText = `
                position: fixed; bottom: 20px; left: 20px; z-index: 10000; 
                font-family: Arial, sans-serif;
            `;

            dropdownButton = document.createElement('button');
            dropdownButton.id = 'languageSwitcherButton';
            dropdownButton.style.cssText = `
                padding: 12px 18px; background: rgba(16, 30, 61, 0.95); color: white;
                border: 1px solid rgba(247, 166, 33, 0.5); border-radius: 8px;
                font-size: 14px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            `;

            dropdownContent = document.createElement('div');
            dropdownContent.id = 'languageSwitcherDropdown';
            dropdownContent.style.cssText = `
                display: none; position: absolute; bottom: 100%; left: 0; margin-bottom: 5px;
                background: rgba(16, 30, 61, 0.95); min-width: 180px; border-radius: 8px;
                box-shadow: 0 0 15px rgba(0,0,0,0.5); max-height: 200px; overflow-y: auto;
            `;

            dropdownButton.onclick = () => {
                dropdownContent.style.display = dropdownContent.style.display === 'none' ? 'block' : 'none';
            };

            switcherContainer.appendChild(dropdownButton);
            switcherContainer.appendChild(dropdownContent);
            document.body.appendChild(switcherContainer);

            document.addEventListener('click', (e) => {
                if (switcherContainer && !switcherContainer.contains(e.target)) {
                    const content = document.getElementById('languageSwitcherDropdown');
                    if (content) content.style.display = 'none';
                }
            });
        } else {
            dropdownButton = document.getElementById('languageSwitcherButton');
            dropdownContent = document.getElementById('languageSwitcherDropdown');
            dropdownContent.innerHTML = ''; 
        }

        const currentLangName = currentLang === 'en' ? 'English' : (this.supportedLanguages[currentLang] || 'English');
        dropdownButton.innerHTML = `🌐 ${currentLangName}`;
        
        this.addLanguageOption(dropdownContent, 'English', 'en', currentLang);
        Object.entries(this.supportedLanguages).forEach(([code, name]) => {
            this.addLanguageOption(dropdownContent, name, code, currentLang);
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
        option.onmouseover = () => { if (code !== currentLang) option.style.background = 'rgba(247, 166, 33, 0.2)'; };
        option.onmouseout = () => { if (code !== currentLang) option.style.background = 'transparent'; };

        option.onclick = async (e) => {
            e.preventDefault();
            container.style.display = 'none'; // Close dropdown first
            if (code !== this.currentLanguage) { // Check against internal state
                localStorage.setItem('preferredLanguage', code);
                if (code === 'en') {
                    // Revert to original English text without full reload
                    document.querySelectorAll('[data-translate="true"]').forEach(el => {
                        if (el.dataset.originalText) {
                            el.textContent = el.dataset.originalText;
                        }
                        el.dataset.translatedTo = 'en';
                    });
                    this.currentLanguage = 'en';
                    this.setupLanguageSwitcher('en'); // Update switcher display
                    if (this.intersectionObserver) {
                        this.intersectionObserver.disconnect(); // Stop observing
                    }
                } else {
                    await this.startTranslation(code);
                }
            }
        };
        container.appendChild(option);
    }
}

// ============================================================================
// GEOLOCATION & LANGUAGE DETECTION
// ============================================================================

function getLanguageByState(state) {
    if (!state) return 'en';
    
    const s = state.toLowerCase();
    
    // Check specific state mappings
    for (const [stateName, langCode] of Object.entries(CONFIG.STATE_LANGUAGE_MAP)) {
        if (s.includes(stateName)) return langCode;
    }

    // Check Hindi-speaking states
    if (CONFIG.HINDI_STATES.some(hindiState => s.includes(hindiState))) {
        return 'hi';
    }
    
    return 'en';
}

function initializeGeolocationTranslation() {
    // Check if user explicitly chose a language
    if (localStorage.getItem('userExplicitlyChoseLanguage') === 'true') {
        localStorage.removeItem('userExplicitlyChoseLanguage');
        window.translator.setupLanguageSwitcher('en');
        return;
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const geocoder = new google.maps.Geocoder();
                const latlng = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                geocoder.geocode({ location: latlng }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        const addressComponents = results[0].address_components;
                        let state = null;
                        for (let component of addressComponents) {
                            if (component.types.includes('administrative_area_level_1')) {
                                state = component.long_name;
                                break;
                            }
                        }
                        const targetLanguage = getLanguageByState(state);
                        if (targetLanguage && targetLanguage !== 'en') {
                            window.translator.showConsentModal(targetLanguage);
                        } else {
                            window.translator.setupLanguageSwitcher('en');
                        }
                    } else {
                        window.translator.setupLanguageSwitcher('en');
                    }
                });
            },
            () => {
                window.translator.setupLanguageSwitcher('en');
            }
        );
    } else {
        window.translator.setupLanguageSwitcher('en');
    }
}

// ============================================================================
// FORM HANDLING
// ============================================================================

function submitForm(event) {
    event.preventDefault();
    
    const form = document.getElementById('registrationForm');
    const formData = new FormData(form);
    const data = new URLSearchParams();
    
    for (const pair of formData) {
        data.append(pair[0], pair[1]);
    }
    
    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    
    fetch(CONFIG.FORM_SCRIPT_URL, {
        method: 'POST',
        body: data
    })
    .then(response => response.json())
    .then(data => {
        form.style.display = 'none';
        document.getElementById('registrationSuccess').classList.remove('hidden');
    })
    .catch(error => {
        console.error('Error!', error.message);
        alert('Something went wrong. Please try again later.');
    })
    .finally(() => {
        submitBtn.textContent = originalText;
    });
}

// ============================================================================
// MODAL FUNCTIONALITY
// ============================================================================

function initRegistrationModal() {
    const registrationButtons = document.querySelectorAll('a[href="/register"]');
    const registrationModal = document.getElementById('registrationModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const closeModalBtn = document.getElementById('closeModal');
    const registrationForm = document.getElementById('registrationForm');
    const registrationSuccess = document.getElementById('registrationSuccess');
    const closeSuccessBtn = document.getElementById('closeSuccessBtn');
    
    if (!registrationModal) return;
    
    // Open modal
    registrationButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            registrationModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });
    });
    
    // Close modal
    function closeModal() {
        registrationModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        if (registrationForm) {
            registrationForm.reset();
            registrationForm.style.display = 'block';
        }
        if (registrationSuccess) {
            registrationSuccess.classList.add('hidden');
        }
    }
    
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
    if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', closeModal);
    
    // Form submission
    if (registrationForm) {
        registrationForm.addEventListener('submit', submitForm);
    }
}

// Global function for opening modal
function openRegistrationModal() {
    const modal = document.getElementById('registrationModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// ============================================================================
// UI INTERACTIONS
// ============================================================================

// Feature switching functionality
function showFeatures(userType) {
    document.querySelectorAll('[id$="Features"]').forEach(el => el.classList.add('hidden'));
    const targetSection = document.getElementById(userType + 'Features');
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    // Update button styles
    document.querySelectorAll('[onclick^="showFeatures"]').forEach(btn => {
        btn.style.background = '#E5E7EB';
        btn.style.color = '#374151';
    });
    
    const targetButton = event.target.closest('button') || event.target;
    if (targetButton) {
        targetButton.style.background = '#101E3D';
        targetButton.style.color = 'white';
    }
}

// Feature carousel scrolling
function scrollFeatures(direction) {
    const container = document.getElementById('featuresContainer');
    if (!container) return;
    
    const scrollAmount = 400;
    if (direction === 'left') {
        container.scrollLeft -= scrollAmount;
    } else {
        container.scrollLeft += scrollAmount;
    }
}

// Live features scrolling
function scrollLiveFeatures(direction) {
    const container = document.getElementById('liveFeatures');
    if (!container) return;
    
    const scrollAmount = 300;
    if (direction === 'left') {
        container.scrollLeft -= scrollAmount;
    } else {
        container.scrollLeft += scrollAmount;
    }
}

// ============================================================================
// SCROLL ANIMATIONS
// ============================================================================

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
                if (!entry.target.classList.contains('animate')) {
                    entry.target.classList.add('animate');
                }
            }
        });
    }, observerOptions);

    const elementsToAnimate = document.querySelectorAll('.fade-in-up');
    elementsToAnimate.forEach(el => {
        observer.observe(el);
    });
}

// Scroll to top functionality
function initScrollToTop() {
    const scrollToTopButton = document.getElementById('scrollToTop');
    
    if (!scrollToTopButton) return;
    
    window.onscroll = function() {
        if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
            scrollToTopButton.classList.remove('hidden');
        } else {
            scrollToTopButton.classList.add('hidden');
        }
    };
    
    scrollToTopButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

function initializeApp() {
    // Initialize translation system
    window.translator = new DynamicTranslator();
    
    // Initialize other features
    initRegistrationModal();
    initScrollAnimations();
    initScrollToTop();
    
    // Load Google Maps API and initialize geolocation
    if (typeof google === 'undefined') {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.MAPS_API_KEY}&callback=initializeGeolocationTranslation`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    } else {
        initializeGeolocationTranslation();
    }
}

// Set global callback for Google Maps
window.mapsApiLoaded = initializeGeolocationTranslation;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
