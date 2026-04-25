// Utility functions
function showLoading(elementId) {
    document.getElementById(elementId).innerHTML = '<div class="loading">Loading...</div>';
}

function showError(elementId, message) {
    document.getElementById(elementId).innerHTML = `<div class="error-message">⚠️ ${message}</div>`;
}

function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB');
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

// Export for use in other pages
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showLoading, showError, formatDate, fetchData };
}
