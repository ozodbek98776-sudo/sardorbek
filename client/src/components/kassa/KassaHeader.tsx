import { Save, Menu, Wallet } from 'lucide-react';

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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Hamburger + Title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Hamburger Button - faqat mobile'da */}
            {onMenuOpen && (
              <button 
                onClick={onMenuOpen}
                className="lg:hidden p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors active:scale-95 flex-shrink-0 shadow-md"
                title="Menyuni ochish"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            
            {/* Title */}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
              Kassa (POS)
            </h1>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Qarz to'lash Button */}
            <button 
              onClick={onOpenDebtPayment}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Qarz to'lash</span>
            </button>
            
            {/* Saqlangan Button */}
            <button 
              onClick={onOpenSavedReceipts}
              className="relative flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Saqlangan</span>
              {savedReceiptsCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold shadow-md min-w-[20px] text-center">
                  {savedReceiptsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
