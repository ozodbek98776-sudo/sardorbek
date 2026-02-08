import { Package2, Receipt } from 'lucide-react';

interface KassaTabsProps {
  activeTab: 'products' | 'receipts';
  onTabChange: (tab: 'products' | 'receipts') => void;
  receiptsCount: number;
}

export function KassaTabs({ 
  activeTab, 
  onTabChange, 
  receiptsCount 
}: KassaTabsProps) {
  return (
    <div className="flex gap-2 bg-white p-2 rounded-xl border-2 border-slate-200 shadow-sm">
      <button
        onClick={() => onTabChange('products')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
          activeTab === 'products'
            ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md'
            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
        }`}
      >
        <Package2 className="w-4 h-4" />
        Mahsulotlar
      </button>
      
      <button
        onClick={() => onTabChange('receipts')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
          activeTab === 'receipts'
            ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md'
            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
        }`}
      >
        <Receipt className="w-4 h-4" />
        Cheklar
        {receiptsCount > 0 && (
          <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-bold">
            {receiptsCount}
          </span>
        )}
      </button>
    </div>
  );
}
