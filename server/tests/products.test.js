const Product = require('../src/models/Product');
const { calculateBestPrice } = require('../src/utils/pricing');

describe('📦 PRODUCT MODEL TESTS', () => {
  describe('Product Schema Validation', () => {
    it('✅ Valid product yaratish', () => {
      const productData = {
        code: 'TEST001',
        name: 'Test Product',
        quantity: 100,
        unit: 'dona',
        prices: [
          { type: 'unit', amount: 10000, isActive: true }
        ]
      };

      const product = new Product(productData);
      const error = product.validateSync();
      
      expect(error).toBeUndefined();
      expect(product.code).toBe('TEST001');
      expect(product.name).toBe('Test Product');
    });

    it('❌ Kod bo\'lmasa', () => {
      const productData = {
        name: 'Test Product',
        quantity: 100
      };

      const product = new Product(productData);
      const error = product.validateSync();
      
      expect(error).toBeDefined();
      expect(error.errors.code).toBeDefined();
    });

    it('❌ Nom bo\'lmasa', () => {
      const productData = {
        code: 'TEST001',
        quantity: 100
      };

      const product = new Product(productData);
      const error = product.validateSync();
      
      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
    });

    it('✅ Chegirmali product', () => {
      const productData = {
        code: 'TEST002',
        name: 'Discount Product',
        quantity: 50,
        unit: 'dona',
        prices: [
          { type: 'unit', amount: 20000, isActive: true },
          { type: 'discount1', amount: 19000, minQuantity: 10, discountPercent: 5, isActive: true },
          { type: 'discount2', amount: 18000, minQuantity: 50, discountPercent: 10, isActive: true }
        ]
      };

      const product = new Product(productData);
      const error = product.validateSync();
      
      expect(error).toBeUndefined();
      expect(product.prices.length).toBe(3);
      expect(product.prices[1].type).toBe('discount1');
      expect(product.prices[1].discountPercent).toBe(5);
    });
  });

  describe('Product Price Calculation', () => {
    it('✅ Asosiy narx', () => {
      const product = {
        unitPrice: 10000,
        prices: [
          { type: 'unit', amount: 10000, isActive: true }
        ]
      };

      const result = calculateBestPrice(product, 5);
      expect(result.price).toBe(10000);
    });

    it('✅ Chegirma qo\'llanadi', () => {
      const product = {
        unitPrice: 10000,
        prices: [
          { type: 'unit', amount: 10000, isActive: true },
          { type: 'discount1', amount: 9500, minQuantity: 10, discountPercent: 5, isActive: true }
        ]
      };

      const result = calculateBestPrice(product, 10);
      expect(result.price).toBe(9500);
      expect(result.appliedDiscount.percent).toBe(5);
    });
  });

  describe('Product Unit Types', () => {
    const validUnits = ['dona', 'kg', 'metr', 'litr', 'karobka'];

    validUnits.forEach(unit => {
      it(`✅ ${unit} birligi`, () => {
        const product = new Product({
          code: 'TEST',
          name: 'Test',
          unit: unit,
          quantity: 10
        });

        const error = product.validateSync();
        expect(error).toBeUndefined();
        expect(product.unit).toBe(unit);
      });
    });

    it('❌ Noto\'g\'ri birlik', () => {
      const product = new Product({
        code: 'TEST',
        name: 'Test',
        unit: 'invalid',
        quantity: 10
      });

      const error = product.validateSync();
      expect(error).toBeDefined();
    });
  });
});
