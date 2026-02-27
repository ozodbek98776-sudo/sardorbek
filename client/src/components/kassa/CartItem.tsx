import { X } from 'lucide-react';
import { CartItem as CartItemType, Product } from '../../types';
import { formatNumber } from '../../utils/format';

interface CartItemProps {
  item: CartItemType;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

// Discount hisoblash funksiyasi
const calculateDiscountedPrice = (product: Product, quantity: number): number => {
  // Yangi format: prices array'dan unit price'ni olish
  const prices = (product as any).prices;
  let basePrice = product.price || 0;
  
  if (Array.isArray(prices) && prices.length > 0) {
    const unitPrice = prices.find((p: any) => p.type === 'unit');
    if (unitPrice?.amount) {
      basePrice = unitPrice.amount;
    }
  }
  
  // Agar prices array bo'lmasa, base price qaytarish
  if (!Array.isArray(prices) || prices.length === 0) {
    return basePrice;
  }
  
  const discounts = prices.filter((p: any) => p.type && p.type.startsWith('discount') && p.minQuantity && p.minQuantity <= quantity);
  
  if (discounts.length === 0) {
    return basePrice;
  }
  
  // Eng katta discount-ni olish (eng ko'p miqdor uchun)
  const bestDiscount = discounts.reduce((best: any, current: any) => 
    current.minQuantity > best.minQuantity ? current : best
  );
  
  const discountedPrice = basePrice * (1 - (bestDiscount.discountPercent || 0) / 100);
  
  return discountedPrice;
};

export function CartItem({
  item,
  onQuantityChange,
  onRemove
}: CartItemProps) {
  const metersPerOram = (item as any).metrInfo?.metersPerOram;
  const isOramMode = item.unit === 'metr' && metersPerOram > 0;
  // Display value: o'ram mode da o'ramda, aks holda metrda
  const displayQuantity = isOramMode
    ? Math.round((item.cartQuantity / metersPerOram) * 10) / 10
    : item.cartQuantity;
  const maxDisplay = isOramMode
    ? Math.floor(item.quantity / metersPerOram)
    : item.quantity;

  const discountedPrice = calculateDiscountedPrice(item as Product, item.cartQuantity);
  const price = discountedPrice;
  const total = price * item.cartQuantity;

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity <= 0) {
      onRemove();
    } else {
      onQuantityChange(newQuantity);
    }
  };

  // o'ram mode: o'ram sonidan metrga aylantirish
  const handleOramChange = (oramCount: number) => {
    if (oramCount <= 0) {
      onRemove();
    } else {
      const meters = oramCount * metersPerOram;
      handleQuantityChange(Math.min(meters, item.quantity));
    }
  };

  return (
    <div
      data-testid="cart-item"
      className="bg-slate-50 border border-slate-200 rounded-lg p-2 hover:border-brand-300 transition-all"
    >
      {/* Single Row Layout */}
      <div className="flex items-center gap-2">
        {/* Name - Flexible */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900 text-sm truncate">{item.name}</h4>
          {isOramMode && (
            <p className="text-[10px] text-slate-500">{item.cartQuantity} metr</p>
          )}
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => isOramMode
              ? handleOramChange(Math.max(0, displayQuantity - 1))
              : handleQuantityChange(Math.max(0, item.cartQuantity - 1))
            }
            className="w-6 h-6 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded font-bold text-slate-700 transition-colors text-sm"
          >
            −
          </button>

          <input
            type="number"
            value={displayQuantity}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                isOramMode ? handleOramChange(0) : handleQuantityChange(0);
                return;
              }
              const numValue = parseFloat(value);
              if (!isNaN(numValue) && numValue >= 0) {
                if (isOramMode) {
                  handleOramChange(Math.min(numValue, maxDisplay));
                } else {
                  handleQuantityChange(Math.min(Math.round(numValue), item.quantity));
                }
              }
            }}
            onFocus={(e) => e.target.select()}
            onBlur={(e) => {
              const value = parseFloat(e.target.value);
              if (isNaN(value) || value < 0) {
                isOramMode ? handleOramChange(0) : handleQuantityChange(0);
              } else if (value > maxDisplay) {
                isOramMode ? handleOramChange(maxDisplay) : handleQuantityChange(item.quantity);
              }
            }}
            min={0}
            max={maxDisplay}
            step={isOramMode ? 1 : 1}
            className="w-10 h-6 text-center border-2 border-slate-300 rounded font-semibold text-xs focus:border-brand-500 focus:bg-white focus:outline-none transition-all"
          />

          <button
            onClick={() => isOramMode
              ? handleOramChange(Math.min(displayQuantity + 1, maxDisplay))
              : handleQuantityChange(item.cartQuantity + 1)
            }
            disabled={isOramMode ? displayQuantity >= maxDisplay : item.cartQuantity >= item.quantity}
            className="w-6 h-6 flex items-center justify-center bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-bold transition-colors text-sm"
          >
            +
          </button>

          {isOramMode && (
            <span className="text-[10px] text-slate-500 ml-0.5">o'ram</span>
          )}
        </div>

        {/* Price */}
        <div className="text-right min-w-[80px]">
          <p className="text-sm font-bold text-slate-900">{formatNumber(total)}</p>
        </div>

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="p-1 hover:bg-red-100 text-red-500 rounded transition-colors flex-shrink-0"
          title="O'chirish"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Stock warning */}
      {(isOramMode ? displayQuantity >= maxDisplay * 0.8 : item.cartQuantity >= item.quantity * 0.8) && (
        <div className="mt-1 text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
          ⚠️ {isOramMode ? `${maxDisplay} o'ram` : `${item.quantity} metr`} qoldi
        </div>
      )}
    </div>
  );
}
