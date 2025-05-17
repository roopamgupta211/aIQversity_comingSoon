// language-switcher.js

// --- POPUP FUNCTIONALITY ---
function showAutoRedirectPopup(languageName, englishPageUrl) {
    // Prevent popup if already acknowledged for this language in this session
    if (localStorage.getItem(`acknowledgedRedirect_${languageName.toLowerCase()}`)) {
        localStorage.removeItem('autoRedirectedTo'); // Clean up trigger
        setupLanguageSwitcher(languageName, englishPageUrl, false); // Show standard banner
        return;
    }

    const popupOverlayId = 'autoRedirectPopupOverlay';
    const existingOverlay = document.getElementById(popupOverlayId);
    if (existingOverlay) existingOverlay.remove(); // Remove if already exists

    // Overlay
    const overlay = document.createElement('div');
    overlay.id = popupOverlayId;
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    overlay.style.zIndex = '20000'; // Higher than language switcher
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    // Popup Modal
    const modal = document.createElement('div');
    modal.style.background = '#101E3D'; // Dark background like dashboard
    modal.style.color = 'white';
    modal.style.padding = '25px 30px'; // Increased padding
    modal.style.borderRadius = '12px'; // Consistent with site
    modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';
    modal.style.maxWidth = '450px';
    modal.style.width = '90%';
    modal.style.textAlign = 'center';
    modal.style.fontFamily = 'Arial, sans-serif'; // Or your site's primary font
    modal.style.position = 'relative'; // For close button

    // Close button (optional, but good UX)
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;'; // '×' character
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '15px';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = '#ccc';
    closeButton.style.fontSize = '28px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.lineHeight = '1';
    closeButton.onclick = () => dismissPopup(languageName, englishPageUrl);

    // Message
    const message = document.createElement('p');
    message.innerHTML = `We've updated the language to <strong>${languageName}</strong> based on your location.`;
    message.style.fontSize = '18px';
    message.style.marginBottom = '25px';
    message.style.lineHeight = '1.6';

    // Button Container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.flexDirection = 'column'; // Stack buttons on small screens
    buttonContainer.style.gap = '15px'; // Space between buttons

    // Switch to English Button
    const switchToEnglishBtn = document.createElement('button');
    switchToEnglishBtn.textContent = 'Switch to English';
    switchToEnglishBtn.style.backgroundColor = '#F7A621'; // Accent color
    switchToEnglishBtn.style.color = 'white'; // Or #101E3D for contrast
    switchToEnglishBtn.style.border = 'none';
    switchToEnglishBtn.style.padding = '12px 20px';
    switchToEnglishBtn.style.borderRadius = '8px';
    switchToEnglishBtn.style.fontSize = '16px';
    switchToEnglishBtn.style.fontWeight = 'bold';
    switchToEnglishBtn.style.cursor = 'pointer';
    switchToEnglishBtn.style.transition = 'background-color 0.3s, transform 0.2s';
    switchToEnglishBtn.onmouseover = () => switchToEnglishBtn.style.backgroundColor = '#e0930f'; // Darker shade on hover
    switchToEnglishBtn.onmouseout = () => switchToEnglishBtn.style.backgroundColor = '#F7A621';
    switchToEnglishBtn.onclick = () => {
        localStorage.removeItem('autoRedirectedTo'); // Clean up trigger
        switchToEnglish(englishPageUrl); // Existing function
    };

    // Continue in Current Language Button
    const continueBtn = document.createElement('button');
    continueBtn.textContent = `Continue in ${languageName}`;
    continueBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; // Subtle button
    continueBtn.style.color = 'white';
    continueBtn.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    continueBtn.style.padding = '12px 20px';
    continueBtn.style.borderRadius = '8px';
    continueBtn.style.fontSize = '16px';
    continueBtn.style.cursor = 'pointer';
    continueBtn.style.transition = 'background-color 0.3s';
    continueBtn.onmouseover = () => continueBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    continueBtn.onmouseout = () => continueBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    continueBtn.onclick = () => dismissPopup(languageName, englishPageUrl);

    buttonContainer.appendChild(switchToEnglishBtn);
    buttonContainer.appendChild(continueBtn);

    modal.appendChild(closeButton);
    modal.appendChild(message);
    modal.appendChild(buttonContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Prevent body scroll when popup is open
    document.body.style.overflow = 'hidden';
}

function dismissPopup(languageName, englishPageUrl) {
    const overlay = document.getElementById('autoRedirectPopupOverlay');
    if (overlay) {
        overlay.remove();
    }
    // Mark that user has seen and dismissed the popup for this language
    localStorage.setItem(`acknowledgedRedirect_${languageName.toLowerCase()}`, 'true');
    localStorage.removeItem('autoRedirectedTo'); // Clean up the trigger flag

    // Restore body scroll
    document.body.style.overflow = 'auto';

    // Now show the standard, less intrusive language switcher banner
    setupLanguageSwitcher(languageName, englishPageUrl, false);
}

// --- STANDARD LANGUAGE SWITCHER BANNER ---
function setupLanguageSwitcher(languageName, englishPageUrl, isEnglishPage) {
    const switcherContainerId = 'languageSwitcherContainer';
    const existingSwitcher = document.getElementById(switcherContainerId);
    if (existingSwitcher) existingSwitcher.remove();

    const switcherContainer = document.createElement('div');
    switcherContainer.id = switcherContainerId;
    switcherContainer.style.position = 'fixed';
    switcherContainer.style.bottom = '10px';
    switcherContainer.style.left = '10px';
    switcherContainer.style.padding = '10px 15px';
    switcherContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    switcherContainer.style.color = 'white';
    switcherContainer.style.borderRadius = '8px';
    switcherContainer.style.zIndex = '10000';
    switcherContainer.style.fontSize = '14px';
    switcherContainer.style.fontFamily = 'Arial, sans-serif';
    switcherContainer.style.boxShadow = '0 4px 10px rgba(0,0,0,0.4)';
    switcherContainer.style.textAlign = 'center';

    let messageText = `Viewing in ${languageName}. `;
    if (!isEnglishPage) {
        messageText += `<a href="${englishPageUrl}" onclick="switchToEnglish('${englishPageUrl}'); return false;" style="color: #79b8ff; text-decoration: underline; font-weight: bold; cursor: pointer;">Switch to English</a>`;
    }
    switcherContainer.innerHTML = messageText;
    document.body.appendChild(switcherContainer);
}

function switchToEnglish(englishPageUrl) {
    localStorage.setItem('userChoseEnglish', 'true');
    window.location.href = englishPageUrl;
}

// --- SCRIPT INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const currentPagePath = window.location.pathname;
    const currentPageFilename = currentPagePath.substring(currentPagePath.lastIndexOf('/') + 1) || 'index.html';
    const englishPageUrl = 'index.html'; // Assuming flat structure

    if (currentPageFilename === 'index.html') {
        // index.html has its own Google Maps API callback logic to call setupLanguageSwitcher
        // or initiate redirection.
        return;
    }

    // Logic for translated pages
    let currentLangName = '';
    if (currentPageFilename === 'kannada.html') currentLangName = 'Kannada';
    else if (currentPageFilename === 'hindi.html') currentLangName = 'Hindi';
    else if (currentPageFilename === 'malayalam.html') currentLangName = 'Malayalam';
    else if (currentPageFilename === 'gujarati.html') currentLangName = 'Gujarati';
    else if (currentPageFilename === 'marathi.html') currentLangName = 'Marathi';
    else if (currentPageFilename === 'tamil.html') currentLangName = 'Tamil';
    else if (currentPageFilename === 'telugu.html') currentLangName = 'Telugu';
    else {
        return; // Not a recognized translated page
    }

    const autoRedirectedLangTrigger = localStorage.getItem('autoRedirectedTo');

    // Check if this page was the target of an auto-redirect AND popup hasn't been acknowledged
    if (autoRedirectedLangTrigger && autoRedirectedLangTrigger.toLowerCase() === currentLangName.toLowerCase() &&
        !localStorage.getItem(`acknowledgedRedirect_${currentLangName.toLowerCase()}`)) {
        showAutoRedirectPopup(currentLangName, englishPageUrl);
    } else {
        // Otherwise, just show the standard banner (e.g., direct navigation, or popup already seen)
        if (autoRedirectedLangTrigger && autoRedirectedLangTrigger.toLowerCase() === currentLangName.toLowerCase()){
             localStorage.removeItem('autoRedirectedTo'); // Clean up if acknowledged flag was set but trigger wasn't
        }
        setupLanguageSwitcher(currentLangName, englishPageUrl, false);
    }
});