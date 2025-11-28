# Freshnest Cleaning NYC - Mobile-First Website

A professional, mobile-first website for Freshnest Cleaning NYC featuring upholstery and carpet cleaning services with image upload and ClickSend SMS integration.

## 🌟 Features

- **Mobile-First Design**: Fully responsive design optimized for mobile devices
- **Image Upload**: Drag & drop or click to upload up to 5 images (5MB each)
- **ClickSend Integration**: Sends SMS/MMS with customer inquiries and photos
- **Interactive Gallery**: Before/after slideshow for showcasing results
- **Professional Forms**: Contact form with validation
- **Smooth Animations**: CSS animations and scroll effects
- **SEO Optimized**: Proper meta tags and semantic HTML

## 📁 Project Structure

```
cleaning-website/
├── index.html          # Main website file
├── styles.css          # Responsive CSS styles
├── script.js           # JavaScript functionality
├── config.js           # Configuration settings
├── logo.png            # Company logo (to be added)
└── README.md           # This documentation
```

## 🚀 Getting Started

### 1. Add Your Logo
Replace the placeholder logo with your actual company logo:
- Save your logo as `logo.png` in the main directory
- Recommended size: 200x200px or similar aspect ratio
- Supported formats: PNG, JPG, SVG

### 2. Configure ClickSend API
1. Sign up for a ClickSend account at [clicksend.com](https://clicksend.com)
2. Get your API credentials from the dashboard
3. Edit `config.js` and update:

```javascript
const CLICKSEND_CONFIG = {
    username: 'your_clicksend_username',
    apiKey: 'your_api_key_here',
    recipientPhone: '+1234567890', // Your business phone
    senderName: 'Freshnest'
};
```

### 3. Update Business Information
Edit the `BUSINESS_CONFIG` object in `config.js`:

```javascript
const BUSINESS_CONFIG = {
    name: 'Freshnest Cleaning NYC',
    phone: '(555) 123-4567',
    email: 'info@freshnestcleaning.nyc',
    address: 'New York City, NY',
    hours: {
        weekday: '8AM-7PM',
        saturday: '8AM-7PM', 
        sunday: '10AM-5PM'
    }
};
```

### 4. Add Gallery Images
Replace the placeholder slideshow images:
1. Add your before/after images to the directory
2. Update the image sources in `index.html`:

```html
<div class="slide active">
    <img src="before-after-1.jpg" alt="Cleaning result 1">
    <div class="slide-caption">
        <h4>Your Project Title</h4>
        <p>Description of the cleaning work</p>
    </div>
</div>
```

## 📱 Mobile-First Features

### Responsive Breakpoints
- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px  
- **Desktop**: 1024px+

### Mobile Optimizations
- Touch-friendly buttons and forms
- Optimized image sizes
- Mobile navigation menu
- Swipe-friendly gallery
- Fast loading times

## 🔧 Customization

### Colors
The main brand colors are defined in CSS:
- Primary: `#4a90e2` (blue)
- Secondary: `#357abd` (darker blue)
- Accent: Various gradients

### Fonts
Uses system fonts for fast loading:
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
```

### Services
Update services in the HTML services section. Each service card includes:
- Icon (FontAwesome)
- Title and description
- Feature list

## 📨 How the Contact Form Works

1. **User fills form**: Name, phone, email, service type, address, message
2. **Image upload**: Up to 5 images, 5MB each
3. **Form validation**: Required fields checked
4. **ClickSend API**: Sends SMS with form data
5. **MMS attachments**: Images sent as multimedia messages
6. **Success modal**: User sees confirmation

### Sample SMS Message Format:
```
New Quote Request - Freshnest Cleaning NYC

Name: John Doe
Phone: (555) 123-4567
Email: john@example.com
Service: Upholstery Cleaning
Address: 123 Main St, NYC
Message: Need sofa cleaning

Images: 2 uploaded
```

## 🛠️ Technical Requirements

### Browser Support
- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

### JavaScript Features Used
- ES6+ syntax
- Async/await
- Fetch API
- FileReader API
- Intersection Observer

### No Build Process Required
This is a vanilla HTML/CSS/JavaScript website that runs directly in browsers without compilation.

## 🔒 Security Considerations

### Client-Side Limitations
- ClickSend credentials are visible in client-side code
- Consider server-side proxy for production use

### Production Recommendations
1. **Server-side proxy**: Handle ClickSend API calls on your server
2. **Environment variables**: Store credentials securely
3. **Rate limiting**: Prevent form spam
4. **Input sanitization**: Validate all user inputs

### Server-Side Proxy Example (Node.js)
```javascript
app.post('/api/send-quote', async (req, res) => {
    const { formData, images } = req.body;
    
    // Validate inputs
    // Call ClickSend API securely
    // Return response
});
```

## 🚀 Deployment

### Static Hosting (Recommended for MVP)
- **Netlify**: Drag and drop deployment
- **Vercel**: Git integration
- **GitHub Pages**: Free hosting
- **AWS S3**: Static website hosting

### With Server-Side Features
- **Heroku**: Easy deployment
- **DigitalOcean**: VPS hosting
- **AWS EC2**: Full server control

## 📊 Performance Optimization

### Already Implemented
- CSS/JS minification ready
- Image lazy loading
- Intersection Observer animations
- Debounced resize handlers
- Optimized CSS selectors

### Further Optimizations
- Image compression (WebP format)
- CDN for static assets
- Service worker for offline functionality
- Critical CSS inlining

## 🎨 Design Features

### Visual Elements
- Gradient backgrounds
- Subtle animations
- Professional color scheme
- Clean typography
- Consistent spacing

### User Experience
- Intuitive navigation
- Clear call-to-actions
- Error handling with user feedback
- Loading states
- Success confirmations

## 📞 Support & Maintenance

### Regular Updates Needed
- Update gallery images periodically
- Monitor ClickSend API usage/costs
- Review and update contact information
- Test form functionality regularly

### Analytics Integration
Add Google Analytics or similar:
```html
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🆘 Troubleshooting

### Common Issues

**Form not submitting:**
- Check ClickSend credentials
- Verify phone number format (+1234567890)
- Check browser console for errors

**Images not uploading:**
- File size limit is 5MB per image
- Only image files accepted
- Maximum 5 images total

**Mobile layout issues:**
- Clear browser cache
- Check viewport meta tag
- Verify CSS media queries

**ClickSend API errors:**
- Verify account has sufficient credits
- Check API endpoint URL
- Validate authentication format

## 🔗 External Dependencies

- **FontAwesome 6.4.0**: Icons
- **ClickSend REST API**: SMS/MMS service

## 📝 License

This project is created for Freshnest Cleaning NYC. All rights reserved.

---

**Ready to launch your professional cleaning business website!** 🚀

For technical support or customizations, please refer to this documentation or contact your developer.
