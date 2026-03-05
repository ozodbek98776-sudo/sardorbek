/**
 * MARKAZLASHTIRILGAN NARX UTILITY FUNKSIYALARI
 * Barcha komponentlar uchun umumiy narx hisoblash funksiyalari
 */

import { Product, PriceCalculation } from '../types';

// NARX OLISH FUNKSIYALARI

export const getCostPrice = (product: any): number => {
  // YANGI FORMAT
  if (Array.isArray(product.prices)) {
    const costPrice = product.prices.find((p: any) => p.type === 'cost' && p.isActive);
    return costPrice ? costPrice.amount : 0;
  }
  // ESKI FORMAT - backward compatibility
  return product.costPrice || 0;
};

export const getUnitPrice = (product: any): number => {
  // YANGI FORMAT
  if (Array.isArray(product.prices)) {
    const unitPrice = product.prices.find((p: any) => p.type === 'unit' && p.isActive);
    return unitPrice ? unitPrice.amount : 0;
  }
  // ESKI FORMAT - backward compatibility
  return product.price || product.unitPrice || 0;
};

export const getBoxPrice = (product: any): number => {
  // YANGI FORMAT
  if (Array.isArray(product.prices)) {
    const boxPrice = product.prices.find((p: any) => p.type === 'box' && p.isActive);
    return boxPrice ? boxPrice.amount : 0;
  }
  // ESKI FORMAT - backward compatibility
  return product.boxPrice || 0;
};

export const getDiscountPrices = (product: any): Array<{
  type: string;
  amount: number;
  minQuantity: number;
  discountPercent: number;
}> => {
  // YANGI FORMAT
  if (Array.isArray(product.prices)) {
    return product.prices
      .filter((p: any) => p.type.startsWith('discount') && p.isActive)
      .sort((a: any, b: any) => a.minQuantity - b.minQuantity);
  }
  
  // ESKI FORMAT - backward compatibility
  const discounts = [];
  if (product.pricingTiers) {
    const basePrice = getUnitPrice(product);
    
    ['tier1', 'tier2', 'tier3'].forEach((tierName, index) => {
      const tier = product.pricingTiers[tierName];
      if (tier && tier.minQuantity && tier.discountPercent && basePrice > 0) {
        const discountedPrice = basePrice * (1 - tier.discountPercent / 100);
        discounts.push({
          type: `discount${index + 1}`,
          amount: Math.round(discountedPrice),
          minQuantity: tier.minQuantity,
          discountPercent: tier.discountPercent
        });
      }
    });
  }
  
  return discounts;
};

// NARX HISOBLASH FUNKSIYALARI

export const calculateBestPrice = (
  product: any, 
  quantity: number, 
  saleType: 'unit' | 'box' = 'unit'
): PriceCalculation => {
  let basePrice = 0;
  let appliedDiscount = null;

  // Sotish turiga qarab asosiy narxni aniqlash
  switch(saleType) {
    case 'unit':
      basePrice = getUnitPrice(product);
      break;
    case 'box':
      basePrice = getBoxPrice(product);
      // Agar karobka narxi yo'q bo'lsa, dona narxini karobka miqdoriga ko'paytirish
      if (!basePrice && product.boxInfo?.unitsPerBox > 0) {
        basePrice = getUnitPrice(product) * product.boxInfo.unitsPerBox;
      }
      break;
    default:
      basePrice = getUnitPrice(product);
  }

  // Skidka narxlarini tekshirish
  const discountPrices = getDiscountPrices(product);
  for (const discount of discountPrices) {
    if (quantity >= discount.minQuantity) {
      const discountedPrice = basePrice * (1 - discount.discountPercent / 100);
      if (discountedPrice < basePrice) {
        basePrice = discountedPrice;
        appliedDiscount = {
          type: discount.type,
          percent: discount.discountPercent,
          minQuantity: discount.minQuantity
        };
      }
    }
  }

  return {
    price: Math.round(basePrice),
    originalPrice: saleType === 'unit' ? getUnitPrice(product) : getBoxPrice(product),
    appliedDiscount,
    saleType,
    unit: product.unit || 'dona'
  };
};

// NARX VALIDATSIYA FUNKSIYALARI

