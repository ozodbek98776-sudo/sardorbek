// Input validation helpers
const mongoose = require('mongoose');

const validateProduct = (req, res, next) => {
  const { name, price, code } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Mahsulot nomi majburiy'
    });
  }
  
  if (name.length > 200) {
    return res.status(400).json({
      success: false,
      message: 'Mahsulot nomi 200 belgidan oshmasligi kerak'
    });
  }
  
  if (!code || code.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Mahsulot kodi majburiy'
    });
  }
  
  if (code.length > 50) {
    return res.status(400).json({
      success: false,
      message: 'Mahsulot kodi 50 belgidan oshmasligi kerak'
    });
  }
  
  if (price !== undefined && (isNaN(price) || price < 0)) {
    return res.status(400).json({
      success: false,
      message: 'Narx musbat son bo\'lishi kerak'
    });
  }
  
  if (price !== undefined && price > 999999999) {
    return res.status(400).json({
      success: false,
      message: 'Narx juda katta'
    });
  }
  
  next();
};

const validateCustomer = (req, res, next) => {
  const { name, phone } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Mijoz ismi majburiy'
    });
  }
  
  if (name.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Mijoz ismi 100 belgidan oshmasligi kerak'
    });
  }
  
  if (!phone || phone.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Telefon raqami majburiy'
    });
  }
  
  // Phone format validation (Uzbekistan) - YAXSHILANGAN
  const phoneRegex = /^\+998[0-9]{9}$/; // Faqat +998XXXXXXXXX format
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Turli formatlarni normalize qilish
  if (cleanPhone.startsWith('998') && cleanPhone.length === 12) {
    cleanPhone = '+' + cleanPhone;
  } else if (cleanPhone.startsWith('8') && cleanPhone.length === 10) {
    cleanPhone = '+998' + cleanPhone.substring(1);
  } else if (cleanPhone.length === 9 && /^[0-9]{9}$/.test(cleanPhone)) {
    cleanPhone = '+998' + cleanPhone;
  }
  
  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({
      success: false,
      message: 'Telefon raqami +998XXXXXXXXX formatida bo\'lishi kerak'
    });
  }
  
  // Normalized phone ni req.body ga qaytarish
  req.body.phone = cleanPhone;
  
  next();
};

const validateReceipt = (req, res, next) => {
  const { items, total } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Chek bo\'sh bo\'lishi mumkin emas'
    });
  }
  
  if (items.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Chekda 100 dan ortiq mahsulot bo\'lishi mumkin emas'
    });
  }
  
  if (total === undefined || isNaN(total) || total < 0) {
    return res.status(400).json({
      success: false,
      message: 'Jami summa noto\'g\'ri'
    });
  }
  
  if (total > 999999999) {
    return res.status(400).json({
      success: false,
      message: 'Jami summa juda katta'
    });
  }
  
  // Validate each item
  for (const item of items) {
    if (!item.product || !item.quantity || !item.price) {
      return res.status(400).json({
        success: false,
        message: 'Mahsulot ma\'lumotlari to\'liq emas'
      });
    }
    
    // MongoDB ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(item.product)) {
      return res.status(400).json({
        success: false,
        message: 'Mahsulot ID noto\'g\'ri formatda'
      });
    }
    
    if (item.quantity <= 0 || item.quantity > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Miqdor 1 dan 10000 gacha bo\'lishi kerak'
      });
    }
    
    if (item.price < 0 || item.price > 999999999) {
      return res.status(400).json({
        success: false,
        message: 'Narx noto\'g\'ri'
      });
    }
  }
  
  next();
};

const validateCategory = (req, res, next) => {
  const { name } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Kategoriya nomi majburiy'
    });
  }
  
  if (name.length > 50) {
    return res.status(400).json({
      success: false,
      message: 'Kategoriya nomi 50 belgidan oshmasligi kerak'
    });
  }
  
  next();
};

// MongoDB ObjectId validation middleware
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `${paramName} noto'g'ri formatda`
      });
    }
    next();
  };
};

// Sanitize input - XSS va NoSQL injection prevention (YAXSHILANGAN)
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/javascript:/gi, '') // XSS prevention
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
    }
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
      // NoSQL injection prevention - remove ALL dangerous operators
      const dangerousKeys = [
        '$where', '$ne', '$gt', '$lt', '$gte', '$lte', '$in', '$nin',
        '$regex', '$or', '$and', '$not', '$nor', '$exists', '$type',
        '$mod', '$all', '$size', '$elemMatch', '$slice', '$expr',
        '$jsonSchema', '$geoIntersects', '$geoWithin', '$near', '$nearSphere'
      ];
      
      for (const key of dangerousKeys) {
        if (obj.hasOwnProperty(key)) {
          console.warn(`🚨 NoSQL injection attempt detected: ${key}`);
          delete obj[key];
        }
      }
      
      // Recursive sanitization
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          obj[key] = sanitize(obj[key]);
        }
      }
    }
    if (Array.isArray(obj)) {
      return obj.map(item => sanitize(item));
    }
    return obj;
  };
  
  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }
  
  if (req.params) {
    req.params = sanitize(req.params);
  }
  
  next();
};

module.exports = {
  validateProduct,
  validateCustomer,
  validateReceipt,
  validateCategory,
  validateObjectId,
  sanitizeInput
};
