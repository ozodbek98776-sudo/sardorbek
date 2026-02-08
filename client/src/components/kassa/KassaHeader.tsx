import { ShoppingCart, Save, Menu, Wallet } from 'lucide-react';

interface KassaHeaderProps {
  savedReceiptsCount: number;
  onOpenSavedReceipts: () => void;
  onOpenDebtPayment: () => void;
  onMenuOpen?: () => void;
}

export function KassaHeader({ 
  savedReceiptsCount, 
  onOpenSavedReceipts,
  onOpenDebtPayment,
  onMenuOpen 
}: KassaHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6 h-16 flex items-center justify-between">
        {/* Left: Hamburger + Title */}
        <div className="flex items-center gap-3">
          {/* Hamburger Button - Only on mobile */}
          {onMenuOpen && (
            <button 
              onClick={onMenuOpen}
              className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors active:scale-95 flex-shrink-0 flex sm:hidden"
              title="Menyuni ochish"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 flex items-center justify-center shadow-xl">
            <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg lg:text-xl font-extrabold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
              Kassa (POS)
            </h1>
          </div>
        </div>

        {/* Right: Buttons */}
        <div className="flex items-center gap-2">
          {/* Qarz to'lash Button */}
          <button 
            onClick={onOpenDebtPayment}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 rounded-xl text-sm font-bold text-green-700 transition-all shadow-md hover:shadow-lg"
          >
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Qarz to'lash</span>
          </button>
          
          {/* Saqlangan Button */}
          <button 
            onClick={onOpenSavedReceipts}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 hover:from-purple-200 hover:to-blue-200 rounded-xl text-sm font-bold text-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Saqlangan</span>
            {savedReceiptsCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold shadow-md">
                {savedReceiptsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
