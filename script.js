// ── Theme Management ─────────────────────────────────────────────────────
(function () {
    var STORAGE_KEY = 'makena-theme';

    var moonSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    var sunSVG  = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

    function isDark() {
        var attr = document.documentElement.getAttribute('data-theme');
        if (attr === 'dark') return true;
        if (attr === 'light') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function applyTheme(dark) {
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        try { localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light'); } catch (e) {}
        syncButtons();
    }

    function syncButtons() {
        var dark = isDark();
        var label = dark ? 'Switch to light theme' : 'Switch to dark theme';
        document.querySelectorAll('.theme-toggle').forEach(function (btn) {
            btn.innerHTML = dark ? sunSVG : moonSVG;
            btn.setAttribute('aria-label', label);
            btn.title = label;
        });
    }

    function injectButtons() {
        document.querySelectorAll('.nav-links').forEach(function (ul) {
            if (ul.querySelector('.theme-toggle-item')) return;
            var li  = document.createElement('li');
            li.className = 'theme-toggle-item';
            var btn = document.createElement('button');
            btn.className = 'theme-toggle';
            btn.addEventListener('click', function () { applyTheme(!isDark()); });
            li.appendChild(btn);
            ul.appendChild(li);
        });
        syncButtons();
    }

    // Listen for OS-level theme changes when user hasn't set an explicit preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        if (!document.documentElement.hasAttribute('data-theme')) syncButtons();
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectButtons);
    } else {
        injectButtons();
    }
}());

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
    email: 'mailto:admin@makenaevents.com'
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

// Sold-out/completed ticket notice
const ticketModal = document.getElementById('ticketModal');
const ticketModalTitle = document.getElementById('ticketModalTitle');
const ticketModalMessage = document.getElementById('ticketModalMessage');
const unavailableTicketLinks = document.querySelectorAll('.unavailable-ticket');

function openTicketModal(title, message) {
    if (!ticketModal) {
        return;
    }

    if (ticketModalTitle && title) {
        ticketModalTitle.textContent = title;
    }

    if (ticketModalMessage && message) {
        ticketModalMessage.textContent = message;
    }

    ticketModal.classList.add('is-open');
    ticketModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeTicketModal() {
    if (!ticketModal) {
        return;
    }

    ticketModal.classList.remove('is-open');
    ticketModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

unavailableTicketLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        openTicketModal(link.dataset.modalTitle, link.dataset.modalMessage);
    });
});

document.querySelectorAll('[data-close-ticket-modal]').forEach(closeControl => {
    closeControl.addEventListener('click', closeTicketModal);
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ticketModal && ticketModal.classList.contains('is-open')) {
        closeTicketModal();
    }
});

