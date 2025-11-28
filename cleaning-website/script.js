// Global variables
let currentSlide = 0;
let uploadedImages = [];

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize all app functionality
function initializeApp() {
    initializeSlideshow();
    initializeImageUpload();
    initializeForm();
    initializeMobileNavigation();
    initializeSmoothScrolling();
}

// Slideshow functionality
function initializeSlideshow() {
    const slides = document.querySelectorAll('.slide');
    const indicators = document.querySelectorAll('.indicator');
    
    if (slides.length === 0) return;
    
    // Auto-advance slideshow every 5 seconds
    setInterval(() => {
        changeSlide(1);
    }, 5000);
}

function changeSlide(direction) {
    const slides = document.querySelectorAll('.slide');
    const indicators = document.querySelectorAll('.indicator');
    
    if (slides.length === 0) return;
    
    // Remove active class from current slide and indicator
    slides[currentSlide].classList.remove('active');
    indicators[currentSlide].classList.remove('active');
    
    // Calculate new slide index
    currentSlide += direction;
    
    if (currentSlide >= slides.length) {
        currentSlide = 0;
    } else if (currentSlide < 0) {
        currentSlide = slides.length - 1;
    }
    
    // Add active class to new slide and indicator
    slides[currentSlide].classList.add('active');
    indicators[currentSlide].classList.add('active');
}

function currentSlideSet(index) {
    const slides = document.querySelectorAll('.slide');
    const indicators = document.querySelectorAll('.indicator');
    
    if (slides.length === 0) return;
    
    // Remove active class from current slide and indicator
    slides[currentSlide].classList.remove('active');
    indicators[currentSlide].classList.remove('active');
    
    // Set new current slide
    currentSlide = index - 1;
    
    // Add active class to new slide and indicator
    slides[currentSlide].classList.add('active');
    indicators[currentSlide].classList.add('active');
}

// Image upload functionality
function initializeImageUpload() {
    const imageUpload = document.getElementById('imageUpload');
    const imageInput = document.getElementById('images');
    const imagePreview = document.getElementById('imagePreview');
    
    if (!imageUpload || !imageInput || !imagePreview) return;
    
    // Handle file input change
    imageInput.addEventListener('change', handleFileSelect);
    
    // Handle drag and drop
    imageUpload.addEventListener('dragover', handleDragOver);
    imageUpload.addEventListener('dragleave', handleDragLeave);
    imageUpload.addEventListener('drop', handleDrop);
    
    // Handle click to upload
    imageUpload.addEventListener('click', () => {
        imageInput.click();
    });
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        imageUpload.addEventListener(eventName, preventDefaults, false);
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('imageUpload').classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    document.getElementById('imageUpload').classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('imageUpload').classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    const maxFiles = 5;
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    
    for (let i = 0; i < files.length && uploadedImages.length < maxFiles; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showErrorMessage('Please upload only image files.');
            continue;
        }
        
        // Validate file size
        if (file.size > maxFileSize) {
            showErrorMessage('File size must be less than 5MB.');
            continue;
        }
        
        // Add file to uploaded images
        uploadedImages.push(file);
        
        // Create preview
        createImagePreview(file, uploadedImages.length - 1);
    }
    
    updateUploadDisplay();
}

function createImagePreview(file, index) {
    const imagePreview = document.getElementById('imagePreview');
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `
            <img src="${e.target.result}" alt="Preview ${index + 1}">
            <button type="button" class="preview-remove" onclick="removeImage(${index})" aria-label="Remove image">
                &times;
            </button>
        `;
        
        imagePreview.appendChild(previewItem);
    };
    
    reader.readAsDataURL(file);
}

function removeImage(index) {
    uploadedImages.splice(index, 1);
    refreshImagePreview();
    updateUploadDisplay();
}

function refreshImagePreview() {
    const imagePreview = document.getElementById('imagePreview');
    imagePreview.innerHTML = '';
    
    uploadedImages.forEach((file, index) => {
        createImagePreview(file, index);
    });
}

function updateUploadDisplay() {
    const uploadContent = document.querySelector('.upload-content');
    const imagePreview = document.getElementById('imagePreview');
    
    if (uploadedImages.length > 0) {
        uploadContent.style.display = 'none';
        imagePreview.style.display = 'grid';
    } else {
        uploadContent.style.display = 'block';
        imagePreview.style.display = 'none';
    }
}

// Form submission functionality
function initializeForm() {
    const form = document.getElementById('quoteForm');
    
    if (!form) return;
    
    form.addEventListener('submit', handleFormSubmit);
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    // Add uploaded images to form data
    uploadedImages.forEach((file, index) => {
        formData.append(`image_${index}`, file);
    });
    
    // Show loading state
    setLoadingState(true);
    
    try {
        // Send form data with ClickSend API
        await sendMessageWithClickSend(formData);
        
        // Show success modal
        showSuccessModal();
        
        // Reset form
        form.reset();
        uploadedImages = [];
        refreshImagePreview();
        updateUploadDisplay();
        
    } catch (error) {
        console.error('Error sending message:', error);
        showErrorMessage('Failed to send message. Please try again or call us directly.');
    } finally {
        setLoadingState(false);
    }
}

