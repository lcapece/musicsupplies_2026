// ClickSend API Configuration
// Replace these with your actual ClickSend credentials
const CLICKSEND_CONFIG = {
    username: 'YOUR_CLICKSEND_USERNAME',
    apiKey: 'YOUR_CLICKSEND_API_KEY',
    recipientPhone: '+1234567890', // Your business phone number
    senderName: 'Freshnest'
};

// Business Configuration
const BUSINESS_CONFIG = {
    name: 'Freshnest Cleaning NYC',
    phone: '(555) 123-4567',
    email: 'info@freshnestcleaning.nyc',
    address: 'New York City, NY',
    hours: {
        weekday: '8AM-7PM',
        saturday: '8AM-7PM', 
        sunday: '10AM-5PM'
    },
    serviceAreas: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']
};

// Export configurations
window.CLICKSEND_CONFIG = CLICKSEND_CONFIG;
window.BUSINESS_CONFIG = BUSINESS_CONFIG;
