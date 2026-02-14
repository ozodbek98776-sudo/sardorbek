import { useState } from 'react';
import { ShoppingCart, Trash2, Save, CreditCard, ChevronUp, ChevronDown } from 'lucide-react';
import { CartItem as CartItemType } from '../../types';
import { formatNumber } from '../../utils/format';
import { CartItem } from './CartItem';

interface CartPanelProps {
  cart: CartItemType[];
  total: number;
  itemCount: number;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onSave: () => void;
  onCheckout: () => void;
  isModal?: boolean; // Modal rejimida ishlaydimi
}

export function CartPanel({ 
  cart, 
  total, 
  itemCount,
  onQuantityChange,
  onRemove,
  onClear,
  onSave,
  onCheckout,
  isModal = false // Modal rejimida ishlaydimi
}: CartPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className={`bg-white ${isModal ? 'rounded-2xl' : 'rounded-t-2xl lg:rounded-xl'} border border-slate-200 shadow-lg overflow-hidden flex flex-col ${isModal ? 'h-full' : 'max-h-[60vh] lg:h-full lg:max-h-full'}`}
      data-testid="cart-panel"
    >
      {/* Mobile: Collapsible Header - faqat modal bo'lmasa */}
      {!isModal && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="lg:hidden bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3 flex items-center justify-between active:scale-98 transition-transform"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-white" />
            <span className="text-sm font-bold text-white" data-testid="cart-count">
              Savat ({itemCount})
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-white">
              {formatNumber(total)} so'm
            </span>
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-white" />
            ) : (
              <ChevronUp className="w-5 h-5 text-white" />
            )}
          </div>
        </button>
      )}
      
      {/* Desktop: Static Header */}
      <div className={`${isModal ? 'flex' : 'hidden lg:flex'} bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3 items-center justify-between`}>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          <span data-testid="cart-count">Savat ({itemCount})</span>
        </h2>
        
        {cart.length > 0 && (
          <button 
            onClick={onClear}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Savatni tozalash"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
      
      {/* Items - Responsive */}
      <div className={`overflow-y-auto scroll-smooth-instagram momentum-scroll thin-scrollbar p-3 ${
        isModal ? 'flex-1' : (isExpanded ? 'block max-h-[30vh]' : 'hidden lg:block lg:flex-1')
      } transition-all duration-300`}>
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 lg:h-full text-slate-400">
            <ShoppingCart className="w-12 h-12 mb-2 opacity-30" />
            <p className="text-sm">Savat bo'sh</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map(item => (
              <CartItem
                key={item._id}
                item={item}
                onQuantityChange={(qty) => onQuantityChange(item._id, qty)}
                onRemove={() => onRemove(item._id)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Footer - ALWAYS visible when cart has items */}
      {cart.length > 0 && (
        <div className="border-t border-slate-200 p-3 space-y-3 bg-slate-50">
          {/* Total - Desktop only (mobile shows in header) */}
          <div className="hidden lg:flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Jami:</span>
            <span className="text-xl font-bold text-brand-600" data-testid="cart-total">
              {formatNumber(total)} <span className="text-sm">so'm</span>
            </span>
          </div>
          
          {/* Actions - ALWAYS visible */}
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={onSave}
              className="flex items-center justify-center gap-2 px-4 py-2.5 lg:py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-all text-sm"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Saqlash</span>
              <span className="sm:hidden">Saqla</span>
            </button>
            
            <button 
              onClick={onCheckout}
              className="flex items-center justify-center gap-2 px-4 py-2.5 lg:py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold rounded-xl transition-all shadow-lg text-sm"
            >
              <CreditCard className="w-4 h-4" />
              <span>To'lov</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
