// Unified JavaScript functionality for all pages
// This file replaces both main.js and pages-common.js

// Scroll to top functionality (consolidated from both files)
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

// Registration Modal Functionality
function initRegistrationModal() {
    const registrationButtons = document.querySelectorAll('a[href="/register"]');
    const registrationModal = document.getElementById('registrationModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const closeModalBtn = document.getElementById('closeModal');
    const registrationForm = document.getElementById('registrationForm');
    const registrationSuccess = document.getElementById('registrationSuccess');
    const closeSuccessBtn = document.getElementById('closeSuccessBtn');
    
    if (!registrationModal) return;
    
    // Open modal when registration buttons are clicked
    registrationButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            registrationModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        });
    });
    
    // Close modal functionality
    function closeModal() {
        registrationModal.classList.add('hidden');
        document.body.style.overflow = 'auto'; // Enable scrolling
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
    
    // Form submission functionality
    if (registrationForm) {
        registrationForm.addEventListener('submit', submitForm);
    }
}

// Form submission function
function submitForm(event) {
    event.preventDefault();
    
    // Get form data
    const form = document.getElementById('registrationForm');
    const formData = new FormData(form);
    
    // Convert FormData to URL params
    const data = new URLSearchParams();
    for (const pair of formData) {
        data.append(pair[0], pair[1]);
    }
    
    // Your Google Apps Script web app URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbxE9_af7rm1jgql-pp4Iz5Rjjd94aMqczfCrP3SRLYcLIc0ZTAhf7DNa3MEsG1h5s33ag/exec';
    
    // Show loading state
    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    
    // Send data to Google Apps Script
    fetch(scriptURL, {
        method: 'POST',
        body: data
    })
    .then(response => response.json())
    .then(data => {
        // Show success message
        form.style.display = 'none';
        document.getElementById('registrationSuccess').classList.remove('hidden');
    })
    .catch(error => {
        console.error('Error!', error.message);
        alert('Something went wrong. Please try again later.');
    })
    .finally(() => {
        // Reset button text
        submitBtn.textContent = originalText;
    });
}

// Feature switching functionality (for index.html and language pages)
function showFeatures(userType) {
    // Hide all feature sections
    document.querySelectorAll('[id$="Features"]').forEach(el => el.classList.add('hidden'));
    // Show selected section
    const targetSection = document.getElementById(userType + 'Features');
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    // Update button styles
    document.querySelectorAll('[onclick^="showFeatures"]').forEach(btn => {
        btn.style.background = '#E5E7EB';
        btn.style.color = '#374151';
    });
    
    // Handle both direct event.target and button elements
    const targetButton = event.target.closest('button') || event.target;
    if (targetButton) {
        targetButton.style.background = '#101E3D';
        targetButton.style.color = 'white';
    }
}

// Feature carousel scrolling (for index.html and language pages)
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

// Animation on scroll
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

    // Observe all elements with fade-in-up class
    const elementsToAnimate = document.querySelectorAll('.fade-in-up');
    elementsToAnimate.forEach(el => {
        observer.observe(el);
    });
}

// FAQ Data for Search (only for FAQs page)
const faqData = [
    { question: "What is aIQversity?", answer: "aIQversity is an AI-powered learning platform that helps students prepare for exams using Generative AI (GenAI). We provide smart study plans, AI-based tutoring, question paper generation, doubt-solving, and real-time exam predictions.", category: "general" },
    { question: "Who can use aIQversity?", answer: "Students, Parents, Teachers, Schools & Organizations", category: "general" },
    { question: "Is aIQversity available on mobile?", answer: "Yes! aIQversity is available on desktop, mobile, and tablet. We will soon launch a dedicated mobile app for Android and iOS.", category: "general" },
    { question: "Does aIQversity support multiple languages?", answer: "Yes! We provide learning support in English, Hindi, and other regional languages, with AI-powered translations and voice-based explanations.", category: "general" },
    { question: "How does AI-powered question paper generation work?", answer: "Our Generative AI analyzes 20+ years of past exam papers and syllabus trends to create realistic, probable exam papers.", category: "features" },
    { question: "Can I get AI-generated answers and explanations?", answer: "Yes! Our AI tutor provides step-by-step explanations for every subject.", category: "features" },
    { question: "How does the AI-powered study planner work?", answer: "AI analyzes your strengths, weaknesses, and available study time to create a customized study plan.", category: "features" },
    { question: "Does aIQversity provide live tutoring?", answer: "We offer AI-based virtual tutoring that works 24/7. Students can ask questions via chat, voice, or video.", category: "features" },
    { question: "How does AI predict exam questions?", answer: "Our AI uses historical data, syllabus changes, and weightage analysis to suggest likely exam questions.", category: "features" },
    { question: "Can parents track their child's progress?", answer: "Yes! Parents get a dedicated dashboard to monitor student progress, view detailed performance analytics, and get AI-driven study recommendations.", category: "features" },
    { question: "How does the AI doubt solver work?", answer: "Students can upload a question or a photo, and AI will analyze the problem, explain step-by-step solutions, and provide related concepts.", category: "tutoring" },
    { question: "Does the AI tutor only provide answers, or does it explain concepts?", answer: "Unlike other platforms, aIQversity doesn't just provide final answers. Our AI guides students step by step, explaining the why and how behind every answer.", category: "tutoring" },
    { question: "Is aIQversity free to use?", answer: "We offer free basic access to question papers and doubt-solving. Premium features like AI tutoring, exam predictions, and advanced analytics are available under affordable subscription plans.", category: "pricing" },
    { question: "What are the subscription plans?", answer: "Basic Plan (Free), Premium Plan, School/Institution Plan with special pricing.", category: "pricing" },
    { question: "Do you offer discounts for students or schools?", answer: "Yes! We offer discounts for early subscribers, schools, and group enrollments.", category: "pricing" },
    { question: "Is my data safe with aIQversity?", answer: "Absolutely! We use secure encryption and privacy protection measures to keep student and school data safe.", category: "security" },
    { question: "Does aIQversity share my personal information?", answer: "No. We never sell or share student data. Our AI is built to assist learning without compromising privacy.", category: "security" },
    { question: "How can I contact aIQversity for support?", answer: "Email: support@aiqversity.com, Website: www.aIQversity.com", category: "support" },
    { question: "Can I request new features or improvements?", answer: "Yes! We love feedback. If you have feature suggestions, send them to feedback@aiqversity.com.", category: "support" }
];

