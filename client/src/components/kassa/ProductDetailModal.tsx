import { useState } from 'react';
import { X, Package2, ShoppingCart } from 'lucide-react';
import { Product } from '../../types';
import { formatNumber } from '../../utils/format';
import { UPLOADS_URL } from '../../config/api';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAddToCart: (product: Product, quantity: number) => void;
}

export function ProductDetailModal({ 
  isOpen, 
  onClose, 
  product,
  onAddToCart
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  
  // Modal scroll lock
  useModalScrollLock(isOpen);
  
  if (!isOpen || !product) return null;
  
  const imageUrl = product.images && product.images.length > 0 
    ? `${UPLOADS_URL}${product.images[0]}` 
    : null;
  
  const isOutOfStock = product.quantity <= 0;
  const isLowStock = product.quantity <= 10 && product.quantity > 0;
  
  const handleAddToCart = () => {
    if (quantity > 0 && quantity <= product.quantity) {
      onAddToCart(product, quantity);
      onClose();
      setQuantity(1);
    }
  };
  
  const handleClose = () => {
    onClose();
    setQuantity(1);
  };
  
  return (
    <div 
      data-modal="true"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn"
      style={{ pointerEvents: 'auto', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-slideUp transform transition-all"
        style={{ pointerEvents: 'auto', marginBottom: '80px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Compact */}
        <div className="relative bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Package2 className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-bold">Mahsulot tafsiloti</h3>
          </div>
          <button 
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body - No scroll needed */}
        <div className="p-4 space-y-3 bg-slate-50">
          {/* Image - Smaller */}
          <div className="relative w-32 h-32 mx-auto bg-gradient-to-br from-brand-50 to-purple-50 rounded-xl border border-brand-200 flex items-center justify-center overflow-hidden">
            {/* Stock badge */}
            <div className="absolute top-2 right-2 z-10">
              <div className={`px-2 py-0.5 rounded-lg text-xs font-bold shadow ${
                isOutOfStock 
                  ? 'bg-red-500 text-white' 
                  : isLowStock 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-green-500 text-white'
              }`}>
                {product.quantity} ta
              </div>
            </div>

            {imageUrl ? (
              <img 
                src={imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = '<svg class="w-12 h-12 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>';
                  }
                }}
              />
            ) : (
              <Package2 className="w-12 h-12 text-brand-400" />
            )}
          </div>

          {/* Info - Compact */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <h4 className="text-base font-bold text-slate-900 mb-1">{product.name}</h4>
            <p className="text-xs text-slate-500 font-mono">#{product.code}</p>
          </div>

          {/* Price - Compact */}
          <div className="bg-gradient-to-r from-brand-50 to-purple-50 rounded-xl p-3 border border-brand-100">
            <p className="text-xs text-brand-600 font-semibold mb-1">Narx</p>
            <p className="text-xl font-bold text-brand-600">
              {formatNumber(product.price)} <span className="text-sm">so'm</span>
            </p>
          </div>

          {/* Quantity - Compact */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-xs text-slate-600 font-semibold mb-2">Miqdor</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(0, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-700 transition-colors"
              >
                −
              </button>
              
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const value = e.target.value;
                  // Bo'sh bo'lsa 0 ga o'rnatamiz
                  if (value === '') {
                    setQuantity(0);
                    return;
                  }
                  
                  const numValue = parseInt(value);
                  if (!isNaN(numValue) && numValue >= 0) {
                    // Maksimal miqdordan oshsa, maksimalga o'rnatamiz
                    setQuantity(Math.min(numValue, product.quantity));
                  }
                }}
                onFocus={(e) => e.target.select()} // Bosganda barcha raqamni tanlaydi
                onBlur={(e) => {
                  // Focus yo'qolganda validatsiya
                  const value = parseInt(e.target.value);
                  if (isNaN(value) || value < 0) {
                    setQuantity(0);
                  } else if (value > product.quantity) {
                    setQuantity(product.quantity);
                  }
                }}
                min={0}
                max={product.quantity}
                className="flex-1 h-10 text-center text-lg font-bold bg-slate-50 border-2 border-slate-200 focus:border-brand-500 focus:bg-white focus:outline-none rounded-lg transition-all"
              />
              
              <button
                onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                disabled={quantity >= product.quantity}
                className="w-10 h-10 flex items-center justify-center bg-brand-500 hover:bg-brand-600 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg font-bold text-white transition-colors"
              >
                +
              </button>
            </div>
            {quantity > product.quantity && (
              <p className="text-xs text-red-500 mt-1">
                Maksimal: {product.quantity} ta
              </p>
            )}
            {quantity === 0 && (
              <p className="text-xs text-orange-500 mt-1">
                Savatga qo'shish uchun miqdorni kiriting
              </p>
            )}
          </div>

          {/* Total - Compact */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-3">
            <div className="flex justify-between items-center text-white">
              <div>
                <p className="text-xs font-semibold text-white/80 mb-0.5">Jami</p>
                <p className="text-xl font-bold">
                  {formatNumber(product.price * quantity)} so'm
                </p>
              </div>
              <ShoppingCart className="w-6 h-6 text-white/50" />
            </div>
          </div>
        </div>

        {/* Actions - Compact */}
        <div className="flex gap-2 p-3 border-t border-slate-200 bg-white">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-all text-sm"
          >
            Bekor
          </button>
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || quantity <= 0 || quantity > product.quantity}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            Savatga
          </button>
        </div>
      </div>
    </div>
  );
}