// Makena cart and embedded Stripe checkout
(function () {

    // ── Ticket catalog (mirrors backend) ─────────────────────────────────────
    var TICKETS = {
        flex_trio_pass:           { name: '3X ACCESS PASS | The Flex Trio', price: 8000, currency: 'eur' },
        five_elite_pass:          { name: 'FIVE ELITE PASS',                price: 12000, currency: 'eur' },
        weekend_pulse_pass:       { name: 'WEEK-END PULSE',                 price: 14000, currency: 'eur' },
        vip_infinite_pass:        { name: 'VIP INFINITE PASS',              price: 30000, currency: 'eur' },
        welcome_party:            { name: 'Welcome Party',                  price: 3000, currency: 'usd' },
        wet_dreams_pool_party:    { name: 'Wet Dreams Pool Party',          price: 2500, currency: 'usd' },
        french_connection:        { name: 'French Connection',              price: 2500, currency: 'usd' },
        festival_kick_off:        { name: 'Festival Kick Off',              price: 2500, currency: 'usd' },
        makena_boat_party:        { name: 'Makena Boat Party',              price: 7000, currency: 'usd' },
        all_white_party:          { name: 'All White Party',                price: 5000, currency: 'usd' },
        rep_your_flag:            { name: 'SEXIEST PRE GAME',                  price: 2500, currency: 'usd' },
        afro_beats_vs_amapiano:   { name: 'Afro Beats vs Amapiano',        price: 2500, currency: 'usd' },
        rnb_old_school_day_party: { name: 'RnB & Old School Day Party',    price: 2500, currency: 'usd' },
        caribbean_energy:         { name: 'Soca × Reggaeton × Kompa',      price: 2500, currency: 'usd' },
        where_tall_people_meet:   { name: 'Where Tall People Meet',        price: 2500, currency: 'usd' },
        red_flag_party:           { name: 'Red Flag Party',                 price: 2500, currency: 'usd' },
        all_orange_day_party:     { name: 'All Orange Day Party',           price: 2500, currency: 'usd' },
        closing_party_in_style:         { name: 'Closing Party in Style',                    price: 2500, currency: 'usd' },
        dc_trio_pass:                   { name: 'AfroPlusFest DC - Trio Pass',                price: 5000,  currency: 'usd' },
        dc_five_event_pass:             { name: 'AfroPlusFest DC - 5-Event Pass',             price: 7500,  currency: 'usd' },
        dc_full_fest_pass:              { name: 'AfroPlusFest DC - Full Fest Pass',          price: 17900, currency: 'usd' },
        dc_party_pass:                  { name: 'AfroPlusFest DC - Party Pass',               price: 11900, currency: 'usd' },
        dc_welcome_party:               { name: 'AfroPlusFest DC - Welcome Party',            price: 2000, currency: 'usd' },
        dc_rnb_day_party:               { name: 'AfroPlusFest DC - R&B Day Party',            price: 1500, currency: 'usd' },
        dc_amapiano_vs_afrobeat:        { name: 'AfroPlusFest DC - Amapiano vs Afrobeat',     price: 2000, currency: 'usd' },
        dc_brunch_day_party:            { name: 'AfroPlusFest DC - Brunch Day Party',         price: 1500, currency: 'usd' },
        dc_dancehall_soca_party:        { name: 'AfroPlusFest DC - Dancehall Soca Kompa',     price: 2000, currency: 'usd' },
        dc_group_chat_linkup:           { name: 'AfroPlusFest DC - Group Chat Link Up',       price: 1500, currency: 'usd' },
        dc_last_last_after_party:       { name: 'AfroPlusFest DC - Last Last After Party',    price: 2000, currency: 'usd' },
        dc_all_white_boat_party:        { name: 'AfroPlusFest DC - All White Boat Party',     price: 6500, currency: 'usd' },
        dc_all_white_closing_party:     { name: 'AfroPlusFest DC - All White Closing Party',  price: 2000, currency: 'usd' }
    };
    var ticketAvailability = {};

    function fmt(cents, currency) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: (currency || 'usd').toUpperCase()
        }).format(cents / 100);
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, function (char) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[char];
        });
    }

    // ── Cart state (localStorage) ─────────────────────────────────────────────
    var CART_KEY = 'makena_cart';

    function getCart() {
        try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; }
    }

    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        syncCartUI();
    }

    function addToCart(ticketId) {
        if (ticketAvailability[ticketId] && ticketAvailability[ticketId].soldOut) {
            alert('This event is sold out.');
            return;
        }

        var cart = getCart();
        var ticket = TICKETS[ticketId];
        var cartCurrency = getCartCurrency(cart);
        if (ticket && cartCurrency && ticket.currency !== cartCurrency) {
            alert('Please checkout tickets in one currency at a time.');
            return;
        }

        var existing = cart.find(function (i) { return i.ticketId === ticketId; });
        if (existing) { existing.quantity = Math.min(existing.quantity + 1, 10); }
        else { cart.push({ ticketId: ticketId, quantity: 1 }); }
        saveCart(cart);
        openCartPanel();
    }

    function setQty(ticketId, delta) {
        var cart = getCart();
        var item = cart.find(function (i) { return i.ticketId === ticketId; });
        if (!item) return;
        item.quantity = Math.max(1, Math.min(item.quantity + delta, 10));
        saveCart(cart);
    }

    function removeItem(ticketId) {
        saveCart(getCart().filter(function (i) { return i.ticketId !== ticketId; }));
    }

    function cartCount() {
        return getCart().reduce(function (s, i) { return s + i.quantity; }, 0);
    }

    function cartTotal() {
        return getCart().reduce(function (s, i) {
            var t = TICKETS[i.ticketId];
            return s + (t ? t.price * i.quantity : 0);
        }, 0);
    }

    function getCartCurrency(cart) {
        cart = cart || getCart();
        var firstTicket = cart.map(function (item) { return TICKETS[item.ticketId]; }).find(Boolean);
        return firstTicket ? firstTicket.currency : null;
    }

    function updateTicketPrice(ticketId, amount, currency) {
        if (TICKETS[ticketId] && Number.isFinite(amount)) {
            TICKETS[ticketId].price = amount;
            if (currency) TICKETS[ticketId].currency = currency;
        }
    }

    // ── Cart UI ───────────────────────────────────────────────────────────────
    function syncCartUI() {
        var badge = document.getElementById('makena-cart-badge');
        if (badge) { var n = cartCount(); badge.textContent = n; badge.hidden = n === 0; }
        renderCartItems();
    }

    function renderCartItems() {
        var list = document.getElementById('makena-cart-items');
        var footer = document.getElementById('makena-cart-footer');
        if (!list) return;
        var cart = getCart();

        if (cart.length === 0) {
            list.innerHTML = '<p class="cart-panel__empty">Your cart is empty.<br>Add events to get started.</p>';
            if (footer) footer.hidden = true;
            return;
        }
        if (footer) footer.hidden = false;

        list.innerHTML = cart.map(function (item) {
            var t = TICKETS[item.ticketId];
            if (!t) return '';
            return '<div class="cart-item" data-id="' + item.ticketId + '">' +
                '<div class="cart-item__info">' +
                    '<span class="cart-item__name">' + t.name + '</span>' +
                    '<span class="cart-item__price">' + fmt(t.price, t.currency) + ' each</span>' +
                '</div>' +
                '<div class="cart-item__controls">' +
                    '<button class="cart-item__qty-btn" data-action="dec" data-id="' + item.ticketId + '" aria-label="Decrease">−</button>' +
                    '<span class="cart-item__qty">' + item.quantity + '</span>' +
                    '<button class="cart-item__qty-btn" data-action="inc" data-id="' + item.ticketId + '" aria-label="Increase">+</button>' +
                    '<button class="cart-item__remove" data-id="' + item.ticketId + '" aria-label="Remove">×</button>' +
                '</div>' +
            '</div>';
        }).join('');

        var totalEl = document.getElementById('makena-cart-total');
        if (totalEl) totalEl.textContent = fmt(cartTotal(), getCartCurrency(cart));
    }

    function renderTicketTierSummary(button, availability) {
        var actions = button.closest('.ticket-actions');
        if (!actions || actions.querySelector('.ticket-tier-summary')) return;

        var summary = document.createElement('div');
        summary.className = 'ticket-tier-summary';
        actions.parentNode.insertBefore(summary, actions);

        summary.innerHTML = availability.tiers.map(function (tier) {
            var status = '';
            if (tier.soldOut) status = '<span class="ticket-tier-summary__status">Sold out</span>';
            else if (tier.lowInventory && tier.remaining !== null) status = '<span class="ticket-tier-summary__status ticket-tier-summary__status--low">Almost sold out: ' + tier.remaining + ' left</span>';
            else if (tier.active) status = '<span class="ticket-tier-summary__status ticket-tier-summary__status--active">Available now</span>';

            return '<div class="ticket-tier-summary__row' + (tier.soldOut ? ' is-sold-out' : '') + (tier.active ? ' is-active' : '') + '">' +
                '<span>' + escapeHtml(tier.name) + '</span>' +
                '<strong>' + fmt(tier.amount, tier.currency) + '</strong>' +
                status +
            '</div>';
        }).join('');
    }

    function applyAvailabilityToButtons() {
        document.querySelectorAll('.stripe-ticket-button').forEach(function (button) {
            var ticketId = button.dataset.ticketId;
            var availability = ticketAvailability[ticketId];
            if (!availability) return;

            if (availability.activeTier) {
                updateTicketPrice(ticketId, availability.activeTier.amount, availability.activeTier.currency);
                button.textContent = 'Buy Now - ' + fmt(availability.activeTier.amount, availability.activeTier.currency);
            }

            if (availability.soldOut) {
                button.disabled = true;
                button.textContent = 'Sold Out';
                var addBtn = button.parentNode.querySelector('.btn-cart');
                if (addBtn) addBtn.disabled = true;
            }

            renderTicketTierSummary(button, availability);
        });
        syncCartUI();
    }

    async function loadTicketAvailability() {
        try {
            var response = await fetch('/.netlify/functions/ticket-availability');
            var data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Unable to load ticket availability.');

            ticketAvailability = {};
            (data.events || []).forEach(function (eventAvailability) {
                ticketAvailability[eventAvailability.ticketId] = eventAvailability;
            });
            applyAvailabilityToButtons();
        } catch (error) {
            console.warn('Ticket availability unavailable:', error.message || error);
        }
    }

    function buildCartPanel() {
        var panel = document.createElement('div');
        panel.id = 'makena-cart-panel';
        panel.className = 'cart-panel';
        panel.innerHTML =
            '<div class="cart-panel__header">' +
                '<h2 class="cart-panel__title">Your Cart</h2>' +
                '<button class="cart-panel__close" id="makena-cart-close" aria-label="Close cart">×</button>' +
            '</div>' +
            '<div class="cart-panel__items" id="makena-cart-items"></div>' +
            '<div class="cart-panel__footer" id="makena-cart-footer" hidden>' +
                '<div class="cart-panel__total-row"><span>Total</span><span id="makena-cart-total">$0.00</span></div>' +
                '<button class="btn btn-primary cart-panel__checkout-btn" id="makena-cart-checkout">Checkout</button>' +
            '</div>';
        document.body.appendChild(panel);

        var overlay = document.createElement('div');
        overlay.id = 'makena-cart-overlay';
        overlay.className = 'cart-overlay';
        document.body.appendChild(overlay);

        document.getElementById('makena-cart-close').addEventListener('click', closeCartPanel);
        overlay.addEventListener('click', closeCartPanel);

        panel.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-action]');
            if (btn) {
                if (btn.dataset.action === 'inc') setQty(btn.dataset.id, 1);
                if (btn.dataset.action === 'dec') setQty(btn.dataset.id, -1);
            }
            var rem = e.target.closest('.cart-item__remove');
            if (rem) removeItem(rem.dataset.id);
        });

        document.getElementById('makena-cart-checkout').addEventListener('click', function () {
            var items = getCart();
            if (!items.length) return;
            closeCartPanel();
            openCheckout(null, null, items);
        });
    }

    function openCartPanel() {
        if (!document.getElementById('makena-cart-panel')) buildCartPanel();
        renderCartItems();
        document.getElementById('makena-cart-panel').classList.add('cart-panel--open');
        document.getElementById('makena-cart-overlay').classList.add('cart-overlay--open');
        document.body.classList.add('checkout-modal-open');
    }

    function closeCartPanel() {
        var p = document.getElementById('makena-cart-panel');
        var o = document.getElementById('makena-cart-overlay');
        if (p) p.classList.remove('cart-panel--open');
        if (o) o.classList.remove('cart-overlay--open');
        document.body.classList.remove('checkout-modal-open');
    }

    // ── Navbar cart icon ──────────────────────────────────────────────────────
    var navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        var li = document.createElement('li');
        li.innerHTML =
            '<button class="cart-nav-btn" id="makena-cart-nav-btn" aria-label="View cart">' +
                '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                    '<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>' +
                    '<line x1="3" y1="6" x2="21" y2="6"/>' +
                    '<path d="M16 10a4 4 0 01-8 0"/>' +
                '</svg>' +
                '<span class="cart-badge" id="makena-cart-badge" hidden>0</span>' +
            '</button>';
        navLinks.appendChild(li);
        li.querySelector('#makena-cart-nav-btn').addEventListener('click', openCartPanel);
    }

    // ── Embedded Stripe checkout modal ────────────────────────────────────────
    var stripeInstance = null;
    var embeddedCheckout = null;

    function buildCheckoutModal() {
        var modal = document.createElement('div');
        modal.id = 'makena-checkout-modal';
        modal.className = 'checkout-modal';
        modal.innerHTML =
            '<div class="checkout-modal__backdrop"></div>' +
            '<div class="checkout-modal__dialog">' +
                '<button class="checkout-modal__close" aria-label="Close checkout">×</button>' +
                '<div id="makena-checkout-container" class="checkout-modal__container"></div>' +
            '</div>';
        document.body.appendChild(modal);
        modal.querySelector('.checkout-modal__backdrop').addEventListener('click', closeCheckoutModal);
        modal.querySelector('.checkout-modal__close').addEventListener('click', closeCheckoutModal);
    }

    function closeCheckoutModal() {
        var modal = document.getElementById('makena-checkout-modal');
        if (modal) modal.classList.remove('checkout-modal--open');
        document.body.classList.remove('checkout-modal-open');
        if (embeddedCheckout) { embeddedCheckout.destroy(); embeddedCheckout = null; }
        var c = document.getElementById('makena-checkout-container');
        if (c) c.innerHTML = '';
    }

    function loadStripeJs() {
        return new Promise(function (resolve, reject) {
            if (window.Stripe) { resolve(); return; }
            var s = document.createElement('script');
            s.src = 'https://js.stripe.com/v3/';
            s.onload = resolve;
            s.onerror = function () { reject(new Error('Could not load Stripe.')); };
            document.head.appendChild(s);
        });
    }

    // ticketId+quantity for Buy Now, items[] for cart checkout
    async function openCheckout(ticketId, quantity, items) {
        if (!document.getElementById('makena-checkout-modal')) buildCheckoutModal();
        document.getElementById('makena-checkout-modal').classList.add('checkout-modal--open');
        document.body.classList.add('checkout-modal-open');
        var container = document.getElementById('makena-checkout-container');
        container.innerHTML = '<p class="checkout-modal__loading">Loading secure checkout…</p>';

        try {
            var body = items ? { items: items } : { ticketId: ticketId, quantity: quantity };
            var response = await fetch('/.netlify/functions/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            var data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Unable to start checkout.');

            await loadStripeJs();
            if (!stripeInstance) stripeInstance = window.Stripe(data.publishableKey);
            if (embeddedCheckout) { embeddedCheckout.destroy(); embeddedCheckout = null; }
            container.innerHTML = '';
            embeddedCheckout = await stripeInstance.initEmbeddedCheckout({ clientSecret: data.clientSecret });
            embeddedCheckout.mount('#makena-checkout-container');
        } catch (error) {
            container.innerHTML = '<p class="checkout-modal__error">' + escapeHtml(error.message) + '</p>';
        }
    }

    // ── Global Escape handler ─────────────────────────────────────────────────
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        var checkoutModal = document.getElementById('makena-checkout-modal');
        if (checkoutModal && checkoutModal.classList.contains('checkout-modal--open')) {
            closeCheckoutModal();
        } else {
            closeCartPanel();
        }
    });

    // ── Wire up event card buttons ────────────────────────────────────────────
    document.querySelectorAll('.stripe-ticket-button').forEach(function (button) {
        var ticketId = button.dataset.ticketId;
        if (!ticketId) return;

        button.textContent = 'Buy Now';

        var addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn btn-cart btn-small';
        addBtn.textContent = 'Add to Cart';
        button.parentNode.insertBefore(addBtn, button);

        addBtn.addEventListener('click', function () { addToCart(ticketId); });
        button.addEventListener('click', function () { openCheckout(ticketId, 1, null); });
    });

    // ── Init badge ────────────────────────────────────────────────────────────
    syncCartUI();
    loadTicketAvailability();

    // ── Bundle nudge (individual DC event pages only) ─────────────────────────
    var DC_INDIVIDUAL_IDS = new Set([
        'dc_welcome_party', 'dc_rnb_day_party', 'dc_amapiano_vs_afrobeat',
        'dc_brunch_day_party', 'dc_dancehall_soca_party', 'dc_group_chat_linkup',
        'dc_last_last_after_party', 'dc_all_white_boat_party', 'dc_all_white_closing_party'
    ]);

    var pageTicketId = (document.querySelector('.stripe-ticket-button') || {}).dataset && document.querySelector('.stripe-ticket-button').dataset.ticketId;

    if (pageTicketId && DC_INDIVIDUAL_IDS.has(pageTicketId) && !sessionStorage.getItem('bundleNudgeDismissed')) {
        var nudge = document.createElement('div');
        nudge.id = 'bundle-nudge';
        nudge.innerHTML =
            '<div class="bundle-nudge__inner">' +
            '<span class="bundle-nudge__icon">🎉</span>' +
            '<div class="bundle-nudge__text">' +
            '<strong>Save up to $20 — bundle your events!</strong>' +
            '<span>Trio Pass saves $10 · 5-Event Pass saves $20 · Full Week Pass saves even more</span>' +
            '</div>' +
            '<a href="dc-packages.html" class="bundle-nudge__cta">See Packages</a>' +
            '<button class="bundle-nudge__close" aria-label="Dismiss">✕</button>' +
            '</div>';
        document.body.appendChild(nudge);

        setTimeout(function () { nudge.classList.add('bundle-nudge--visible'); }, 1200);

        nudge.querySelector('.bundle-nudge__close').addEventListener('click', function () {
            nudge.classList.remove('bundle-nudge--visible');
            sessionStorage.setItem('bundleNudgeDismissed', '1');
        });
    }

}());

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

