// Input validation helpers
const validateProduct = (req, res, next) => {
  const { name, price, code } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Mahsulot nomi majburiy'
    });
  }
  
  if (!code || code.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Mahsulot kodi majburiy'
    });
  }
  
  if (price !== undefined && (isNaN(price) || price < 0)) {
    return res.status(400).json({
      success: false,
      message: 'Narx musbat son bo\'lishi kerak'
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
  
  if (!phone || phone.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Telefon raqami majburiy'
    });
  }
  
  // Phone format validation (Uzbekistan)
  const phoneRegex = /^(\+998)?[0-9]{9}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({
      success: false,
      message: 'Telefon raqami noto\'g\'ri formatda'
    });
  }
  
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
  
  if (total === undefined || isNaN(total) || total < 0) {
    return res.status(400).json({
      success: false,
      message: 'Jami summa noto\'g\'ri'
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
    
    if (item.quantity <= 0 || item.price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Miqdor va narx musbat bo\'lishi kerak'
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

// Sanitize input - XSS prevention
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/[<>]/g, '') // Remove < and >
        .trim();
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitize(obj[key]);
      }
    }
    return obj;
  };
  
  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  next();
};

module.exports = {
  validateProduct,
  validateCustomer,
  validateReceipt,
  validateCategory,
  sanitizeInput
};
