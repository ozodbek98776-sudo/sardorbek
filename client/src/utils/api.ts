import axios from 'axios';
import { OfflineHandler } from './offlineHandler';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000 // 10 second timeout
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
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
    
    return Promise.reject(error);
  }
);

export default api;
