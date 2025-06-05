// Registration Modal and Form Functionality

// Form submission functionality
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
    const submitButton = document.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Submitting...';
    
    // Send data to Google Apps Script
    fetch(scriptURL, {
        method: 'POST',
        body: data
    })
    .then(response => response.json())
    .then(data => {
        // Show success message
        const form = document.getElementById('registrationForm');
        const successDiv = document.getElementById('registrationSuccess');
        form.style.display = 'none';
        successDiv.classList.remove('hidden');
    })
    .catch(error => {
        console.error('Error!', error.message);
        alert('Something went wrong. Please try again later.');
    })
    .finally(() => {
        // Reset button text
        submitButton.textContent = originalText;
    });
}

// Modal functionality
function initModal() {
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
    
    // Event listeners for closing modal
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
    if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', closeModal);
    
    // Form submission
    if (registrationForm) {
        registrationForm.addEventListener('submit', submitForm);
    }
}

// Initialize modal when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initModal();
});

// Make functions globally available
window.submitForm = submitForm; 