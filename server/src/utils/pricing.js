/**
 * PRICING UTILITIES
 * Narx tizimi uchun helper funksiyalar
 */

/**
 * Mahsulotdan tan narxini olish
 */
function getCostPrice(product) {
  // Yangi format
  if (Array.isArray(product.prices)) {
    const costPrice = product.prices.find(p => p.type === 'cost' && p.isActive);
    return costPrice ? costPrice.amount : 0;
  }
  
  // Eski format (backward compatibility)
  return product.costPrice || 0;
}

/**
 * Mahsulotdan asosiy narxni olish
 */
function getUnitPrice(product) {
  // Yangi format
  if (Array.isArray(product.prices)) {
    const unitPrice = product.prices.find(p => p.type === 'unit' && p.isActive);
    return unitPrice ? unitPrice.amount : 0;
  }
  
  // Eski format (backward compatibility)
  return product.unitPrice || product.price || 0;
}

/**
 * Mahsulotdan karobka narxini olish
 */
function getBoxPrice(product) {
  // Yangi format
  if (Array.isArray(product.prices)) {
    const boxPrice = product.prices.find(p => p.type === 'box' && p.isActive);
    return boxPrice ? boxPrice.amount : 0;
  }
  
  // Eski format (backward compatibility)
  return product.boxPrice || 0;
}

/**
 * Skidka narxlarini olish
 */
function getDiscountPrices(product) {
  // Yangi format
  if (Array.isArray(product.prices)) {
    return product.prices
      .filter(p => p.type.startsWith('discount') && p.isActive)
      .map(p => ({
        type: p.type,
        amount: p.amount,
        minQuantity: p.minQuantity || 1,
        discountPercent: p.discountPercent || 0
      }));
  }
  
  // Eski format (backward compatibility)
  const discounts = [];
  if (product.pricingTiers && Array.isArray(product.pricingTiers)) {
    product.pricingTiers.forEach((tier, index) => {
      if (tier.price && tier.minQuantity) {
        discounts.push({
          type: `discount${index + 1}`,
          amount: tier.price,
          minQuantity: tier.minQuantity,
          discountPercent: tier.discountPercent || 0
        });
      }
    });
  }
  
  return discounts;
}

/**
 * Eng yaxshi narxni hisoblash
 */
function calculateBestPrice(product, quantity, saleType = 'unit') {
  const unitPrice = getUnitPrice(product);
  const boxPrice = getBoxPrice(product);
  const discountPrices = getDiscountPrices(product);
  
  let bestPrice = unitPrice;
  let appliedDiscount = null;
  
  // Karobka narxi tekshirish
  if (saleType === 'box' && boxPrice > 0) {
    bestPrice = boxPrice;
  }
  
  // Skidka narxlarini tekshirish
  if (saleType === 'unit' && quantity > 1) {
    const applicableDiscounts = discountPrices.filter(d => quantity >= d.minQuantity);
    
    if (applicableDiscounts.length > 0) {
      // Eng katta skidkani topish
      const bestDiscount = applicableDiscounts.reduce((best, current) => {
        return current.amount < best.amount ? current : best;
      });
      
      if (bestDiscount.amount < bestPrice) {
        bestPrice = bestDiscount.amount;
        appliedDiscount = {
          type: bestDiscount.type,
          percent: bestDiscount.discountPercent,
          minQuantity: bestDiscount.minQuantity
        };
      }
    }
  }
  
  return {
    price: bestPrice,
    originalPrice: unitPrice,
    appliedDiscount,
    saleType
  };
}

/**
 * Narx validatsiyasi
 */
function validatePriceConsistency(prices) {
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

  const discountPrices = prices.filter(p => p.type.startsWith('discount') && p.isActive);
  discountPrices.forEach((discount, index) => {
    if (discount.amount >= unitPrice.amount) {
      errors.push(`${index + 1}-skidka narxi asosiy narxdan kichik bo'lishi kerak`);
    }
    if (discount.discountPercent < 0 || discount.discountPercent > 100) {
      errors.push(`${index + 1}-skidka foizi 0-100 orasida bo'lishi kerak`);
    }
  });

  return errors;
}

/**
 * Narx formatini yangi tizimga o'tkazish
 */
function convertToNewPriceFormat(oldProduct) {
  const prices = [];
  
  // Tan narxi
  if (oldProduct.costPrice && oldProduct.costPrice > 0) {
    prices.push({
      type: 'cost',
      amount: oldProduct.costPrice,
      isActive: true
    });
  }
  
  // Asosiy narx
  const unitPrice = oldProduct.unitPrice || oldProduct.price;
  if (unitPrice && unitPrice > 0) {
    prices.push({
      type: 'unit',
      amount: unitPrice,
      isActive: true
    });
  }
  
  // Karobka narxi
  if (oldProduct.boxPrice && oldProduct.boxPrice > 0) {
    prices.push({
      type: 'box',
      amount: oldProduct.boxPrice,
      isActive: true
    });
  }
  
  // Skidka narxlari
  if (oldProduct.pricingTiers && Array.isArray(oldProduct.pricingTiers)) {
    oldProduct.pricingTiers.forEach((tier, index) => {
      if (tier.price && tier.minQuantity) {
        prices.push({
          type: `discount${index + 1}`,
          amount: tier.price,
          minQuantity: tier.minQuantity,
          discountPercent: tier.discountPercent || 0,
          isActive: true
        });
      }
    });
  }
  
  return prices;
}

module.exports = {
  getCostPrice,
  getUnitPrice,
  getBoxPrice,
  getDiscountPrices,
  calculateBestPrice,
  validatePriceConsistency,
  convertToNewPriceFormat
};