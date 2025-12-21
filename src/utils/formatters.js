/**
 * Data Formatting Utilities
 * 
 * Helper functions for formatting numbers, dates, and units
 * for display in the UI
 */

/**
 * Format currency value
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) return '$0.00';
  return `$${parseFloat(value).toFixed(decimals)}`;
};

/**
 * Format power value with appropriate unit (MW, GW)
 * @param {number} valueMW - Power value in MW
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted power string
 */
export const formatPower = (valueMW, decimals = 2) => {
  if (valueMW === null || valueMW === undefined || isNaN(valueMW)) return '0 MW';
  
  const value = parseFloat(valueMW);
  
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(decimals)} GW`;
  }
  
  return `${value.toFixed(decimals)} MW`;
};

/**
 * Format voltage value
 * @param {number} voltageKV - Voltage in kV
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted voltage string
 */
export const formatVoltage = (voltageKV, decimals = 1) => {
  if (voltageKV === null || voltageKV === undefined || isNaN(voltageKV)) return '0 kV';
  return `${parseFloat(voltageKV).toFixed(decimals)} kV`;
};

/**
 * Format percentage value
 * @param {number} value - Percentage value (0-100)
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted percentage string
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${parseFloat(value).toFixed(decimals)}%`;
};

/**
 * Format distance value
 * @param {number} miles - Distance in miles
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted distance string
 */
export const formatDistance = (miles, decimals = 2) => {
  if (miles === null || miles === undefined || isNaN(miles)) return '0 mi';
  return `${parseFloat(miles).toFixed(decimals)} mi`;
};

/**
 * Format coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted coordinates string
 */
export const formatCoordinates = (lat, lng, decimals = 4) => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return 'N/A';
  }
  
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  
  return `${Math.abs(lat).toFixed(decimals)}°${latDir}, ${Math.abs(lng).toFixed(decimals)}°${lngDir}`;
};

/**
 * Format large numbers with K, M, B suffixes
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted number string
 */
export const formatLargeNumber = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '0';
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1e9) {
    return `${(value / 1e9).toFixed(decimals)}B`;
  }
  if (absValue >= 1e6) {
    return `${(value / 1e6).toFixed(decimals)}M`;
  }
  if (absValue >= 1e3) {
    return `${(value / 1e3).toFixed(decimals)}K`;
  }
  
  return value.toFixed(decimals);
};

/**
 * Format date to readable string
 * @param {Date|string|number} date - Date to format
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, includeTime = false) => {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return d.toLocaleDateString('en-US', options);
};

/**
 * Format time duration
 * @param {number} minutes - Duration in minutes
 * @returns {string} - Formatted duration string
 */
export const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '0 min';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  
  return `${mins}m`;
};

/**
 * Format status with color
 * @param {string} status - Status value
 * @returns {Object} - { text, color, badge }
 */
export const formatStatus = (status) => {
  const statusMap = {
    'Online': { text: 'Online', color: '#10b981', badge: '✓' },
    'Offline': { text: 'Offline', color: '#ef4444', badge: '✗' },
    'Closed': { text: 'Closed', color: '#10b981', badge: '✓' },
    'Open': { text: 'Open', color: '#ef4444', badge: '⚠' },
    'Normal': { text: 'Normal', color: '#10b981', badge: '✓' },
    'Congested': { text: 'Congested', color: '#f59e0b', badge: '⚠' },
    'Critical': { text: 'Critical', color: '#ef4444', badge: '⚠' },
    'Warning': { text: 'Warning', color: '#f59e0b', badge: '⚠' },
    'Stable': { text: 'Stable', color: '#10b981', badge: '✓' }
  };
  
  return statusMap[status] || { text: status, color: '#6b7280', badge: '•' };
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text || '';
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Format phone number
 * @param {string} phone - Phone number
 * @returns {string} - Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return 'N/A';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }
  
  return phone;
};

/**
 * Capitalize first letter of each word
 * @param {string} text - Text to capitalize
 * @returns {string} - Capitalized text
 */
export const capitalizeWords = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Convert snake_case to Title Case
 * @param {string} text - Snake case text
 * @returns {string} - Title case text
 */
export const snakeToTitle = (text) => {
  if (!text) return '';
  
  return text
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Format API response data
 * @param {Object} response - API response object
 * @returns {Object} - Formatted data
 */
export const formatAPIResponse = (response) => {
  // Handle Axios response structure: response.data.data
  if (response?.data?.data) {
    return response.data.data;
  }
  
  // Handle direct data object
  if (response?.data) {
    return response.data;
  }
  
  // Return as-is if already formatted
  return response || [];
};

/**
 * Safe number parser
 * @param {any} value - Value to parse
 * @param {number} defaultValue - Default value if parsing fails
 * @returns {number} - Parsed number
 */
export const parseNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue;
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Format capacity utilization
 * @param {number} actual - Actual value
 * @param {number} capacity - Capacity value
 * @returns {Object} - { percentage, status, color }
 */
export const formatUtilization = (actual, capacity) => {
  if (capacity === 0 || capacity === null || capacity === undefined) {
    return { percentage: 0, status: 'Unknown', color: '#6b7280' };
  }
  
  const percentage = (Math.abs(actual) / capacity) * 100;
  
  let status = 'Normal';
  let color = '#10b981';
  
  if (percentage > 95) {
    status = 'Critical';
    color = '#ef4444';
  } else if (percentage > 75) {
    status = 'High';
    color = '#f59e0b';
  } else if (percentage > 50) {
    status = 'Medium';
    color = '#3b82f6';
  }
  
  return {
    percentage: percentage.toFixed(1),
    status,
    color
  };
};

/**
 * Format array to comma-separated string
 * @param {Array} array - Array to format
 * @param {string} property - Property to extract (optional)
 * @returns {string} - Comma-separated string
 */
export const formatArrayToString = (array, property = null) => {
  if (!Array.isArray(array) || array.length === 0) return 'N/A';
  
  if (property) {
    return array.map(item => item[property]).filter(Boolean).join(', ');
  }
  
  return array.join(', ');
};

/**
 * Format reliability index
 * @param {number} value - Reliability value (0-1)
 * @returns {Object} - { percentage, rating, color }
 */
export const formatReliability = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return { percentage: '0%', rating: 'Unknown', color: '#6b7280' };
  }
  
  const percentage = (value * 100).toFixed(2) + '%';
  let rating = 'Excellent';
  let color = '#10b981';
  
  if (value < 0.9) {
    rating = 'Poor';
    color = '#ef4444';
  } else if (value < 0.95) {
    rating = 'Fair';
    color = '#f59e0b';
  } else if (value < 0.98) {
    rating = 'Good';
    color = '#3b82f6';
  }
  
  return { percentage, rating, color };
};
