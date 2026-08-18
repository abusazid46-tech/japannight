// Central Teer Configuration
const TEER_CONFIG = {
    firstRoundTime: '10:30 PM',
    secondRoundTime: '11:30 PM',
    cutoffHour: 22,    // 10 PM
    cutoffMinute: 20,  // 20 min -> 10:20 PM cutoff (1340 mins from midnight)
    cutoffMinutes: 1340 // (22 * 60) + 20
};

// Utility functions
function showLoading(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = '<div class="loading">Loading...</div>';
}

function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = `<div class="error-message">⚠️ ${message}</div>`;
}

function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB');
}

/**
 * Calculates current active Teer date based on 10:20 PM cutoff time.
 * - Before 10:20 PM (22:20): Returns previous day's date (DD/MM/YYYY)
 * - At or after 10:20 PM (22:20): Returns current day's date (DD/MM/YYYY) for upcoming 10:30 PM & 11:30 PM rounds
 */
function getCurrentTeerDate(dateObj = new Date()) {
    const now = dateObj;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const currentTimeMinutes = (currentHour * 60) + currentMinute;
    const cutoffMinutes = TEER_CONFIG.cutoffMinutes; // 1340 = 10:20 PM
    
    if (currentTimeMinutes < cutoffMinutes) {
        const previousDay = new Date(now);
        previousDay.setDate(now.getDate() - 1);
        const dd = String(previousDay.getDate()).padStart(2, '0');
        const mm = String(previousDay.getMonth() + 1).padStart(2, '0');
        const yyyy = previousDay.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    } else {
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }
}

// Common function to fetch data with error handling
async function fetchData(url, errorMessage) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network error');
        return await response.json();
    } catch (error) {
        console.error(error);
        throw new Error(errorMessage);
    }
}

// Export for use in other pages or Node environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TEER_CONFIG, showLoading, showError, formatDate, getCurrentTeerDate, fetchData };
}
