// config.js - Central API configuration
// Change this to your Render backend URL
const API_BASE_URL = 'https://your-render-app.onrender.com';

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_BASE_URL };
}