export const validatePrices = (prices: {
  costPrice?: number;
  unitPrice: number;
  boxPrice?: number;
  discountPrices?: Array<{amount: number, minQuantity: number, discountPercent: number}>;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Asosiy narx tekshiruvi
  if (!prices.unitPrice || prices.unitPrice <= 0) {
    errors.push('Asosiy narx 0 dan katta bo\'lishi kerak');
  }

  // Tan narxi tekshiruvi
  if (prices.costPrice && prices.costPrice >= prices.unitPrice) {
    errors.push('Tan narxi sotish narxidan kichik bo\'lishi kerak');
  }

  // Skidka narxlari tekshiruvi
  if (prices.discountPrices) {
    prices.discountPrices.forEach((discount, index) => {
      if (discount.amount >= prices.unitPrice) {
        errors.push(`${index + 1}-skidka narxi asosiy narxdan kichik bo'lishi kerak`);
      }
      if (discount.discountPercent < 0 || discount.discountPercent > 100) {
        errors.push(`${index + 1}-skidka foizi 0-100 orasida bo'lishi kerak`);
      }
      if (discount.minQuantity <= 0) {
        errors.push(`${index + 1}-skidka uchun minimal miqdor 0 dan katta bo'lishi kerak`);
      }
    });

    // Minimal miqdorlar tartib bo'yicha ekanligini tekshirish
    for (let i = 1; i < prices.discountPrices.length; i++) {
      if (prices.discountPrices[i].minQuantity <= prices.discountPrices[i-1].minQuantity) {
        errors.push('Skidka minimal miqdorlari o\'sish tartibida bo\'lishi kerak');
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// FORMAT FUNKSIYALARI

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('uz-UZ').format(price);
};

export const getUnitLabel = (unit: string): string => {
  const labels: { [key: string]: string } = {
    'dona': 'dona',
    'kg': 'kg',
    'metr': 'm',
    'litr': 'L',
    'karobka': 'quti'
  };
  return labels[unit] || unit;
};

/**
 * Kassa uchun oddiy narx hisoblash — discount bilan
 * Barcha kassa komponentlari shu funksiyani ishlatadi (DRY)
 */
export const calculateDiscountedPrice = (product: { price?: number; prices?: Array<{ type: string; amount?: number; minQuantity?: number; discountPercent?: number; isActive?: boolean }> }, quantity: number): number => {
  const prices = product.prices;
  let basePrice = product.price || 0;

  if (Array.isArray(prices) && prices.length > 0) {
    const unitPrice = prices.find(p => p.type === 'unit');
    if (unitPrice?.amount) {
      basePrice = unitPrice.amount;
    }
  }

  if (!Array.isArray(prices) || prices.length === 0) {
    return basePrice;
  }

  const discounts = prices.filter(p => p.type && p.type.startsWith('discount') && p.minQuantity && p.minQuantity <= quantity);

  if (discounts.length === 0) {
    return basePrice;
  }

  const bestDiscount = discounts.reduce((best, current) =>
    (current.minQuantity || 0) > (best.minQuantity || 0) ? current : best
  );

  return basePrice * (1 - (bestDiscount.discountPercent || 0) / 100);
};

/**
 * Kassa ProductDetailModal uchun — narx + discount info qaytaradi
 */
export const calculateDiscountedPriceWithInfo = (product: { price?: number; prices?: Array<{ type: string; amount?: number; minQuantity?: number; discountPercent?: number; isActive?: boolean }> }, quantity: number): { price: number; discount?: { percent: number; minQuantity: number } } => {
  const price = calculateDiscountedPrice(product, quantity);
  const prices = product.prices;

  if (!Array.isArray(prices) || prices.length === 0) {
    return { price };
  }

  const discounts = prices.filter(p => p.type && p.type.startsWith('discount') && p.minQuantity && p.minQuantity <= quantity);
  if (discounts.length === 0) {
    return { price };
  }

  const bestDiscount = discounts.reduce((best, current) =>
    (current.minQuantity || 0) > (best.minQuantity || 0) ? current : best
  );

  return {
    price,
    discount: {
      percent: bestDiscount.discountPercent || 0,
      minQuantity: bestDiscount.minQuantity || 0
    }
  };
};

// KASSA UCHUN HELPER FUNKSIYALAR

export const formatProductForKassa = (product: any) => {
  return {
    ...product,
    // Tez hisoblash uchun
    unitPrice: getUnitPrice(product),
    boxPrice: getBoxPrice(product),
    costPrice: getCostPrice(product),
    discountPrices: getDiscountPrices(product),
    // Foyda hisoblash
    profit: getUnitPrice(product) - getCostPrice(product),
    profitPercent: getCostPrice(product) > 0 
      ? Math.round(((getUnitPrice(product) - getCostPrice(product)) / getCostPrice(product)) * 100)
      : 0
  };
};

export const calculateCartItemTotal = (product: any, quantity: number, saleType: 'unit' | 'box' = 'unit') => {
  const calculation = calculateBestPrice(product, quantity, saleType);
  
  return {
    productId: product._id,
    productName: product.name,
    productCode: product.code,
    quantity,
    unit: product.unit || 'dona',
    saleType,
    unitPrice: calculation.price,
    totalPrice: calculation.price * quantity,
    originalPrice: calculation.originalPrice,
    appliedDiscount: calculation.appliedDiscount,
    savings: calculation.appliedDiscount 
      ? (calculation.originalPrice - calculation.price) * quantity 
      : 0
  };
};