import { useRef } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { formatNumber } from '../../utils/format';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';

interface ReceiptItem {
  name: string;
  code: string;
  price: number;
  quantity: number;
}

interface ReceiptData {
  _id: string;
  items: ReceiptItem[];
  total: number;
  paidAmount: number;
  cashAmount?: number;
  cardAmount?: number;
  paymentMethod: 'cash' | 'card' | 'mixed';
  customer?: {
    name: string;
    phone: string;
  };
  createdAt: string;
}

interface ReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
}

export function ReceiptPrintModal({ isOpen, onClose, receipt }: ReceiptPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  useModalScrollLock(isOpen);

  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const change = receipt.paidAmount - receipt.total;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-4 text-white flex items-center justify-between print:hidden">
          <h3 className="text-xl font-bold">Chek</h3>
          <button onClick={onClose} className="hover:bg-brand-600 p-2 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Receipt Content */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-6">
          {/* Print Header */}
          <div className="text-center mb-6 print:block">
            <h2 className="text-2xl font-bold text-slate-900">SARDORBEK FURNITURA</h2>
            <p className="text-sm text-slate-600">Savdo Cheki</p>
            <p className="text-xs text-slate-500 mt-1">
              {new Date(receipt.createdAt).toLocaleString('uz-UZ')}
            </p>
            <p className="text-xs text-slate-500">Chek #: {receipt._id.slice(-8)}</p>
          </div>

          {/* Customer Info */}
          {receipt.customer && (
            <div className="mb-4 pb-4 border-b border-dashed border-slate-300">
              <p className="text-sm text-slate-600">Mijoz: <span className="font-semibold text-slate-900">{receipt.customer.name}</span></p>
              <p className="text-sm text-slate-600">Tel: {receipt.customer.phone}</p>
            </div>
          )}

          {/* Items */}
          <div className="mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="text-left py-2 text-slate-600">Mahsulot</th>
                  <th className="text-center py-2 text-slate-600">Soni</th>
                  <th className="text-right py-2 text-slate-600">Narx</th>
                  <th className="text-right py-2 text-slate-600">Jami</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="py-2 text-slate-900">{item.name}</td>
                    <td className="text-center py-2 text-slate-700">{item.quantity}</td>
                    <td className="text-right py-2 text-slate-700">{formatNumber(item.price)}</td>
                    <td className="text-right py-2 font-semibold text-slate-900">{formatNumber(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t-2 border-slate-300 pt-4 space-y-2">
            <div className="flex justify-between text-lg">
              <span className="font-semibold text-slate-700">Jami:</span>
              <span className="font-bold text-slate-900">{formatNumber(receipt.total)} so'm</span>
            </div>
            
            {receipt.paymentMethod === 'mixed' ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Naqd:</span>
                  <span className="text-slate-900">{formatNumber(receipt.cashAmount || 0)} so'm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Karta:</span>
                  <span className="text-slate-900">{formatNumber(receipt.cardAmount || 0)} so'm</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">To'lov turi:</span>
                <span className="text-slate-900">{receipt.paymentMethod === 'cash' ? 'Naqd' : 'Karta'}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">To'landi:</span>
              <span className="text-slate-900">{formatNumber(receipt.paidAmount)} so'm</span>
            </div>
            
            {change > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Qaytim:</span>
                <span className="font-semibold text-green-600">{formatNumber(change)} so'm</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-dashed border-slate-300 text-center">
            <p className="text-xs text-slate-500">Xaridingiz uchun rahmat!</p>
            <p className="text-xs text-slate-500 mt-1">SARDORBEK FURNITURA</p>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-200 p-4 flex gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Chop etish
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 rounded-xl transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
