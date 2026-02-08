const logger = require('../loggerService');

/**
 * Base Service Class
 * Barcha service lar uchun umumiy funksionallik
 */
class BaseService {
  constructor(name) {
    this.serviceName = name;
    this.logger = logger;
  }

  /**
   * Service operatsiyasini log qilish
   */
  logOperation(operation, data = {}) {
    this.logger.info(`${this.serviceName}: ${operation}`, {
      service: this.serviceName,
      operation,
      ...data
    });
  }

  /**
   * Xatolikni log qilish
   */
  logError(operation, error, data = {}) {
    this.logger.error(`${this.serviceName}: ${operation} failed`, {
      service: this.serviceName,
      operation,
      error: error.message,
      stack: error.stack,
      ...data
    });
  }

  /**
   * Validation xatoligi
   */
  createValidationError(message, field = null) {
    const error = new Error(message);
    error.name = 'ValidationError';
    error.field = field;
    error.statusCode = 400;
    return error;
  }

  /**
   * Not found xatoligi
   */
  createNotFoundError(resource, id = null) {
    const error = new Error(`${resource} topilmadi${id ? `: ${id}` : ''}`);
    error.name = 'NotFoundError';
    error.statusCode = 404;
    return error;
  }

  /**
   * Business logic xatoligi
   */
  createBusinessError(message) {
    const error = new Error(message);
    error.name = 'BusinessError';
    error.statusCode = 422;
    return error;
  }

  /**
   * Ruxsat xatoligi
   */
  createPermissionError(message = 'Ruxsat etilmagan') {
    const error = new Error(message);
    error.name = 'PermissionError';
    error.statusCode = 403;
    return error;
  }

  /**
   * Async operatsiyani try-catch bilan o'rash
   */
  async executeOperation(operation, operationName, data = {}) {
    try {
      this.logOperation(`${operationName} started`, data);
      const result = await operation();
      this.logOperation(`${operationName} completed`, { ...data, success: true });
      return result;
    } catch (error) {
      this.logError(operationName, error, data);
      throw error;
    }
  }

  /**
   * Pagination parametrlarini validate qilish
   */
  validatePagination(page = 1, limit = 20) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      throw this.createValidationError('Page raqami 1 dan katta bo\'lishi kerak', 'page');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw this.createValidationError('Limit 1 dan 100 gacha bo\'lishi kerak', 'limit');
    }

    return {
      page: pageNum,
      limit: limitNum,
      skip: (pageNum - 1) * limitNum
    };
  }

  /**
   * Pagination response yaratish
   */
  createPaginationResponse(data, total, page, limit) {
    return {
      data,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }
}

module.exports = BaseService;