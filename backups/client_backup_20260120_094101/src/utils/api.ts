import axios from 'axios';
import { OfflineHandler } from './offlineHandler';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000 // 30 second timeout - products query uchun
});

api.interceptors.request.use((config: any) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // Products endpoint uchun timeout ni oshirish
  if (config.url?.includes('/products')) {
    config.timeout = 60000; // 60 seconds for products
  }
  
  return config;
});

api.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    // Handle server offline errors (503 from Service Worker)
    if (OfflineHandler.isServerOfflineError(error)) {
      console.warn('Server is offline:', error.response.data.message);
      // Don't redirect, let components handle offline state
      return Promise.reject(error);
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Log timeout errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error.config?.url);
    }
    
    return Promise.reject(error);
  }
);

export default api;
