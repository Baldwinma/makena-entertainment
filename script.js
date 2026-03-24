// Mobile Menu Toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navLinks = document.getElementById('navLinks');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenuToggle.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    const navLinkItems = navLinks.querySelectorAll('a');
    navLinkItems.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
        });
    });
}

// Navbar Scroll Effect
const navbar = document.getElementById('navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// Smooth Scrolling for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');

        // Only prevent default for valid internal anchors
        if (href !== '#' && href.length > 1) {
            e.preventDefault();
            const target = document.querySelector(href);

            if (target) {
                const offsetTop = target.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        }
    });
});

// Intersection Observer for Fade-in Animations
// Temporarily disabled to improve mobile performance
/*
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe sections for fade-in effect
const sections = document.querySelectorAll('section');
sections.forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
});

// Observe cards for stagger effect
const cards = document.querySelectorAll('.event-card, .announcement-card, .link-card');
cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
    observer.observe(card);
});
*/

// Dynamic Year for Footer
const currentYear = new Date().getFullYear();
const footerYear = document.querySelector('.footer-bottom p');
if (footerYear && !footerYear.textContent.includes(currentYear)) {
    footerYear.textContent = `© ${currentYear} Makena Entertainment. All rights reserved.`;
}

// Particle Effect on Hero (Optional - Lightweight)
function createParticles() {
    const hero = document.querySelector('.hero');
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 3 + 1}px;
            height: ${Math.random() * 3 + 1}px;
            background: rgba(147, 51, 234, ${Math.random() * 0.5 + 0.3});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float ${Math.random() * 10 + 10}s linear infinite;
            animation-delay: ${Math.random() * 5}s;
        `;

        if (hero) {
            hero.appendChild(particle);
        }
    }

    // Add float animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes float {
            0% {
                transform: translateY(0) translateX(0);
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            90% {
                opacity: 1;
            }
            100% {
                transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialize particles on load
window.addEventListener('load', () => {
    createParticles();
});

// Add event listeners for social media links
// You can update these with your actual social media URLs
const socialLinks = {
    instagram: 'https://www.instagram.com/makena_entertainment',
    eventbrite: 'https://www.eventbrite.com/e/makena-brunch-pool-party-tickets-1635855119699#organizer-card',
    whatsapp: 'https://chat.whatsapp.com/BiAHKgTKzhQ3KXasjOwDRs',
    email: 'mailto:info@makenaentertainment.com'
};

// Update all social media links (this is a placeholder - update with actual links)
document.addEventListener('DOMContentLoaded', () => {
    // Note: Update the href="#" in HTML to actual URLs or use this script to set them
    console.log('Makena website loaded successfully!');
    console.log('Remember to update social media links with actual URLs');
});

// Simple Analytics (Page View Tracking)
function trackPageView() {
    const pageData = {
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
    };

    // You can send this to your analytics service
    console.log('Page view:', pageData);
}

trackPageView();

// Track button clicks
const buttons = document.querySelectorAll('.btn');
buttons.forEach(button => {
    button.addEventListener('click', (e) => {
        const buttonText = e.target.textContent.trim();
        console.log('Button clicked:', buttonText);
        // You can send this to your analytics service
    });
});

// Loading State Handler
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
    console.log('All resources loaded');
});

// Error Handling for Images
const images = document.querySelectorAll('img');
images.forEach(img => {
    img.addEventListener('error', function() {
        console.error('Failed to load image:', this.src);
        // You can set a fallback image here
        this.style.background = 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)';
    });
});

// Add hover sound effect (optional)
function addHoverSounds() {
    const interactiveElements = document.querySelectorAll('.btn, .link-card, .event-card, .social-icon');

    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            // Subtle visual feedback
            element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });
    });
}

addHoverSounds();

// Performance Monitoring
const perfData = window.performance.timing;
const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;

window.addEventListener('load', () => {
    console.log(`Page load time: ${pageLoadTime}ms`);
});

// Detect user preferences
if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    console.log('User prefers reduced motion');
    // Disable animations for users who prefer reduced motion
    document.documentElement.style.setProperty('--animation-duration', '0s');
}

// Check if user is on mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile) {
    console.log('Mobile device detected');
    document.body.classList.add('mobile-device');
}

// Lazy load images (if needed in the future)
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            }
        });
    });

    // Observe all images with data-src attribute
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => imageObserver.observe(img));
}

// Add active state to current nav link
function setActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinkItems = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;

            if (window.pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinkItems.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

setActiveNavLink();

// Preload critical resources
function preloadResources() {
    const criticalImages = [
        'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80'
    ];

    criticalImages.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
    });
}

preloadResources();

// Instagram Gallery Carousel
const carouselTrack = document.getElementById('carouselTrack');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const dotsContainer = document.getElementById('carouselDots');

if (carouselTrack && prevBtn && nextBtn && dotsContainer) {
    const slides = Array.from(carouselTrack.children);
    let currentSlide = 0;
    const slideInterval = 5000; // Auto-rotate every 5 seconds
    let autoRotate;

    // Create dots
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('carousel-dot');
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });

    const dots = Array.from(dotsContainer.children);

    function updateCarousel() {
        const slideWidth = slides[0].getBoundingClientRect().width;
        carouselTrack.style.transform = `translateX(-${currentSlide * slideWidth}px)`;

        // Update dots
        dots.forEach((dot, index) => {
            if (index === currentSlide) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    function goToSlide(index) {
        currentSlide = index;
        updateCarousel();
        resetAutoRotate();
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        updateCarousel();
    }

    function prevSlide() {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        updateCarousel();
    }

    function startAutoRotate() {
        autoRotate = setInterval(nextSlide, slideInterval);
    }

    function resetAutoRotate() {
        clearInterval(autoRotate);
        startAutoRotate();
    }

    // Event listeners
    nextBtn.addEventListener('click', () => {
        nextSlide();
        resetAutoRotate();
    });

    prevBtn.addEventListener('click', () => {
        prevSlide();
        resetAutoRotate();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            prevSlide();
            resetAutoRotate();
        } else if (e.key === 'ArrowRight') {
            nextSlide();
            resetAutoRotate();
        }
    });

    // Touch/swipe support
    let touchStartX = 0;
    let touchEndX = 0;

    carouselTrack.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    carouselTrack.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50;
        if (touchStartX - touchEndX > swipeThreshold) {
            nextSlide();
            resetAutoRotate();
        } else if (touchEndX - touchStartX > swipeThreshold) {
            prevSlide();
            resetAutoRotate();
        }
    }

    // Pause auto-rotate on hover
    carouselTrack.addEventListener('mouseenter', () => {
        clearInterval(autoRotate);
    });

    carouselTrack.addEventListener('mouseleave', () => {
        startAutoRotate();
    });

    // Handle window resize
    window.addEventListener('resize', updateCarousel);

    // Start auto-rotation
    startAutoRotate();
    updateCarousel();
}

console.log('%c🎉 Welcome to Makena! 🎉', 'color: #9333ea; font-size: 20px; font-weight: bold;');
console.log('%cOne Life, Good Vibe, Party Hard', 'color: #ec4899; font-size: 14px;');

// All Access Popup Modal
const allAccessPopup = document.getElementById('allAccessPopup');
const closePopup = document.getElementById('closePopup');

// Show popup after 2 seconds
setTimeout(() => {
    if (allAccessPopup && !sessionStorage.getItem('popupShown')) {
        allAccessPopup.classList.add('active');
        sessionStorage.setItem('popupShown', 'true');
    }
}, 2000);

// Close popup when clicking X button
if (closePopup) {
    closePopup.addEventListener('click', () => {
        allAccessPopup.classList.remove('active');
    });
}

// Close popup when clicking outside the content
if (allAccessPopup) {
    allAccessPopup.addEventListener('click', (e) => {
        if (e.target === allAccessPopup) {
            allAccessPopup.classList.remove('active');
        }
    });
}

// Close popup with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && allAccessPopup && allAccessPopup.classList.contains('active')) {
        allAccessPopup.classList.remove('active');
    }
    if (e.key === 'Escape' && discountPopup && discountPopup.classList.contains('active')) {
        discountPopup.classList.remove('active');
    }
});

// ==============================================
// Discount Form Functionality
// ==============================================

console.log('Initializing discount form functionality...');

const discountPopup = document.getElementById('discountPopup');
const closeDiscountPopup = document.getElementById('closeDiscountPopup');
const discountForm = document.getElementById('discountForm');
const discountForm2 = document.getElementById('discountForm2');

console.log('Discount elements found:', {
    popup: !!discountPopup,
    closeBtn: !!closeDiscountPopup,
    form1: !!discountForm,
    form2: !!discountForm2
});

// Google Apps Script Web App URL - You need to replace this with your actual URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx_OtILjzBuiIfS9UXeMK03KIgNYgyjyy2LxJSx5xjJapjGZyNzqZiPKHvYqv0bF8FH/exec';

// Show discount popup after 15 seconds (optional)
setTimeout(() => {
    if (discountPopup && !sessionStorage.getItem('discountPopupShown')) {
        discountPopup.classList.add('active');
        sessionStorage.setItem('discountPopupShown', 'true');
    }
}, 15000);

// Close discount popup
if (closeDiscountPopup) {
    closeDiscountPopup.addEventListener('click', () => {
        discountPopup.classList.remove('active');
    });
}

// Close popup when clicking outside
if (discountPopup) {
    discountPopup.addEventListener('click', (e) => {
        if (e.target === discountPopup) {
            discountPopup.classList.remove('active');
        }
    });
}

// Country code dropdown handlers
const countryCodeSelect = document.getElementById('countryCode');
const customCountryCodeInput = document.getElementById('customCountryCode');
const countryCodeSelect2 = document.getElementById('countryCode2');
const customCountryCodeInput2 = document.getElementById('customCountryCode2');

if (countryCodeSelect && customCountryCodeInput) {
    countryCodeSelect.addEventListener('change', function() {
        if (this.value === 'other') {
            customCountryCodeInput.style.display = 'block';
            customCountryCodeInput.required = true;
        } else {
            customCountryCodeInput.style.display = 'none';
            customCountryCodeInput.required = false;
            customCountryCodeInput.value = '';
        }
    });
}

if (countryCodeSelect2 && customCountryCodeInput2) {
    countryCodeSelect2.addEventListener('change', function() {
        if (this.value === 'other') {
            customCountryCodeInput2.style.display = 'block';
            customCountryCodeInput2.required = true;
        } else {
            customCountryCodeInput2.style.display = 'none';
            customCountryCodeInput2.required = false;
            customCountryCodeInput2.value = '';
        }
    });
}

// Handle form submission - Popup Form
if (discountForm) {
    console.log('Discount form popup found, attaching event listener');
    discountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Popup form submitted');
        await handleDiscountFormSubmit(discountForm, 'discountFormContainer', 'discountCodeContainer');
    });
} else {
    console.log('Discount form popup NOT found');
}

// Handle form submission - Section Form
if (discountForm2) {
    console.log('Discount form section found, attaching event listener');
    discountForm2.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Section form submitted');
        await handleDiscountFormSubmit(discountForm2, 'discountFormContainer2', 'discountCodeContainer2');
    });
} else {
    console.log('Discount form section NOT found');
}

async function handleDiscountFormSubmit(form, formContainerId, codeContainerId) {
    console.log('handleDiscountFormSubmit called');
    const formData = new FormData(form);

    // Validate email format
    const email = formData.get('email').toLowerCase().trim();
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }

    // Combine country code with phone number
    let countryCode = formData.get('countryCode');

    // Check if "Other" was selected and use custom country code
    if (countryCode === 'other') {
        const customCode = formData.get('customCountryCode');
        if (!customCode || !customCode.trim()) {
            alert('Please enter your country code');
            return;
        }
        // Validate custom country code format (+XXX)
        if (!/^\+[0-9]{1,4}$/.test(customCode.trim())) {
            alert('Please enter a valid country code (e.g., +212, +91)');
            return;
        }
        countryCode = customCode.trim();
    }

    const phoneNumber = formData.get('phone').replace(/\s+/g, ''); // Remove spaces
    const fullPhone = countryCode + phoneNumber;

    // Validate phone number (6-15 digits)
    if (!/^[0-9]{6,15}$/.test(phoneNumber)) {
        alert('Please enter a valid phone number (6-15 digits)');
        return;
    }

    const data = {
        firstName: formData.get('firstName').trim(),
        lastName: formData.get('lastName').trim(),
        email: email,
        phone: fullPhone,
        timestamp: new Date().toISOString()
    };

    // Check for duplicate submission (email-based)
    const submittedEmails = JSON.parse(localStorage.getItem('makenaSubmittedEmails') || '[]');
    if (submittedEmails.includes(email)) {
        alert('This email has already been used to claim a discount code. Each email can only be used once.');
        console.log('Duplicate email detected:', email);
        return;
    }

    console.log('Form data collected:', data);
    console.log('Google Script URL:', GOOGLE_SCRIPT_URL);

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    try {
        console.log('Sending data to Google Sheets...');
        console.log('Request payload:', JSON.stringify(data));

        const startTime = Date.now();

        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const endTime = Date.now();
        console.log(`Request completed in ${endTime - startTime}ms`);
        console.log('Response received:', response);
        console.log('Response status:', response.status);
        console.log('Response type:', response.type);

        // Note: With mode: 'no-cors', we can't read the response body
        // The request will still go through, but response will be opaque
        console.log('⚠️ Note: Using no-cors mode - response is opaque, but data should still be sent');

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Hide form, show code
        document.getElementById(formContainerId).style.display = 'none';
        document.getElementById(codeContainerId).style.display = 'block';

        // Store in localStorage to prevent duplicate submissions
        localStorage.setItem('makenaDiscountClaimed', 'true');

        // Store the email to prevent duplicate submissions
        const submittedEmails = JSON.parse(localStorage.getItem('makenaSubmittedEmails') || '[]');
        submittedEmails.push(email);
        localStorage.setItem('makenaSubmittedEmails', JSON.stringify(submittedEmails));

        console.log('✅ Discount code displayed');
        console.log('✅ Email stored to prevent duplicates');

    } catch (error) {
        console.error('❌ Error submitting form:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        alert('There was an error processing your request. Please try again.');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Copy discount code functionality
const copyCodeBtn = document.getElementById('copyCodeBtn');
const copyCodeBtn2 = document.getElementById('copyCodeBtn2');

if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', () => {
        copyDiscountCode('discountCodeText', copyCodeBtn);
    });
}

if (copyCodeBtn2) {
    copyCodeBtn2.addEventListener('click', () => {
        copyDiscountCode('discountCodeText2', copyCodeBtn2);
    });
}

function copyDiscountCode(textElementId, button) {
    const codeText = document.getElementById(textElementId).textContent;
    navigator.clipboard.writeText(codeText).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    });
}

// Check if user already claimed discount and show code directly
function checkAndShowExistingDiscount() {
    if (localStorage.getItem('makenaDiscountClaimed')) {
        console.log('User has already claimed discount, showing code directly');

        // Don't show popup if already claimed
        sessionStorage.setItem('discountPopupShown', 'true');

        // Hide forms and show discount codes in both locations
        const formContainer1 = document.getElementById('discountFormContainer');
        const codeContainer1 = document.getElementById('discountCodeContainer');
        const formContainer2 = document.getElementById('discountFormContainer2');
        const codeContainer2 = document.getElementById('discountCodeContainer2');

        if (formContainer1 && codeContainer1) {
            formContainer1.style.display = 'none';
            codeContainer1.style.display = 'block';
        }

        if (formContainer2 && codeContainer2) {
            formContainer2.style.display = 'none';
            codeContainer2.style.display = 'block';
        }
    }
}

// Run on page load
checkAndShowExistingDiscount();

// ==============================================
// TEST FUNCTION - Run this from browser console
// ==============================================

/**
 * Test the Google Apps Script integration
 * Run this in the browser console: testGoogleSheets()
 */
window.testGoogleSheets = async function() {
    console.log('🧪 Starting Google Sheets integration test...');
    console.log('📍 Google Script URL:', GOOGLE_SCRIPT_URL);

    const testData = {
        firstName: 'TEST',
        lastName: 'USER',
        email: 'test@makena.com',
        phone: '+33612345678',
        timestamp: new Date().toISOString()
    };

    console.log('📤 Sending test data:', testData);

    try {
        const startTime = Date.now();

        // Test with no-cors mode (current setup)
        console.log('🔄 Sending request with no-cors mode...');
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        const endTime = Date.now();

        console.log('✅ Request completed!');
        console.log('⏱️ Time taken:', `${endTime - startTime}ms`);
        console.log('📊 Response object:', response);
        console.log('📊 Response type:', response.type);
        console.log('📊 Response status:', response.status);

        if (response.type === 'opaque') {
            console.log('ℹ️ Response is opaque (no-cors mode)');
            console.log('ℹ️ This is normal - check your Google Sheet for the test data');
            console.log('ℹ️ Look for a row with: TEST, USER, test@makena.com, +33612345678');
        }

        console.log('\n✅ Test completed! Check your Google Sheet:');
        console.log('   1. Open your Google Sheet');
        console.log('   2. Look for a new row with the test data above');
        console.log('   3. If you see it, the integration is working! 🎉');
        console.log('   4. If not, check the troubleshooting steps below\n');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        console.log('\n🔍 Troubleshooting:');
        console.log('   1. Check the Google Apps Script URL is correct');
        console.log('   2. Verify deployment settings (Execute as: Me, Access: Anyone)');
        console.log('   3. Check Google Apps Script execution logs');
        console.log('   4. Make sure the Apps Script has the doPost function');
    }
};

// Make test function available globally
console.log('💡 Test function ready! Run testGoogleSheets() in the console to test the integration');
