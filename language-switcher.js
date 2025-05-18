// language-switcher.js

const availableLanguages = [
    { name: 'English', file: 'index.html', code: 'en' },
    { name: 'ಕನ್ನಡ (Kannada)', file: 'kannada.html', code: 'kn' },
    { name: 'हिन्दी (Hindi)', file: 'hindi.html', code: 'hi' },
    { name: 'മലയാളം (Malayalam)', file: 'malayalam.html', code: 'ml' },
    { name: 'ગુજરાતી (Gujarati)', file: 'gujarati.html', code: 'gu' },
    { name: 'मराठी (Marathi)', file: 'marathi.html', code: 'mr' },
    { name: 'தமிழ் (Tamil)', file: 'tamil.html', code: 'ta' },
    { name: 'తెలుగు (Telugu)', file: 'telugu.html', code: 'te' }
];

function getCurrentLanguageInfo(currentPageFilename) {
    return availableLanguages.find(lang => lang.file === currentPageFilename) || availableLanguages[0]; // Default to English
}

// --- POPUP FUNCTIONALITY (Mostly Unchanged) ---
function showAutoRedirectPopup(languageName, englishPageUrl, currentLangFile) {
    if (localStorage.getItem(`acknowledgedRedirect_${languageName.toLowerCase()}`)) {
        localStorage.removeItem('autoRedirectedTo');
        const currentLangInfo = getCurrentLanguageInfo(currentLangFile);
        setupLanguageSwitcher(currentLangInfo);
        return;
    }

    const popupOverlayId = 'autoRedirectPopupOverlay';
    const existingOverlay = document.getElementById(popupOverlayId);
    if (existingOverlay) existingOverlay.remove();

    const overlay = document.createElement('div');
    overlay.id = popupOverlayId;
    // ... (styling for overlay - same as before) ...
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    overlay.style.zIndex = '20000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    const modal = document.createElement('div');
    // ... (styling for modal - same as before) ...
    modal.style.background = '#101E3D';
    modal.style.color = 'white';
    modal.style.padding = '25px 30px';
    modal.style.borderRadius = '12px';
    modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';
    modal.style.maxWidth = '450px';
    modal.style.width = '90%';
    modal.style.textAlign = 'center';
    modal.style.fontFamily = 'Arial, sans-serif';
    modal.style.position = 'relative';

    const closeButton = document.createElement('button');
    // ... (styling for closeButton - same as before) ...
    closeButton.innerHTML = '&times;';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '15px';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = '#ccc';
    closeButton.style.fontSize = '28px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.lineHeight = '1';
    closeButton.onclick = () => dismissPopup(languageName, currentLangFile);


    const message = document.createElement('p');
    message.innerHTML = `We've updated the language to <strong>${languageName}</strong> based on your location.`;
    // ... (styling for message - same as before) ...
    message.style.fontSize = '18px';
    message.style.marginBottom = '25px';
    message.style.lineHeight = '1.6';

    const buttonContainer = document.createElement('div');
    // ... (styling for buttonContainer - same as before) ...
    buttonContainer.style.display = 'flex';
    buttonContainer.style.flexDirection = 'column';
    buttonContainer.style.gap = '15px';

    const switchToEnglishBtn = document.createElement('button');
    switchToEnglishBtn.textContent = 'Switch to English';
    // ... (styling for switchToEnglishBtn - same as before) ...
    switchToEnglishBtn.style.backgroundColor = '#F7A621';
    switchToEnglishBtn.style.color = 'white';
    switchToEnglishBtn.style.border = 'none';
    switchToEnglishBtn.style.padding = '12px 20px';
    switchToEnglishBtn.style.borderRadius = '8px';
    switchToEnglishBtn.style.fontSize = '16px';
    switchToEnglishBtn.style.fontWeight = 'bold';
    switchToEnglishBtn.style.cursor = 'pointer';
    switchToEnglishBtn.style.transition = 'background-color 0.3s, transform 0.2s';
    switchToEnglishBtn.onmouseover = () => switchToEnglishBtn.style.backgroundColor = '#e0930f';
    switchToEnglishBtn.onmouseout = () => switchToEnglishBtn.style.backgroundColor = '#F7A621';
    switchToEnglishBtn.onclick = () => {
        localStorage.removeItem('autoRedirectedTo');
        navigateToLanguage(availableLanguages.find(l => l.code === 'en').file); // Navigate to English
    };

    const continueBtn = document.createElement('button');
    continueBtn.textContent = `Continue in ${languageName}`;
    // ... (styling for continueBtn - same as before) ...
    continueBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    continueBtn.style.color = 'white';
    continueBtn.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    continueBtn.style.padding = '12px 20px';
    continueBtn.style.borderRadius = '8px';
    continueBtn.style.fontSize = '16px';
    continueBtn.style.cursor = 'pointer';
    continueBtn.style.transition = 'background-color 0.3s';
    continueBtn.onmouseover = () => continueBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    continueBtn.onmouseout = () => continueBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    continueBtn.onclick = () => dismissPopup(languageName, currentLangFile);

    buttonContainer.appendChild(switchToEnglishBtn);
    buttonContainer.appendChild(continueBtn);
    modal.appendChild(closeButton);
    modal.appendChild(message);
    modal.appendChild(buttonContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
}

function dismissPopup(languageName, currentLangFile) {
    const overlay = document.getElementById('autoRedirectPopupOverlay');
    if (overlay) overlay.remove();
    localStorage.setItem(`acknowledgedRedirect_${languageName.toLowerCase()}`, 'true');
    localStorage.removeItem('autoRedirectedTo');
    document.body.style.overflow = 'auto';
    const currentLangInfo = getCurrentLanguageInfo(currentLangFile);
    setupLanguageSwitcher(currentLangInfo);
}

// --- LANGUAGE DROPDOWN SWITCHER ---
function setupLanguageSwitcher(currentLanguageInfo) {
    const switcherContainerId = 'languageSwitcherContainer';
    const existingSwitcher = document.getElementById(switcherContainerId);
    if (existingSwitcher) existingSwitcher.remove();

    const switcherContainer = document.createElement('div');
    switcherContainer.id = switcherContainerId;
    switcherContainer.style.position = 'fixed';
    switcherContainer.style.bottom = '10px';
    switcherContainer.style.left = '10px';
    switcherContainer.style.zIndex = '10000';
    switcherContainer.style.fontFamily = 'Arial, sans-serif';

    const dropdownButton = document.createElement('button');
    dropdownButton.innerHTML = `🌐 ${currentLanguageInfo.name.split(' ')[0]}`; // Show "🌐 English" or "🌐 ಕನ್ನಡ"
    dropdownButton.style.padding = '10px 15px';
    dropdownButton.style.backgroundColor = 'rgba(16, 30, 61, 0.9)'; // #101E3D with slight transparency
    dropdownButton.style.color = 'white';
    dropdownButton.style.border = '1px solid rgba(247, 166, 33, 0.5)'; // Accent border
    dropdownButton.style.borderRadius = '8px';
    dropdownButton.style.fontSize = '14px';
    dropdownButton.style.cursor = 'pointer';
    dropdownButton.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    dropdownButton.style.transition = 'background-color 0.3s';
    dropdownButton.onmouseover = () => dropdownButton.style.backgroundColor = 'rgba(16, 30, 61, 1)';
    dropdownButton.onmouseout = () => dropdownButton.style.backgroundColor = 'rgba(16, 30, 61, 0.9)';


    const dropdownContent = document.createElement('div');
    dropdownContent.style.display = 'none'; // Hidden by default
    dropdownContent.style.position = 'absolute';
    dropdownContent.style.bottom = '100%'; // Position above the button
    dropdownContent.style.left = '0';
    dropdownContent.style.marginBottom = '5px'; // Space between button and dropdown
    dropdownContent.style.backgroundColor = 'rgba(16, 30, 61, 0.95)'; // Dark background
    dropdownContent.style.minWidth = '180px';
    dropdownContent.style.boxShadow = '0px 0px 15px rgba(0,0,0,0.5)';
    dropdownContent.style.borderRadius = '8px';
    dropdownContent.style.zIndex = '1';
    dropdownContent.style.maxHeight = '200px'; // For scrollability if many languages
    dropdownContent.style.overflowY = 'auto';

    availableLanguages.forEach(lang => {
        const langOption = document.createElement('a');
        langOption.textContent = lang.name;
        langOption.href = '#'; // Prevent page jump, handle with JS
        langOption.style.color = 'white';
        langOption.style.padding = '10px 15px';
        langOption.style.textDecoration = 'none';
        langOption.style.display = 'block';
        langOption.style.fontSize = '14px';
        langOption.style.borderBottom = '1px solid rgba(255,255,255,0.1)';

        if (lang.file === currentLanguageInfo.file) {
            langOption.style.backgroundColor = 'rgba(247, 166, 33, 0.3)'; // Highlight current language
            langOption.style.fontWeight = 'bold';
        }

        langOption.onmouseover = () => {
            if (lang.file !== currentLanguageInfo.file) langOption.style.backgroundColor = 'rgba(247, 166, 33, 0.2)';
        };
        langOption.onmouseout = () => {
            if (lang.file !== currentLanguageInfo.file) langOption.style.backgroundColor = 'transparent';
        };
        langOption.onclick = (e) => {
            e.preventDefault();
            if (lang.file !== currentLanguageInfo.file) {
                navigateToLanguage(lang.file);
            }
            dropdownContent.style.display = 'none'; // Close dropdown
        };
        dropdownContent.appendChild(langOption);
    });
    // Remove last border
    if(dropdownContent.lastChild) dropdownContent.lastChild.style.borderBottom = 'none';


    dropdownButton.onclick = () => {
        dropdownContent.style.display = dropdownContent.style.display === 'none' ? 'block' : 'none';
    };

    switcherContainer.appendChild(dropdownButton);
    switcherContainer.appendChild(dropdownContent);
    document.body.appendChild(switcherContainer);

    // Close dropdown if clicked outside
    document.addEventListener('click', function(event) {
        if (!switcherContainer.contains(event.target)) {
            dropdownContent.style.display = 'none';
        }
    });
}

function navigateToLanguage(targetFile) {
    // Set a flag so index.html knows the user explicitly chose a language
    // and doesn't try to auto-redirect them again immediately if they land on index.html.
    localStorage.setItem('userExplicitlyChoseLanguage', 'true');
    window.location.href = targetFile;
}

// --- SCRIPT INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const currentPagePath = window.location.pathname;
    // Handles cases like / or /index.html or /kannada.html
    const currentPageFilename = currentPagePath.substring(currentPagePath.lastIndexOf('/') + 1) || 'index.html';
    const currentLangInfo = getCurrentLanguageInfo(currentPageFilename);

    if (currentPageFilename === 'index.html') {
        // For index.html, the Google Maps API callback (`mapsApiLoaded`)
        // will handle calling setupLanguageSwitcher or initiating redirection.
        // We don't call setupLanguageSwitcher here directly for index.html to avoid
        // showing it before location check is complete.
        return;
    }

    // Logic for translated pages (non-index.html)
    const autoRedirectedLangTrigger = localStorage.getItem('autoRedirectedTo');

    if (autoRedirectedLangTrigger && autoRedirectedLangTrigger.toLowerCase() === currentLangInfo.name.split(' ')[0].toLowerCase() &&
        !localStorage.getItem(`acknowledgedRedirect_${currentLangInfo.name.split(' ')[0].toLowerCase()}`)) {
        showAutoRedirectPopup(currentLangInfo.name.split(' ')[0], availableLanguages.find(l => l.code === 'en').file, currentPageFilename);
    } else {
        if (autoRedirectedLangTrigger && autoRedirectedLangTrigger.toLowerCase() === currentLangInfo.name.split(' ')[0].toLowerCase()){
             localStorage.removeItem('autoRedirectedTo');
        }
        setupLanguageSwitcher(currentLangInfo);
    }
});