/**
 * Format a date string to YYYY-MM-DD HH:MM:SS format
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date string
 */
const formatDateTime = (date) => {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const pad = (num) => num.toString().padStart(2, '0');
    
    return [
        d.getFullYear(),
        pad(d.getMonth() + 1),
        pad(d.getDate())
    ].join('-') + ' ' + [
        pad(d.getHours()),
        pad(d.getMinutes()),
        pad(d.getSeconds())
    ].join(':');
};

/**
 * Format a date string to YYYY-MM-DD format
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const pad = (num) => num.toString().padStart(2, '0');
    
    return [
        d.getFullYear(),
        pad(d.getMonth() + 1),
        pad(d.getDate())
    ].join('-');
};

module.exports = {
    formatDateTime,
    formatDate
};
