import axios from 'axios';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Grid Data APIs
export const gridAPI = {
  // Get all grid nodes
  getNodes: () => api.get('/grid/nodes'),
  
  // Get node details
  getNodeById: (id) => api.get(`/grid/nodes/${id}`),
  
  // Get real-time metrics
  getMetrics: (timeRange = '24h') => api.get(`/grid/metrics?range=${timeRange}`),
  
  // Get power consumption data
  getPowerConsumption: (timeRange = '24h') => api.get(`/grid/power-consumption?range=${timeRange}`),
  
  // Get efficiency data
  getEfficiency: () => api.get('/grid/efficiency'),
  
  // Get load distribution
  getLoadDistribution: () => api.get('/grid/load-distribution'),
};

// Analytics APIs
export const analyticsAPI = {
  // Get AI forecast
  getForecast: (days = 7) => api.get(`/analytics/forecast?days=${days}`),
  
  // Get insights
  getInsights: () => api.get('/analytics/insights'),
  
  // Get historical data
  getHistoricalData: (startDate, endDate) => 
    api.get(`/analytics/historical?start=${startDate}&end=${endDate}`),
};

// Admin APIs
export const adminAPI = {
  // User management
  getUsers: () => api.get('/admin/users'),
  createUser: (userData) => api.post('/admin/users', userData),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  
  // Device management
  getDevices: () => api.get('/admin/devices'),
  getDeviceById: (id) => api.get(`/admin/devices/${id}`),
  updateDevice: (id, deviceData) => api.put(`/admin/devices/${id}`, deviceData),
  restartDevice: (id) => api.post(`/admin/devices/${id}/restart`),
  
  // System logs
  getLogs: (limit = 50, type = null) => 
    api.get(`/admin/logs?limit=${limit}${type ? `&type=${type}` : ''}`),
  
  // Settings
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settings) => api.put('/admin/settings', settings),
};

// WebSocket for real-time data (Kafka integration)
export const createWebSocketConnection = (onMessage, onError) => {
  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
  
  const ws = new WebSocket(WS_URL);
  
  ws.onopen = () => {
    console.log('WebSocket connected');
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    if (onError) onError(error);
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected');
    // Attempt to reconnect after 3 seconds
    setTimeout(() => {
      createWebSocketConnection(onMessage, onError);
    }, 3000);
  };
  
  return ws;
};

export default api;
