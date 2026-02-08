/**
 * XAVFSIZLIK KONFIGURATSIYASI
 * Barcha xavfsizlik sozlamalari bu yerda
 */

const securityConfig = {
  // JWT sozlamalari
  jwt: {
    // JWT secret minimum uzunligi
    minSecretLength: 32,
    // Token muddati - production da 8 soat, development da 24 soat
    expiresIn: process.env.NODE_ENV === 'production' ? '8h' : '24h',
    // Refresh token muddati
    refreshExpiresIn: '30d'
  },

  // CORS sozlamalari
  cors: {
    // Production da ruxsat etilgan domenlar
    allowedOrigins: [
      process.env.CLIENT_URL_PROD,
      process.env.CLIENT_URL
    ].filter(Boolean),
    
    // Development da ruxsat etilgan pattern'lar
    devPatterns: [
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
      /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/
    ]
  },

  // Rate limiting sozlamalari
  rateLimits: {
    // Login urinishlari
    login: {
      windowMs: 15 * 60 * 1000, // 15 daqiqa
      maxAttempts: process.env.NODE_ENV === 'production' ? 5 : 50
    },
    
    // API so'rovlari
    api: {
      windowMs: 15 * 60 * 1000, // 15 daqiqa
      maxRequests: 100
    },
    
    // Kassa operatsiyalari
    kassa: {
      windowMs: 60 * 1000, // 1 daqiqa
      maxOperations: 100
    },
    
    // Admin operatsiyalari
    admin: {
      windowMs: 60 * 1000, // 1 daqiqa
      maxOperations: 20
    }
  },

  // Input validation sozlamalari
  validation: {
    // Maksimal uzunliklar
    maxLengths: {
      productName: 200,
      productCode: 50,
      customerName: 100,
      categoryName: 50
    },
    
    // Maksimal qiymatlar
    maxValues: {
      price: 999999999,
      quantity: 10000,
      receiptItems: 100
    },
    
    // Xavfli NoSQL operatorlar
    dangerousOperators: [
      '$where', '$ne', '$gt', '$lt', '$regex', '$or', '$and'
    ]
  },

  // Helmet xavfsizlik sozlamalari
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "ws:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  },

  // Database xavfsizlik sozlamalari
  database: {
    // Connection pool sozlamalari
    maxPoolSize: 20,
    minPoolSize: 5,
    socketTimeoutMs: 45000,
    serverSelectionTimeoutMs: 5000,
    
    // Xavfsiz query sozlamalari
    maxQueryTime: 30000, // 30 soniya
    maxDocuments: 1000   // Bir query da maksimal hujjatlar
  }
};

// Xavfsizlik tekshiruvlari
const validateSecurityConfig = () => {
  const errors = [];

  // JWT secret tekshirish
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET environment variable o\'rnatilmagan!');
  } else if (process.env.JWT_SECRET.length < securityConfig.jwt.minSecretLength) {
    errors.push(`JWT_SECRET juda qisqa! Minimum ${securityConfig.jwt.minSecretLength} belgi kerak.`);
  }

  // Production da CORS tekshirish
  if (process.env.NODE_ENV === 'production') {
    if (securityConfig.cors.allowedOrigins.length === 0) {
      errors.push('Production da CLIENT_URL_PROD yoki CLIENT_URL o\'rnatilmagan!');
    }
  }

  // Database URI tekshirish
  if (!process.env.MONGODB_URI) {
    errors.push('MONGODB_URI environment variable o\'rnatilmagan!');
  }

  return errors;
};

// Xavfsizlik logini yozish
const logSecurityEvent = (event, details = {}) => {
  const logData = {
    timestamp: new Date().toISOString(),
    event,
    details,
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown'
  };

  console.warn(`🔒 XAVFSIZLIK HODISASI: ${event}`, logData);
  
  // Production da xavfsizlik loglarini alohida faylga yozish
  if (process.env.NODE_ENV === 'production') {
    // Bu yerda external logging service ga yuborish mumkin
  }
};

module.exports = {
  securityConfig,
  validateSecurityConfig,
  logSecurityEvent
};