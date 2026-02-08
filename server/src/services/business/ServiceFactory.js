const ReceiptService = require('./ReceiptService');
const ProductService = require('./ProductService');
const CustomerService = require('./CustomerService');
const DebtService = require('./DebtService');
const UserService = require('./UserService');

/**
 * Service Factory
 * Barcha service larni yaratish va boshqarish uchun
 */
class ServiceFactory {
  constructor() {
    this.services = new Map();
  }

  /**
   * Service ni olish (Singleton pattern)
   */
  getService(serviceName) {
    if (!this.services.has(serviceName)) {
      switch (serviceName) {
        case 'receipt':
          this.services.set(serviceName, new ReceiptService());
          break;
        case 'product':
          this.services.set(serviceName, new ProductService());
          break;
        case 'customer':
          this.services.set(serviceName, new CustomerService());
          break;
        case 'debt':
          this.services.set(serviceName, new DebtService());
          break;
        case 'user':
          this.services.set(serviceName, new UserService());
          break;
        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }
    }

    return this.services.get(serviceName);
  }

  /**
   * Receipt Service
   */
  get receipt() {
    return this.getService('receipt');
  }

  /**
   * Product Service
   */
  get product() {
    return this.getService('product');
  }

  /**
   * Customer Service
   */
  get customer() {
    return this.getService('customer');
  }

  /**
   * Debt Service
   */
  get debt() {
    return this.getService('debt');
  }

  /**
   * User Service
   */
  get user() {
    return this.getService('user');
  }

  /**
   * Barcha service larni ro'yxatini olish
   */
  getAvailableServices() {
    return ['receipt', 'product', 'customer', 'debt', 'user'];
  }

  /**
   * Service ni qayta yaratish (testing uchun)
   */
  resetService(serviceName) {
    this.services.delete(serviceName);
  }

  /**
   * Barcha service larni tozalash (testing uchun)
   */
  resetAllServices() {
    this.services.clear();
  }
}

// Singleton instance
const serviceFactory = new ServiceFactory();

module.exports = serviceFactory;