async function sendMessageWithClickSend(formData) {
    // Extract form data
    const name = formData.get('name');
    const phone = formData.get('phone');
    const email = formData.get('email');
    const service = formData.get('service');
    const address = formData.get('address');
    const message = formData.get('message');
    
    // Create message content
    const messageContent = `
New Quote Request - Freshnest Cleaning NYC

Name: ${name}
Phone: ${phone}
Email: ${email || 'Not provided'}
Service: ${service}
Address: ${address || 'Not provided'}
Message: ${message || 'No additional message'}

Images: ${uploadedImages.length} uploaded
    `.trim();
    
    // ClickSend API configuration from config.js
    const clickSendConfig = window.CLICKSEND_CONFIG || {
        username: 'YOUR_CLICKSEND_USERNAME',
        apiKey: 'YOUR_CLICKSEND_API_KEY',
        recipientPhone: '+1234567890'
    };
    
    // Prepare ClickSend payload
    const payload = {
        messages: [
            {
                source: 'sdk',
                from: 'Freshnest',
                to: clickSendConfig.recipientPhone,
                body: messageContent
            }
        ]
    };
    
    // If there are images, convert to base64 and attach
    if (uploadedImages.length > 0) {
        const mediaArray = [];
        
        for (const image of uploadedImages) {
            const base64 = await fileToBase64(image);
            mediaArray.push({
                type: 'MMS',
                source: 'base64',
                media: base64,
                name: image.name
            });
        }
        
        payload.messages[0].media = mediaArray;
    }
    
    // Send to ClickSend API
    const response = await fetch('https://rest.clicksend.com/v3/sms/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa(`${clickSendConfig.username}:${clickSendConfig.apiKey}`)
        },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        throw new Error(`ClickSend API error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('ClickSend response:', result);
    
    return result;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Remove data URL prefix to get pure base64
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

function setLoadingState(isLoading) {
    const form = document.getElementById('quoteForm');
    const submitButton = form.querySelector('button[type="submit"]');
    
    if (isLoading) {
        form.classList.add('loading');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner"></i> Sending...';
    } else {
        form.classList.remove('loading');
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send Quote Request';
    }
}

// Modal functionality
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('successModal');
    modal.classList.remove('active');
}

function showErrorMessage(message) {
    // Create a temporary error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        max-width: 300px;
        animation: slideInRight 0.3s ease;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Mobile navigation
function initializeMobileNavigation() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navList = document.querySelector('.nav-list');
    
    if (!mobileMenuBtn || !navList) return;
    
    mobileMenuBtn.addEventListener('click', () => {
        navList.classList.toggle('active');
        
        // Toggle mobile menu styles
        if (navList.classList.contains('active')) {
            navList.style.display = 'flex';
            navList.style.flexDirection = 'column';
            navList.style.position = 'absolute';
            navList.style.top = '100%';
            navList.style.left = '0';
            navList.style.right = '0';
            navList.style.background = 'white';
            navList.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            navList.style.padding = '1rem';
            navList.style.zIndex = '999';
        } else {
            navList.style.display = 'none';
        }
    });
    
    // Close mobile menu when clicking on links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navList.classList.remove('active');
            navList.style.display = 'none';
        });
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!mobileMenuBtn.contains(e.target) && !navList.contains(e.target)) {
            navList.classList.remove('active');
            navList.style.display = 'none';
        }
    });
}

// Smooth scrolling for navigation links
function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Scroll animations (optional enhancement)
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.service-card, .contact-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

// Call scroll animations on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeScrollAnimations, 1000);
});

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle window resize
window.addEventListener('resize', debounce(() => {
    const navList = document.querySelector('.nav-list');
    
    // Reset mobile menu on resize
    if (window.innerWidth >= 1024 && navList) {
        navList.classList.remove('active');
        navList.style.display = '';
        navList.style.flexDirection = '';
        navList.style.position = '';
        navList.style.top = '';
        navList.style.left = '';
        navList.style.right = '';
        navList.style.background = '';
        navList.style.boxShadow = '';
        navList.style.padding = '';
        navList.style.zIndex = '';
    }
}, 250));

// Performance optimization: Lazy load images
document.addEventListener('DOMContentLoaded', () => {
    const lazyImages = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => imageObserver.observe(img));
    }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .error-message {
        animation: slideInRight 0.3s ease;
    }
`;
document.head.appendChild(style);
