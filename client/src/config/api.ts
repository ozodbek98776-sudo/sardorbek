// API konfiguratsiyasi
const isDevelopment = (import.meta as any).env.DEV;

// Environment variables dan olish
const envApiUrl = (import.meta as any).env?.VITE_API_URL;
const envFrontendUrl = (import.meta as any).env?.VITE_FRONTEND_URL;

export const API_BASE_URL = envApiUrl || (isDevelopment 
  ? 'http://localhost:8000/api'
  : '/api'); // Production da relative path ishlatish

export const WS_URL = isDevelopment
  ? 'ws://localhost:8000'
  : `wss://${window.location.host}`;

// Frontend URL - QR code uchun (MUHIM!)
export const FRONTEND_URL = envFrontendUrl || (isDevelopment
  ? 'http://localhost:5173'
  : `https://${window.location.host}`);

console.log('API Base URL:', API_BASE_URL);
console.log('Frontend URL:', FRONTEND_URL);
console.log('Environment:', isDevelopment ? 'Development' : 'Production');
