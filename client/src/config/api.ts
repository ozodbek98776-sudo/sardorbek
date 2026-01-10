// API konfiguratsiyasi
const isDevelopment = import.meta.env.DEV;

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3003/api'
  : 'https://api-sardor-furnitura.your-domain.com/api';

export const WS_URL = isDevelopment
  ? 'ws://localhost:3003'
  : 'wss://api-sardor-furnitura.your-domain.com';

// Cloudflare tunnel URL lari
export const FRONTEND_URL = isDevelopment
  ? 'http://localhost:5173'
  : 'https://sardor-furnitura.your-domain.com';

console.log('API Base URL:', API_BASE_URL);
console.log('Environment:', isDevelopment ? 'Development' : 'Production');