// ==============================================
// Discount Form Functionality
// ==============================================

// Production mode - disable console logs
const IS_PRODUCTION = true; // Set to false for debugging
const log = IS_PRODUCTION ? () => {} : console.log.bind(console);

log('Initializing discount form functionality...');

const discountPopup = document.getElementById('discountPopup');
const closeDiscountPopup = document.getElementById('closeDiscountPopup');
const discountForm = document.getElementById('discountForm');
const discountForm2 = document.getElementById('discountForm2');

log('Discount elements found:', {
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

// Close popup with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && discountPopup && discountPopup.classList.contains('active')) {
        discountPopup.classList.remove('active');
    }
});

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
    log('Discount form popup found, attaching event listener');
    discountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        log('Popup form submitted');
        await handleDiscountFormSubmit(discountForm, 'discountFormContainer', 'discountCodeContainer');
    });
} else {
    log('Discount form popup NOT found');
}

// Handle form submission - Section Form
if (discountForm2) {
    log('Discount form section found, attaching event listener');
    discountForm2.addEventListener('submit', async (e) => {
        e.preventDefault();
        log('Section form submitted');
        await handleDiscountFormSubmit(discountForm2, 'discountFormContainer2', 'discountCodeContainer2');
    });
} else {
    log('Discount form section NOT found');
}

