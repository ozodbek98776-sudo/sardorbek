import axios from 'axios';
import { OfflineHandler } from './offlineHandler';
import { API_BASE_URL } from '../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 
    'Content-Type': 'application/json'
    // Accept-Encoding browser tomonidan avtomatik qo'shiladi
  },
  timeout: 60000 // 60 second timeout - products query uchun
});

api.interceptors.request.use((config: any) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // Products endpoint uchun timeout ni oshirish
  if (config.url?.includes('/products')) {
    config.timeout = 120000; // 120 seconds for products (2 minutes)
  }
  
  // ❌ ETag cache ni o'chirish - har doim yangi ma'lumot olish
  // Cache-Control header qo'shish
  config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  config.headers['Pragma'] = 'no-cache';
  config.headers['Expires'] = '0';
  
  return config;
});

api.interceptors.response.use(
  (response: any) => {
    // ✅ Response ni to'g'ridan-to'g'ri qaytarish (ETag cache yo'q)
    return response;
  },
  (error: any) => {
    // ❌ 304 Not Modified ni xato sifatida qaytarish
    if (error.response?.status === 304) {
      console.warn('304 Not Modified - cache muammosi, qayta urinish kerak');
      return Promise.reject(new Error('Cache error - please refresh'));
    }
    
    // Handle network errors (server ishlamayotgan)
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('🔴 Server bilan aloqa yo\'q - localhost:8000 ishlamayapti');
      // Don't redirect, let components handle it
      return Promise.reject(new Error('Server bilan aloqa yo\'q. Iltimos, serverni ishga tushiring.'));
    }
    
    // Handle connection refused
    if (error.code === 'ECONNREFUSED') {
      console.error('🔴 Connection refused - server port 8000 da ishlamayapti');
      return Promise.reject(new Error('Server ishlamayapti. Iltimos, serverni ishga tushiring.'));
    }
    
    // Handle server offline errors (503 from Service Worker)
    if (OfflineHandler.isServerOfflineError(error)) {
      console.warn('Server is offline:', error.response.data.message);
      // Don't redirect, let components handle offline state
      return Promise.reject(error);
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.warn('401 Unauthorized - token yaroqsiz');
      localStorage.removeItem('token');
      // Faqat agar login sahifasida bo'lmasa, redirect qilish
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    // Log timeout errors
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout:', error.config?.url);
    }
    
    return Promise.reject(error);
  }
);

export default api;
