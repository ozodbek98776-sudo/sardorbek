class ProductService {
  constructor() {
    this.serviceName = 'ProductService';
  }

  logOperation(message, data = {}) {
    console.log(`[${new Date().toISOString()}] INFO: ${this.serviceName}: ${message}`, data);
  }

  createNotFoundError(resource, id = null) {
    const error = new Error(`${resource} topilmadi${id ? `: ${id}` : ''}`);
    error.name = 'NotFoundError';
    error.statusCode = 404;
    return error;
  }

  async executeOperation(operation, operationName, data = {}) {
    try {
      this.logOperation(`${operationName} started`, data);
      const result = await operation();
      this.logOperation(`${operationName} completed`, { ...data, success: true });
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ERROR: ${this.serviceName}: ${operationName} failed`, {
        service: this.serviceName,
        operation: operationName,
        error: error.message,
        ...data
      });
      throw error;
    }
  }

  validatePriceConsistency(prices) {
    const errors = [];
    if (!Array.isArray(prices) || prices.length === 0) {
      errors.push('Kamida bitta narx bo\'lishi kerak');
      return errors;
    }

    const unitPrice = prices.find(p => p.type === 'unit' && p.isActive);
    if (!unitPrice) {
      errors.push('Asosiy narx (unit) majburiy');
      return errors;
    }

    const costPrice = prices.find(p => p.type === 'cost' && p.isActive);
    if (costPrice && costPrice.amount >= unitPrice.amount) {
      errors.push('Tan narxi sotish narxidan kichik bo\'lishi kerak');
    }

    return errors;
  }

  async searchProductsForKassa(searchQuery) {
    return this.executeOperation(async () => {
      const Product = require('../../models/Product');
      const query = {};
      if (searchQuery) {
        query.$or = [
          { name: { $regex: searchQuery, $options: 'i' } },
          { code: { $regex: searchQuery, $options: 'i' } }
        ];
      }

      const products = await Product.find(query)
        .select('name code prices unit quantity')
        .limit(50)
        .lean();

      return products;
    }, 'searchProductsForKassa', { searchQuery });
  }

  async calculateProductPrice(productId, quantity, saleType = 'unit') {
    return this.executeOperation(async () => {
      const Product = require('../../models/Product');
      const product = await Product.findById(productId);
      if (!product) {
        throw this.createNotFoundError('Mahsulot', productId);
      }

      const priceCalculation = product.calculateBestPrice(quantity, saleType);

      return {
        success: true,
        calculation: priceCalculation,
        product: {
          _id: product._id,
          code: product.code,
          name: product.name,
          unit: product.unit
        }
      };
    }, 'calculateProductPrice', { productId, quantity, saleType });
  }
}

module.exports = ProductService;