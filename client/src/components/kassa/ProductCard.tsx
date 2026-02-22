import { memo } from 'react';
import { Package2 } from 'lucide-react';
import { Product } from '../../types';
import { formatNumber } from '../../utils/format';
import { getDiscountPrices } from '../../utils/pricing';
import { UPLOADS_URL } from '../../config/api';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  onCategoryClick: () => void;
  onQRPrint: () => void;
}

export const ProductCard = memo(function ProductCard({ 
  product, 
  onClick,
  onCategoryClick,
  onQRPrint
}: ProductCardProps) {
  const isOutOfStock = product.quantity <= 0;
  const isLowStock = product.quantity <= 10 && product.quantity > 0;
  
  const firstImage = product.images && product.images.length > 0 ? product.images[0] : null;
  const imagePath = firstImage ? (typeof firstImage === 'string' ? firstImage : (firstImage as any).path) : null;
  const imageUrl = imagePath ? `${UPLOADS_URL}${imagePath}` : null;
  
  // Skidka narxlarini olish
  const discountPrices = getDiscountPrices(product);
  const hasDiscount = discountPrices && discountPrices.length > 0;
  const minDiscount = hasDiscount ? discountPrices[0] : null;
  
  return (
    <div 
      data-testid="product-card"
      className="group bg-white rounded-xl border border-slate-200 hover:border-brand-400 hover:shadow-xl transition-all duration-300 overflow-hidden relative flex-shrink-0 snap-start"
    >
      {/* Main card button */}
      <button
        onClick={onClick}
        disabled={isOutOfStock}
        className={`w-full text-left ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {/* Image */}
        <div className="relative w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent && !parent.querySelector('svg')) {
                  const icon = document.createElement('div');
                  icon.className = 'flex items-center justify-center w-full h-full';
                  icon.innerHTML = '<svg class="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>';
                  parent.appendChild(icon);
                }
              }}
            />
          ) : (
            <Package2 className="w-8 h-8 text-slate-300" />
          )}

          {/* Stock badge */}
          <div className="absolute bottom-2 left-2">
            {isLowStock ? (
              <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-lg shadow-lg animate-pulse">
                {product.quantity} ta
              </span>
            ) : !isOutOfStock && (
              <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-lg shadow-lg">
                {product.quantity} ta
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-2">
          {isOutOfStock && (
            <span className="inline-block px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded mb-1">TUGAGAN</span>
          )}
          <h3 className="font-bold text-slate-900 text-sm mb-1 truncate group-hover:text-brand-600 transition-colors">
            {product.name}
          </h3>
          {((product as Record<string, unknown>).category || (product as Record<string, unknown>).subcategory) && (
            <p className="text-[10px] text-slate-400 truncate mb-1">
              {(product as Record<string, unknown>).category as string}
              {(product as Record<string, unknown>).subcategory ? ` / ${(product as Record<string, unknown>).subcategory as string}` : ''}
            </p>
          )}
          <p className="font-bold text-brand-600 text-base">
            {formatNumber((() => {
              const prices = (product as any).prices;
              if (Array.isArray(prices) && prices.length > 0) {
                const unitPrice = prices.find((p: any) => p.type === 'unit');
                if (unitPrice?.amount) return unitPrice.amount;
              }
              return (product as any).unitPrice || product.price || 0;
            })())}
            <span className="text-xs ml-1">so'm</span>
          </p>
          {hasDiscount && minDiscount && (
            <p className="text-xs text-emerald-600 font-medium mt-1">
              {minDiscount.discountPercent}% chegirma {minDiscount.minQuantity}+ ta
            </p>
          )}
        </div>
      </button>
    </div>
  );
}, (prevProps, nextProps) => {
  // Faqat muhim props o'zgarganda re-render
  // prices array'ni safe tekshirish
  const prevPrices = Array.isArray(prevProps.product.prices) ? prevProps.product.prices : [];
  const nextPrices = Array.isArray(nextProps.product.prices) ? nextProps.product.prices : [];
  
  const prevUnitPrice = prevPrices.find((p: any) => p.type === 'unit')?.amount || prevProps.product.price;
  const nextUnitPrice = nextPrices.find((p: any) => p.type === 'unit')?.amount || nextProps.product.price;
  
  // Prices array'ni deep compare qilish
  const pricesEqual = prevPrices.length === nextPrices.length &&
    prevPrices.every((p: any, idx: number) => {
      const nextP = nextPrices[idx];
      return p.type === nextP.type && p.amount === nextP.amount && p.minQuantity === nextP.minQuantity;
    });
  
  return prevProps.product._id === nextProps.product._id &&
         prevProps.product.quantity === nextProps.product.quantity &&
         prevProps.product.price === nextProps.product.price &&
         prevProps.product.name === nextProps.product.name &&
         prevUnitPrice === nextUnitPrice &&
         pricesEqual;
});
