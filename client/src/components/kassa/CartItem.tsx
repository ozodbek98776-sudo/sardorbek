import { X } from 'lucide-react';
import { CartItem as CartItemType } from '../../types';
import { formatNumber } from '../../utils/format';

interface CartItemProps {
  item: CartItemType;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

export function CartItem({ 
  item, 
  onQuantityChange, 
  onRemove 
}: CartItemProps) {
  const price = item.discountedPrice || item.price;
  const total = price * item.cartQuantity;
  const hasDiscount = item.discountedPrice && item.discountedPrice < item.price;
  
  // Agar miqdor 0 ga tushsa, avtomatik o'chirish
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity <= 0) {
      onRemove();
    } else {
      onQuantityChange(newQuantity);
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
        </div>
        
        {/* Quantity Controls - Compact */}
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handleQuantityChange(Math.max(0, item.cartQuantity - 1))}
            className="w-6 h-6 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded font-bold text-slate-700 transition-colors text-sm"
          >
            −
          </button>
          
          <input
            type="number"
            value={item.cartQuantity}
            onChange={(e) => {
              const value = e.target.value;
              // Bo'sh bo'lsa 0 ga o'rnatamiz
              if (value === '') {
                handleQuantityChange(0);
                return;
              }
              
              const numValue = parseInt(value);
              if (!isNaN(numValue) && numValue >= 0) {
                // Maksimal miqdordan oshsa, maksimalga o'rnatamiz
                handleQuantityChange(Math.min(numValue, item.quantity));
              }
            }}
            onFocus={(e) => e.target.select()} // Bosganda barcha raqamni tanlaydi
            onBlur={(e) => {
              // Focus yo'qolganda validatsiya
              const value = parseInt(e.target.value);
              if (isNaN(value) || value < 0) {
                handleQuantityChange(0);
              } else if (value > item.quantity) {
                handleQuantityChange(item.quantity);
              }
            }}
            min={0}
            max={item.quantity}
            className="w-10 h-6 text-center border-2 border-slate-300 rounded font-semibold text-xs focus:border-brand-500 focus:bg-white focus:outline-none transition-all"
          />
          
          <button 
            onClick={() => handleQuantityChange(item.cartQuantity + 1)}
            disabled={item.cartQuantity >= item.quantity}
            className="w-6 h-6 flex items-center justify-center bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-bold transition-colors text-sm"
          >
            +
          </button>
        </div>
        
        {/* Price */}
        <div className="text-right min-w-[80px]">
          <p className="text-sm font-bold text-slate-900">{formatNumber(total)}</p>
          {hasDiscount && (
            <p className="text-xs text-emerald-600 font-medium">
              {formatNumber(item.price)} → {formatNumber(price)}
            </p>
          )}
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
      
      {/* Stock warning - if needed */}
      {item.cartQuantity >= item.quantity * 0.8 && (
        <div className="mt-1 text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
          ⚠️ {item.quantity} ta qoldi
        </div>
      )}
    </div>
  );
}
