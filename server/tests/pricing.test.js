const { calculateBestPrice, getUnitPrice, getDiscountPrices } = require('../src/utils/pricing');

describe('💰 PRICING UTILS TESTS', () => {
  describe('calculateBestPrice', () => {
    const product = {
      unitPrice: 10000,
      prices: [
        { type: 'unit', amount: 10000, isActive: true },
        { type: 'discount1', amount: 9500, minQuantity: 10, discountPercent: 5, isActive: true },
        { type: 'discount2', amount: 9000, minQuantity: 50, discountPercent: 10, isActive: true },
        { type: 'discount3', amount: 8500, minQuantity: 100, discountPercent: 15, isActive: true }
      ]
    };

    it('✅ Kam miqdor - chegirmasiz', () => {
      const result = calculateBestPrice(product, 5);
      
      expect(result.price).toBe(10000);
      expect(result.appliedDiscount).toBeNull();
    });

    it('✅ 10 dona - 5% chegirma', () => {
      const result = calculateBestPrice(product, 10);
      
      expect(result.price).toBe(9500);
      expect(result.appliedDiscount).toBeTruthy();
      expect(result.appliedDiscount.percent).toBe(5);
    });

    it('✅ 50 dona - 10% chegirma', () => {
      const result = calculateBestPrice(product, 50);
      
      expect(result.price).toBe(9000);
      expect(result.appliedDiscount.percent).toBe(10);
    });

    it('✅ 100 dona - 15% chegirma', () => {
      const result = calculateBestPrice(product, 100);
      
      expect(result.price).toBe(8500);
      expect(result.appliedDiscount.percent).toBe(15);
    });

    it('✅ Chegirmalar yo\'q', () => {
      const productNoDiscount = {
        unitPrice: 15000,
        prices: [
          { type: 'unit', amount: 15000, isActive: true }
        ]
      };
      
      const result = calculateBestPrice(productNoDiscount, 100);
      
      expect(result.price).toBe(15000);
      expect(result.appliedDiscount).toBeNull();
    });
  });

  describe('getUnitPrice', () => {
    it('✅ Yangi format', () => {
      const product = {
        prices: [
          { type: 'unit', amount: 10000, isActive: true }
        ]
      };
      
      const price = getUnitPrice(product);
      expect(price).toBe(10000);
    });

    it('✅ Eski format - unitPrice', () => {
      const product = { unitPrice: 15000 };
      
      const price = getUnitPrice(product);
      expect(price).toBe(15000);
    });

    it('✅ Eski format - price', () => {
      const product = { price: 20000 };
      
      const price = getUnitPrice(product);
      expect(price).toBe(20000);
    });
  });

  describe('getDiscountPrices', () => {
    it('✅ Yangi format', () => {
      const product = {
        prices: [
          { type: 'discount1', amount: 9000, minQuantity: 10, discountPercent: 10, isActive: true },
          { type: 'discount2', amount: 8000, minQuantity: 50, discountPercent: 20, isActive: true }
        ]
      };
      
      const discounts = getDiscountPrices(product);
      
      expect(discounts.length).toBe(2);
      expect(discounts[0].minQuantity).toBe(10);
      expect(discounts[1].discountPercent).toBe(20);
    });

    it('✅ Chegirmalar yo\'q', () => {
      const product = {
        prices: [
          { type: 'unit', amount: 10000, isActive: true }
        ]
      };
      
      const discounts = getDiscountPrices(product);
      expect(discounts.length).toBe(0);
    });
  });
});
