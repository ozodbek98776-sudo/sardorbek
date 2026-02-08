import { Package2 } from 'lucide-react';
import { Product } from '../../types';
import { formatNumber } from '../../utils/format';
import { UPLOADS_URL } from '../../config/api';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  onCategoryClick: () => void;
  onQRPrint: () => void;
}

export function ProductCard({ 
  product, 
  onClick,
  onCategoryClick,
  onQRPrint
}: ProductCardProps) {
  const isOutOfStock = product.quantity <= 0;
  const isLowStock = product.quantity <= 10 && product.quantity > 0;
  
  const imageUrl = product.images && product.images.length > 0 
    ? `${UPLOADS_URL}${product.images[0]}` 
    : null;
  
  return (
    <div className="group bg-white rounded-xl border border-slate-200 hover:border-brand-400 hover:shadow-xl transition-all duration-300 overflow-hidden relative flex-shrink-0 snap-start">
      {/* Main card button */}
      <button
        onClick={onClick}
        disabled={isOutOfStock}
        className={`w-full text-left ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {/* Image - Smaller */}
        <div className="relative w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="bg-red-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-lg">
                TUGAGAN
              </div>
            </div>
          )}
          
          {imageUrl ? (
            <img 
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
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
          
          {/* Stock badge - Larger */}
          <div className="absolute bottom-2 left-2">
            {isOutOfStock ? (
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg shadow-lg">
                0 ta
              </span>
            ) : isLowStock ? (
              <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-lg shadow-lg animate-pulse">
                {product.quantity} ta
              </span>
            ) : (
              <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-lg shadow-lg">
                {product.quantity} ta
              </span>
            )}
          </div>
        </div>
        
        {/* Info - Larger text, smaller padding */}
        <div className="p-2">
          <h3 className="font-bold text-slate-900 text-sm mb-1 truncate group-hover:text-brand-600 transition-colors">
            {product.name}
          </h3>
          <p className="text-xs text-slate-500 mb-2 font-mono">
            #{product.code}
          </p>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Narxi</p>
            <p className="font-bold text-brand-600 text-base">
              {formatNumber(product.price)}
              <span className="text-xs ml-1">so'm</span>
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}
