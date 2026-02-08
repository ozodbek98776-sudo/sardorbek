const logger = require('../services/loggerService');

/**
 * Service Error Handler Middleware
 * Service layer dan kelgan xatoliklarni to'g'ri handle qilish
 */
const serviceErrorHandler = (error, req, res, next) => {
  // Agar response allaqachon yuborilgan bo'lsa, Express default error handler ga o'tkazish
  if (res.headersSent) {
    return next(error);
  }

  // Error logging
  logger.error('Service Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?._id,
    timestamp: new Date().toISOString()
  });

  // Error type bo'yicha response
  let statusCode = 500;
  let message = 'Server xatosi';
  let errorCode = 'INTERNAL_SERVER_ERROR';

  switch (error.name) {
    case 'ValidationError':
      statusCode = 400;
      message = error.message;
      errorCode = 'VALIDATION_ERROR';
      break;
    
    case 'NotFoundError':
      statusCode = 404;
      message = error.message;
      errorCode = 'NOT_FOUND';
      break;
    
    case 'BusinessError':
      statusCode = 422;
      message = error.message;
      errorCode = 'BUSINESS_LOGIC_ERROR';
      break;
    
    case 'PermissionError':
      statusCode = 403;
      message = error.message;
      errorCode = 'PERMISSION_DENIED';
      break;
    
    case 'MongoError':
    case 'MongoServerError':
      if (error.code === 11000) {
        statusCode = 409;
        message = 'Ma\'lumot allaqachon mavjud';
        errorCode = 'DUPLICATE_ENTRY';
        
        // Duplicate field ni aniqlash
        const field = Object.keys(error.keyPattern || {})[0];
        if (field) {
          message = `${field} allaqachon ishlatilgan`;
        }
      } else {
        statusCode = 500;
        message = 'Ma\'lumotlar bazasi xatosi';
        errorCode = 'DATABASE_ERROR';
      }
      break;
    
    case 'CastError':
      statusCode = 400;
      message = 'Noto\'g\'ri ID formati';
      errorCode = 'INVALID_ID';
      break;
    
    case 'JsonWebTokenError':
      statusCode = 401;
      message = 'Token yaroqsiz';
      errorCode = 'INVALID_TOKEN';
      break;
    
    case 'TokenExpiredError':
      statusCode = 401;
      message = 'Token muddati tugagan';
      errorCode = 'TOKEN_EXPIRED';
      break;
    
    default:
      // Agar statusCode error da mavjud bo'lsa, uni ishlatish
      if (error.statusCode) {
        statusCode = error.statusCode;
        message = error.message;
      }
      break;
  }

  // Response yaratish
  const errorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: message,
      ...(error.field && { field: error.field })
    }
  };

  // Development da stack trace qo'shish
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
    errorResponse.error.details = {
      originalError: error.name,
      url: req.url,
      method: req.method
    };
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Async route handler wrapper
 * Async function larni wrap qilib, error larni catch qilish
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Service method wrapper
 * Service method larni wrap qilib, consistent error handling
 */
const serviceWrapper = (serviceMethod) => {
  return asyncHandler(async (req, res, next) => {
    try {
      const result = await serviceMethod(req, res);
      
      // Agar result response format da bo'lsa
      if (result && typeof result === 'object' && result.success !== undefined) {
        return res.json(result);
      }
      
      // Agar oddiy data bo'lsa, success wrapper bilan
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  });
};

module.exports = {
  serviceErrorHandler,
  asyncHandler,
  serviceWrapper
};