import { useState } from 'react';
import { X, Receipt, ShoppingBag, Eye, User } from 'lucide-react';
import { formatNumber } from '../../utils/format';
import { UPLOADS_URL } from '../../config/api';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';

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
  helperReceipts?: any[];
  onLoadHelper?: (receipt: any) => void;
}

export function SavedReceiptsModal({
  isOpen,
  onClose,
  receipts,
  onLoad,
  onDelete,
  helperReceipts = [],
  onLoadHelper
}: SavedReceiptsModalProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<SavedReceipt | null>(null);
  const [selectedHelper, setSelectedHelper] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'saved' | 'helper'>('saved');

  useModalScrollLock(isOpen);

  if (!isOpen) return null;

  // Show helper tab by default if there are helper receipts and no saved receipts
  const effectiveTab = helperReceipts.length > 0 && receipts.length === 0 ? 'helper' : activeTab;

  return (
    <>
      {/* Main Modal */}
      <div
        data-modal="true"
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 overflow-y-auto"
        style={{ pointerEvents: 'auto', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
          style={{ pointerEvents: 'auto', marginBottom: '80px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-4 text-white flex items-center justify-between">
            <h3 className="text-xl font-bold">Saqlangan Cheklar</h3>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          {helperReceipts.length > 0 && (
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  effectiveTab === 'saved'
                    ? 'border-b-2 border-brand-500 text-brand-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Saqlangan ({receipts.length})
              </button>
              <button
                onClick={() => setActiveTab('helper')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  effectiveTab === 'helper'
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Helper yuborgan ({helperReceipts.length})
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto scroll-smooth-instagram momentum-scroll divide-y divide-slate-200 thin-scrollbar">
            {/* Saved receipts tab */}
            {effectiveTab === 'saved' && (
              <>
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
                          onClick={() => { onLoad(receipt); onClose(); }}
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
              </>
            )}

            {/* Helper receipts tab */}
            {effectiveTab === 'helper' && (
              <>
                {helperReceipts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Helper yuborgan cheklar yo'q</p>
                  </div>
                ) : (
                  helperReceipts.map((receipt: any) => {
                    const items = Array.isArray(receipt.items) ? receipt.items : [];
                    const customerName = receipt.customer?.name || 'Oddiy mijoz';
                    const savedAt = receipt.createdAt
                      ? new Date(receipt.createdAt).toLocaleString('uz-UZ')
                      : '';
                    return (
                      <div key={receipt._id} className="p-4 hover:bg-orange-50 transition-colors">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <p className="font-semibold text-slate-900">{items.length} ta mahsulot</p>
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                              <User className="w-3 h-3" />
                              <span>{customerName}</span>
                              <span className="text-slate-300">•</span>
                              <span>{savedAt}</span>
                            </div>
                          </div>
                          <p className="font-bold text-orange-600">{formatNumber(receipt.total)} so'm</p>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => setSelectedHelper(receipt)}
                            className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Ko'rish
                          </button>
                          <button
                            onClick={() => { onLoadHelper?.(receipt); onClose(); }}
                            className="flex-1 bg-orange-100 hover:bg-orange-200 text-orange-700 font-semibold py-2 rounded-lg transition-colors text-sm"
                          >
                            Savatga olish
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Saved receipt detail modal */}
      {selectedReceipt && (
        <div
          data-modal="true"
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4 overflow-y-auto"
          style={{ pointerEvents: 'auto', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            style={{ pointerEvents: 'auto', marginBottom: '80px' }}
            onClick={(e) => e.stopPropagation()}
          >
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
              <button onClick={() => setSelectedReceipt(null)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scroll-smooth-instagram momentum-scroll p-6 thin-scrollbar">
              <div className="space-y-3">
                {selectedReceipt.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    {(() => {
                      const imgPath = item.images?.[0]
                        ? (typeof item.images[0] === 'string' ? item.images[0] : item.images[0].path)
                        : item.image;
                      return imgPath ? (
                        <img
                          src={imgPath.startsWith('http') ? imgPath : `${UPLOADS_URL}${imgPath}`}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center">
                          <ShoppingBag className="w-8 h-8 text-slate-400" />
                        </div>
                      );
                    })()}
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 mb-1">{item.name}</h4>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-600">{item.cartQuantity || item.quantity} {item.unit || 'dona'}</span>
                        <span className="text-slate-400">×</span>
                        <span className="text-slate-600">{formatNumber(item.price)} so'm</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
                        {formatNumber((item.cartQuantity || item.quantity) * item.price)}
                      </p>
                      <p className="text-xs text-slate-500">so'm</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white mb-4">
                <span className="text-lg font-bold">Umumiy summa:</span>
                <span className="text-2xl font-bold">{formatNumber(selectedReceipt.total)} so'm</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { onLoad(selectedReceipt); setSelectedReceipt(null); onClose(); }}
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

      {/* Helper receipt detail modal */}
      {selectedHelper && (
        <div
          data-modal="true"
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4 overflow-y-auto"
          style={{ pointerEvents: 'auto', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          onClick={() => setSelectedHelper(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            style={{ pointerEvents: 'auto', marginBottom: '80px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Helper Cheki</h3>
                  <p className="text-sm text-orange-100">
                    {selectedHelper.customer?.name || 'Oddiy mijoz'} •{' '}
                    {selectedHelper.createdAt ? new Date(selectedHelper.createdAt).toLocaleString('uz-UZ') : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedHelper(null)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scroll-smooth-instagram momentum-scroll p-6 thin-scrollbar">
              <div className="space-y-3">
                {(selectedHelper.items || []).map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 mb-1">{item.name}</h4>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-600">{item.quantity} dona</span>
                        <span className="text-slate-400">×</span>
                        <span className="text-slate-600">{formatNumber(item.price)} so'm</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-orange-600">
                        {formatNumber(item.quantity * item.price)}
                      </p>
                      <p className="text-xs text-slate-500">so'm</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-white mb-4">
                <span className="text-lg font-bold">Umumiy summa:</span>
                <span className="text-2xl font-bold">{formatNumber(selectedHelper.total)} so'm</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { onLoadHelper?.(selectedHelper); setSelectedHelper(null); onClose(); }}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Savatga olish
                </button>
                <button
                  onClick={() => setSelectedHelper(null)}
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
