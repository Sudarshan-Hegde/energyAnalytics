// Utility functions for data formatting and calculations

// Format numbers with commas
export const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Format date/time
export const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Calculate percentage change
export const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return 0;
  return ((current - previous) / previous * 100).toFixed(1);
};

// Generate random data for demo purposes
export const generateRandomData = (length, min, max) => {
  return Array.from({ length }, () => Math.random() * (max - min) + min);
};

// Get status color based on value
export const getStatusColor = (value, thresholds = { critical: 95, warning: 85 }) => {
  if (value >= thresholds.critical) return '#f44336'; // red
  if (value >= thresholds.warning) return '#ffc107'; // yellow
  return '#4caf50'; // green
};

// Debounce function for search and input handlers
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Convert MW to different units
export const convertPower = (mw, unit = 'MW') => {
  const conversions = {
    MW: 1,
    kW: 1000,
    GW: 0.001,
    W: 1000000,
  };
  return (mw * conversions[unit]).toFixed(2);
};

// Calculate grid efficiency
export const calculateEfficiency = (output, input) => {
  if (input === 0) return 0;
  return ((output / input) * 100).toFixed(2);
};

// Validate email
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Get time range label
export const getTimeRangeLabel = (range) => {
  const labels = {
    '1h': 'Last Hour',
    '24h': 'Last 24 Hours',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
  };
  return labels[range] || range;
};

// Export data to CSV
export const exportToCSV = (data, filename = 'export.csv') => {
  const csvContent = [
    Object.keys(data[0]).join(','),
    ...data.map(row => Object.values(row).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Local storage helpers
export const storage = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },
};
