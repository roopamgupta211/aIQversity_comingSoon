// Location Detection and Google Maps Integration

// This function will be called by the Google Maps API script once it's loaded
function mapsApiLoaded() {
    const englishLangInfo = window.availableLanguages ? window.availableLanguages.find(l => l.code === 'en') : { code: 'en', name: 'English' };

    // Check if the user explicitly chose a language in this session
    if (localStorage.getItem('userExplicitlyChoseLanguage') === 'true') {
        console.log("User explicitly chose a language. Skipping geolocation.");
        localStorage.removeItem('userExplicitlyChoseLanguage'); // Clear the flag (it's a one-time use for this load)
        if (window.setupLanguageSwitcher) {
            window.setupLanguageSwitcher(englishLangInfo); // Display language switcher with English as current
        }
        return; // Don't attempt to geolocate or redirect
    }
    
    console.log("No explicit language choice detected or flag already cleared. Proceeding with geolocation.");

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => { // Success callback
                const geocoder = new google.maps.Geocoder();
                const latlng = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                geocoder.geocode({ location: latlng }, (results, status) => {
                    if (status === 'OK') {
                        if (results[0]) {
                            const addressComponents = results[0].address_components;
                            let state = null;
                            for (let component of addressComponents) {
                                if (component.types.includes('administrative_area_level_1')) {
                                    state = component.long_name;
                                    break;
                                }
                            }
                            redirectToLanguagePageByState(state, englishLangInfo);
                        } else {
                            console.warn('No reverse geocoding results found.');
                            if (window.setupLanguageSwitcher) {
                                window.setupLanguageSwitcher(englishLangInfo);
                            }
                        }
                    } else {
                        console.error('Geocoder failed due to: ' + status);
                        if (window.setupLanguageSwitcher) {
                            window.setupLanguageSwitcher(englishLangInfo);
                        }
                    }
                });
            },
            () => { // Error callback
                console.warn('Geolocation permission denied or error.');
                if (window.setupLanguageSwitcher) {
                    window.setupLanguageSwitcher(englishLangInfo);
                }
            }
        );
    } else {
        console.warn('Geolocation is not supported by this browser.');
        if (window.setupLanguageSwitcher) {
            window.setupLanguageSwitcher(englishLangInfo);
        }
    }
}

function redirectToLanguagePageByState(state, currentEnglishInfo) {
    let targetLangCode = null;
    let detectedLocation = state;

    if (state) {
        const s = state.toLowerCase();
        const hindiStates = [
            'uttar pradesh', 'delhi', 'bihar', 'rajasthan', 'madhya pradesh', 'haryana',
            'jharkhand', 'chhattisgarh', 'uttarakhand', 'himachal pradesh',
            'assam', 'arunachal pradesh', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'tripura', 'sikkim',
            'west bengal', 'odisha'
        ];

        if (s.includes('karnataka')) targetLangCode = 'kn';
        else if (s.includes('kerala')) targetLangCode = 'ml';
        else if (s.includes('gujarat')) targetLangCode = 'gu';
        else if (s.includes('maharashtra')) targetLangCode = 'mr';
        else if (s.includes('tamil nadu')) targetLangCode = 'ta';
        else if (s.includes('telangana') || s.includes('andhra pradesh')) targetLangCode = 'te';
        else if (hindiStates.some(hindiState => s.includes(hindiState))) targetLangCode = 'hi';
    }

    if (window.setupLanguageSwitcher) {
        window.setupLanguageSwitcher(currentEnglishInfo);
    }

    if (targetLangCode && !localStorage.getItem('preferredLanguage')) {
        setTimeout(() => {
            if (window.showLocationLanguageSuggestion) {
                window.showLocationLanguageSuggestion(targetLangCode, detectedLocation);
            }
        }, 1500); // Delay to let page load completely
    }
}
console.log("Location.js is working")
// Make functions globally available
window.mapsApiLoaded = mapsApiLoaded;
window.redirectToLanguagePageByState = redirectToLanguagePageByState; 