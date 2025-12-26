# Makena Entertainment Website

A modern, responsive entertainment company website built with HTML, CSS, and JavaScript. Features a vibrant purple and gold theme with smooth animations and mobile-friendly design.

## Features

- **Modern Design**: Dark theme with purple and gold gradient accents
- **Fully Responsive**: Optimized for desktop, tablet, and mobile devices
- **Smooth Animations**: Fade-in effects, hover animations, and scroll indicators
- **Event Showcase**: Display upcoming events with Eventbrite integration
- **Social Media Integration**: Links to all major social platforms
- **Announcements Section**: Share news and updates with your audience
- **Performance Optimized**: Fast loading with lazy loading and optimized assets

## File Structure

```
Makena/
├── index.html          # Main HTML structure
├── styles.css          # All styling and animations
├── script.js           # Interactive functionality
└── README.md           # This file
```

## Quick Start

1. **Open the website**: Simply open `index.html` in your web browser
2. **No build process needed**: This is a static website that works immediately

## Customization Guide

### 1. Update Social Media Links

In `index.html`, find all instances of `href="#"` and replace with your actual social media URLs:

```html
<!-- Example: Update Instagram link -->
<a href="https://instagram.com/yourusername" class="social-icon" target="_blank">
```

Social media sections to update:
- Hero section social icons
- Links section cards
- Footer social icons

### 2. Update Eventbrite Link

Find the Eventbrite link card and button:

```html
<a href="https://eventbrite.com/o/your-organizer-id" class="link-card eventbrite">
```

### 3. Update Contact Information

Update the email address:

```html
<a href="mailto:your-email@makena.com" class="link-card">
```

Update WhatsApp number (replace with your number in international format):

```html
<a href="https://wa.me/1234567890" class="link-card whatsapp">
```

### 4. Add Real Events

Replace the placeholder event cards in the Events section:

```html
<div class="event-card">
    <div class="event-image">
        <img src="path-to-your-image.jpg" alt="Event Name">
        <div class="event-badge">Live Now</div> <!-- or "Coming Soon" -->
    </div>
    <div class="event-content">
        <h3 class="event-title">Your Event Name</h3>
        <p class="event-date">📅 January 15, 2026</p>
        <p class="event-location">📍 Your Venue Name</p>
        <p class="event-description">Your event description here.</p>
        <a href="your-eventbrite-link" class="btn btn-primary btn-small">Get Tickets</a>
    </div>
</div>
```

### 5. Update Announcements

Modify the announcement cards:

```html
<div class="announcement-card">
    <div class="announcement-icon">🎉</div> <!-- Change emoji -->
    <h3 class="announcement-title">Your Announcement Title</h3>
    <p class="announcement-date">Your Date</p>
    <p class="announcement-text">Your announcement text here.</p>
</div>
```

### 6. Customize Colors

In `styles.css`, modify the color variables at the top:

```css
:root {
    --primary-color: #9333ea;        /* Main purple */
    --secondary-color: #f59e0b;      /* Gold/Orange accent */
    --accent-color: #ec4899;         /* Pink accent */
    /* Modify these to change the entire color scheme */
}
```

### 7. Change Company Info

Update the about section text in `index.html`:

```html
<section class="about" id="about">
    <div class="about-content">
        <p class="about-text">
            Your custom about text here...
        </p>
    </div>
</section>
```

### 8. Add Your Logo

Replace the text logo with an image:

```html
<div class="logo">
    <img src="path-to-your-logo.png" alt="Makena Logo" style="height: 40px;">
</div>
```

## Adding New Sections

To add a new section, follow this template:

```html
<section class="your-section-name" id="your-section">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Your Section Title</h2>
            <div class="title-underline"></div>
        </div>
        <!-- Your content here -->
    </div>
</section>
```

Don't forget to add the navigation link:

```html
<li><a href="#your-section">Your Section</a></li>
```

## Image Recommendations

- **Event Images**: 800x600px (4:3 ratio)
- **Hero Background**: 1920x1080px for best quality
- **Logo**: PNG format with transparency, 200-400px width
- **File Format**: JPEG for photos, PNG for logos/graphics

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Tips

1. **Optimize Images**: Use compressed images (tools like TinyPNG)
2. **Use WebP Format**: For modern browsers, convert images to WebP
3. **Lazy Loading**: Images load as they come into view (already implemented)
4. **CDN**: Consider hosting images on a CDN for faster loading

## Deployment Options

### Option 1: GitHub Pages (Free)
1. Create a GitHub repository
2. Upload all files
3. Go to Settings > Pages
4. Select main branch
5. Your site will be live at `https://yourusername.github.io/repository-name`

### Option 2: Netlify (Free)
1. Sign up at netlify.com
2. Drag and drop the Makena folder
3. Get instant deployment with custom domain support

### Option 3: Vercel (Free)
1. Sign up at vercel.com
2. Import from GitHub or upload files
3. Automatic deployments with each update

### Option 4: Traditional Web Hosting
Upload all files to your web hosting via FTP/cPanel

## Analytics Integration

To add Google Analytics, add this before the closing `</head>` tag:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR-GA-ID"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'YOUR-GA-ID');
</script>
```

## SEO Optimization

Add these meta tags to `<head>`:

```html
<meta name="description" content="Makena - One Life, Good Vibe, Party Hard. Experience unforgettable events featuring Afrobeats, Amapiano, and global sounds.">
<meta name="keywords" content="makena, events, afrobeats, amapiano, entertainment, parties">
<meta property="og:title" content="Makena - One Life, Good Vibe, Party Hard">
<meta property="og:description" content="Experience unforgettable events and entertainment.">
<meta property="og:image" content="path-to-share-image.jpg">
<meta property="og:url" content="https://yourdomain.com">
<meta name="twitter:card" content="summary_large_image">
```

## Troubleshooting

**Mobile menu not working?**
- Check that script.js is properly linked
- Clear browser cache

**Images not showing?**
- Verify image paths are correct
- Check file extensions match (jpg vs jpeg)

**Animations not smooth?**
- Ensure you're using a modern browser
- Check JavaScript console for errors

## Need Help?

- Check browser console (F12) for errors
- Ensure all files are in the same directory
- Verify all links are updated from `#` placeholders

## Future Enhancements

Consider adding:
- Newsletter signup form
- Photo/video gallery with lightbox
- Ticket purchase integration
- Blog section for news
- Artist/DJ profiles
- Past event archive
- Testimonials section

## Credits

Built with:
- HTML5
- CSS3 (with CSS Grid and Flexbox)
- Vanilla JavaScript
- Google Fonts (Poppins)
- Unsplash (placeholder images)

---

**Built for Makena Entertainment**
One Life, Good Vibe, Party Hard 🎉
