import { useState } from 'react';
import { X, Receipt, ShoppingBag, Eye } from 'lucide-react';
import { formatNumber } from '../../utils/format';

interface SavedReceipt {
  id: string;
  items: any[];
  total: number;
  savedAt: string;
}

interface SavedReceiptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipts: SavedReceipt[];
  onLoad: (receipt: SavedReceipt) => void;
  onDelete: (id: string) => void;
}

export function SavedReceiptsModal({ 
  isOpen, 
  onClose, 
  receipts,
  onLoad,
  onDelete
}: SavedReceiptsModalProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<SavedReceipt | null>(null);
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Main Modal - Cheklar ro'yxati */}
      <div 
        data-modal="true"
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 overflow-y-auto"
        style={{ pointerEvents: 'auto' }}
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-96 overflow-hidden flex flex-col"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-4 text-white flex items-center justify-between">
            <h3 className="text-xl font-bold">Saqlangan Cheklar</h3>
            <button onClick={onClose} className="hover:bg-brand-600 p-2 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-200 thin-scrollbar">
            {receipts.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Saqlangan cheklar yo'q</p>
              </div>
            ) : (
              receipts.map(receipt => (
                <div key={receipt.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">{receipt.items.length} ta mahsulot</p>
                      <p className="text-xs text-slate-500">{receipt.savedAt}</p>
                    </div>
                    <p className="font-bold text-brand-600">{formatNumber(receipt.total)} so'm</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedReceipt(receipt)}
                      className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Ko'rish
                    </button>
                    <button
                      onClick={() => {
                        onLoad(receipt);
                        onClose();
                      }}
                      className="flex-1 bg-brand-100 hover:bg-brand-200 text-brand-700 font-semibold py-2 rounded-lg transition-colors text-sm"
                    >
                      Yuklash
                    </button>
                    <button
                      onClick={() => onDelete(receipt.id)}
                      className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-2 rounded-lg transition-colors text-sm"
                    >
                      O'chirish
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Receipt Details Modal - Chek tafsilotlari */}
      {selectedReceipt && (
        <div 
          data-modal="true"
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4 overflow-y-auto"
          style={{ pointerEvents: 'auto' }}
          onClick={() => setSelectedReceipt(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Chek Tafsilotlari</h3>
                  <p className="text-sm text-blue-100">{selectedReceipt.savedAt}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedReceipt(null)} 
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Products List */}
            <div className="flex-1 overflow-y-auto p-6 thin-scrollbar">
              <div className="space-y-3">
                {selectedReceipt.items.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors"
                  >
                    {/* Product Image */}
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-slate-400" />
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 mb-1">{item.name}</h4>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-600">
                          {item.quantity} {item.unit || 'dona'}
                        </span>
                        <span className="text-slate-400">×</span>
                        <span className="text-slate-600">
                          {formatNumber(item.price)} so'm
                        </span>
                      </div>
                    </div>

                    {/* Total Price */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
                        {formatNumber(item.quantity * item.price)}
                      </p>
                      <p className="text-xs text-slate-500">so'm</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer - Total */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-600 font-semibold">Jami mahsulotlar:</span>
                <span className="text-slate-900 font-bold">{selectedReceipt.items.length} ta</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white">
                <span className="text-lg font-bold">Umumiy summa:</span>
                <span className="text-2xl font-bold">{formatNumber(selectedReceipt.total)} so'm</span>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    onLoad(selectedReceipt);
                    setSelectedReceipt(null);
                    onClose();
                  }}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Chekni Yuklash
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 rounded-xl transition-colors"
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