// FAQ Toggle Function
function toggleFAQ(button) {
    const content = button.nextElementSibling;
    const icon = button.querySelector('.faq-icon');
    
    // Close all other FAQs
    document.querySelectorAll('.faq-content').forEach(item => {
        if (item !== content) {
            item.classList.remove('open');
            const otherIcon = item.previousElementSibling.querySelector('.faq-icon');
            if (otherIcon) otherIcon.classList.remove('rotate');
        }
    });
    
    // Toggle current FAQ
    content.classList.toggle('open');
    if (icon) icon.classList.toggle('rotate');
}

// FAQ Search Functionality
function initFAQSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    if (!searchInput || !searchResults) return; // Only init if elements exist

    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        const filteredFAQs = faqData.filter(faq => 
            faq.question.toLowerCase().includes(query) || 
            faq.answer.toLowerCase().includes(query)
        );

        if (filteredFAQs.length > 0) {
            searchResults.innerHTML = filteredFAQs.map(faq => `
                <div class="search-result-item" onclick="scrollToFAQ('${faq.question}')">
                    <div class="font-semibold text-sm" style="color: #101E3D">${highlightText(faq.question, query)}</div>
                    <div class="text-xs text-gray-600 mt-1">${highlightText(faq.answer.substring(0, 100) + '...', query)}</div>
                </div>
            `).join('');
            searchResults.style.display = 'block';
        } else {
            searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
            searchResults.style.display = 'block';
        }
    });

    // Close search results when clicking outside
    document.addEventListener('click', function(event) {
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer && !searchContainer.contains(event.target)) {
            searchResults.style.display = 'none';
        }
    });
}

function highlightText(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

function scrollToFAQ(question) {
    const searchResults = document.getElementById('searchResults');
    const searchInput = document.getElementById('searchInput');
    
    if (searchResults) searchResults.style.display = 'none';
    if (searchInput) searchInput.value = '';
    
    // Find the FAQ and open it
    const faqButtons = document.querySelectorAll('.faq-accordion');
    faqButtons.forEach(button => {
        if (button.textContent.trim().includes(question)) {
            const content = button.nextElementSibling;
            if (content && !content.classList.contains('open')) {
                toggleFAQ(button);
            }
            button.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

// Smooth scrolling for anchor links (consolidated from both files)
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Toggle more features functionality (for whyus.html)
function toggleMoreFeatures() {
    const moreFeatures = document.getElementById('moreFeatures');
    const btn = document.getElementById('moreFeatureBtn');
    
    if (!moreFeatures || !btn) return; // Only work if elements exist
    
    if (moreFeatures.classList.contains('hidden')) {
        moreFeatures.classList.remove('hidden');
        btn.textContent = 'Show Less Features';
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        moreFeatures.classList.add('hidden');
        btn.textContent = 'See 5 More Unique Features';
    }
}

// Smart initialization - only initialize features that exist on the current page
function initializePageFeatures() {
    // Always initialize scroll to top (present on all pages)
    initScrollToTop();
    
    // Always initialize smooth scrolling (useful on all pages)
    initSmoothScrolling();
    
    // Initialize registration modal if present
    if (document.getElementById('registrationModal')) {
        initRegistrationModal();
    }
    
    // Initialize scroll animations if elements exist
    if (document.querySelectorAll('.fade-in-up').length > 0) {
        initScrollAnimations();
    }
    
    // Initialize FAQ search if elements exist
    if (document.getElementById('searchInput') && document.getElementById('searchResults')) {
        initFAQSearch();
    }
    
    // No need to check for feature switching and carousel as they're called inline
    // toggleMoreFeatures is called inline, so no initialization needed
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializePageFeatures();
});

// Expose functions globally for inline usage
window.submitForm = submitForm;
window.showFeatures = showFeatures;
window.scrollFeatures = scrollFeatures;
window.toggleFAQ = toggleFAQ;
window.scrollToFAQ = scrollToFAQ;
window.toggleMoreFeatures = toggleMoreFeatures; 