async function handleDiscountFormSubmit(form, formContainerId, codeContainerId) {
    log('handleDiscountFormSubmit called');
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
    // Store hashed email instead of plain text for privacy
    const emailHash = await hashEmail(email);
    const submittedHashes = JSON.parse(localStorage.getItem('makenaSubmittedHashes') || '[]');
    if (submittedHashes.includes(emailHash)) {
        alert('This email has already been used to claim a discount code. Each email can only be used once.');
        log('Duplicate email detected');
        return;
    }

    log('Form validation passed');
    // DON'T log sensitive data in production

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    try {
        log('Sending data to Google Sheets...');

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
        log(`Request completed in ${endTime - startTime}ms`);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Hide form, show code
        document.getElementById(formContainerId).style.display = 'none';
        document.getElementById(codeContainerId).style.display = 'block';

        // Store in localStorage to prevent duplicate submissions
        localStorage.setItem('makenaDiscountClaimed', 'true');

        // Store the hashed email to prevent duplicate submissions (privacy-preserving)
        const submittedHashes = JSON.parse(localStorage.getItem('makenaSubmittedHashes') || '[]');
        submittedHashes.push(emailHash);
        localStorage.setItem('makenaSubmittedHashes', JSON.stringify(submittedHashes));

        log('✅ Discount code displayed');

    } catch (error) {
        console.error('Error submitting form'); // Only log generic error, not details
        alert('There was an error processing your request. Please try again.');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Helper function to hash emails for privacy
async function hashEmail(email) {
    const encoder = new TextEncoder();
    const data = encoder.encode(email);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
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
        log('User has already claimed discount, showing code directly');

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
    console.log('📍 Google Script URL: [REDACTED]');

    const testData = {
        firstName: 'TEST',
        lastName: 'USER',
        email: 'test@makena.com',
        phone: '+33612345678',
        timestamp: new Date().toISOString()
    };

    console.log('📤 Sending test data: [DATA REDACTED FOR SECURITY]');

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
