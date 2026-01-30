import { useState, useEffect } from 'react';
import { FileText, Printer, Trash2, Eye, Calendar, User, Package, DollarSign, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import { useAlert } from '../../hooks/useAlert';
import { formatNumber } from '../../utils/format';

interface ReceiptItem {
  product: {
    _id: string;
    name: string;
    code: string;
  };
  quantity: number;
  price: number;
}

interface Receipt {
  _id: string;
  receiptNumber: string;
  items: ReceiptItem[];
  totalAmount: number;
  paymentMethod: string;
  customer?: {
    name: string;
    phone: string;
  };
  createdBy: {
    name: string;
    role: string;
  };
  createdAt: string;
  status: string;
}

export default function KassaReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { showAlert, showConfirm, AlertComponent } = useAlert();

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      console.log('Fetching receipts from /receipts/kassa...');
      const response = await api.get('/receipts/kassa');
      console.log('Receipts response:', response.data);
      console.log('Total receipts:', response.data.length);
      setReceipts(response.data);
    } catch (error: any) {
      console.error('Cheklar yuklashda xatolik:', error);
      console.error('Error response:', error.response);
      showAlert(error.response?.data?.message || 'Cheklar yuklashda xatolik', 'Xatolik', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (receipt: Receipt) => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      showAlert('Popup bloklangan. Iltimos, popup ga ruxsat bering.', 'Ogohlantirish', 'warning');
      return;
    }

    const itemsHtml = receipt.items.map((item, index) => `
      <tr>
        <td style="padding: 8px 4px; border-bottom: 1px dashed #ddd; text-align: center; font-size: 14px;">${index + 1}</td>
        <td style="padding: 8px 4px; border-bottom: 1px dashed #ddd; font-size: 14px;">${item.product.name}</td>
        <td style="padding: 8px 4px; border-bottom: 1px dashed #ddd; text-align: center; font-size: 14px;">${item.quantity}</td>
        <td style="padding: 8px 4px; border-bottom: 1px dashed #ddd; text-align: right; font-size: 14px;">${formatNumber(item.price)}</td>
        <td style="padding: 8px 4px; border-bottom: 1px dashed #ddd; text-align: right; font-weight: bold; font-size: 14px;">${formatNumber(item.price * item.quantity)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Chek #${receipt.receiptNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          @media print {
            body { width: 80mm; margin: 0; }
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body { 
            font-family: 'Courier New', monospace;
            width: 80mm;
            padding: 10mm 5mm;
            background: white;
            margin: 0 auto;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .header { 
            text-align: center; 
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px dashed #000;
          }
          .header h1 { 
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .header .subtitle { 
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
          }
          .header .receipt-number { 
            font-size: 14px;
            font-weight: bold;
            margin-top: 8px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0;
          }
          th { 
            padding: 8px 4px;
            text-align: left; 
            border-bottom: 2px solid #000;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          th.center { text-align: center; }
          th.right { text-align: right; }
          .total-section { 
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px dashed #000;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
          }
          .total-label {
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .total-amount {
            font-size: 20px;
            font-weight: bold;
          }
          .footer { 
            margin-top: 20px;
            padding-top: 15px;
            text-align: center;
            border-top: 2px dashed #000;
          }
          .footer p {
            font-size: 11px;
            color: #666;
            margin: 3px 0;
          }
          .thank-you {
            font-size: 13px;
            font-weight: bold;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <!-- Logo -->
          <div style="margin-bottom: 8px;">
            <img src="/o5sk1awh.png" alt="Logo" style="width: 40px; height: 40px; display: block; margin: 0 auto; border-radius: 6px;" />
          </div>
          <h1>SARDOR FURNITURA</h1>
          <div class="subtitle">Mebel furniturasi</div>
          <div class="receipt-number">Chek #${receipt.receiptNumber}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px;" class="center">№</th>
              <th>Mahsulot</th>
              <th style="width: 35px;" class="center">Soni</th>
              <th style="width: 60px;" class="right">Narxi</th>
              <th style="width: 70px;" class="right">Jami</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-row">
            <span class="total-label">JAMI:</span>
            <span class="total-amount">${formatNumber(receipt.totalAmount)} so'm</span>
          </div>
        </div>

        <div class="footer">
          <p class="thank-you">Xaridingiz uchun rahmat!</p>
          <p>Sardor Furnitura - Sifatli mebel furniturasi</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  const handleDelete = async (receiptId: string) => {
    try {
      console.log('=== DELETE RECEIPT START ===');
      console.log('Receipt ID:', receiptId);
      
      const confirmed = await showConfirm(
        'Chekni o\'chirmoqchimisiz?',
        'Chek o\'chirilganda mahsulot miqdorlari qaytariladi',
        'danger'
      );

      console.log('User confirmed:', confirmed);

      if (!confirmed) {
        console.log('User cancelled deletion');
        return;
      }

      console.log('Sending DELETE request to /receipts/' + receiptId);
      const response = await api.delete(`/receipts/${receiptId}`);
      console.log('Delete response:', response.data);
      
      showAlert('Chek muvaffaqiyatli o\'chirildi', 'Muvaffaqiyat', 'success');
      
      console.log('Fetching updated receipts...');
      await fetchReceipts();
      console.log('=== DELETE RECEIPT END ===');
    } catch (error: any) {
      console.error('=== DELETE RECEIPT ERROR ===');
      console.error('Error:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      showAlert(error.response?.data?.message || 'Chekni o\'chirishda xatolik', 'Xatolik', 'danger');
    }
  };

  const openDetailModal = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 p-2 sm:p-4 pb-20">
      {AlertComponent}
      
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-3 sm:mb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-xl font-bold text-surface-900 truncate">Cheklar</h1>
              <p className="text-xs sm:text-sm text-surface-500 truncate">Hodimlar cheklari</p>
            </div>
          </div>
          <button
            onClick={fetchReceipts}
            className="btn-secondary flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-sm flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Yangilash</span>
          </button>
        </div>
      </div>

      {/* Receipts List */}
      {receipts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center">
          <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-surface-300 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-surface-900 mb-2">Cheklar yo'q</h3>
          <p className="text-sm sm:text-base text-surface-500">Hali hech qanday chek yaratilmagan</p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-180px)] overflow-y-auto">
          <div className="grid gap-3 sm:gap-4 pr-1">
            {receipts.map((receipt) => (
            <div key={receipt._id} className="bg-white rounded-xl shadow-sm p-3 sm:p-4 hover:shadow-md transition-shadow">
              {/* Receipt Header */}
              <div className="flex items-center gap-2 sm:gap-3 mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-surface-900 truncate">Chek #{receipt.receiptNumber}</h3>
                  <p className="text-xs text-surface-500">
                    {new Date(receipt.createdAt).toLocaleString('uz-UZ', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>

              {/* Receipt Info */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <User className="w-3 h-3 sm:w-4 sm:h-4 text-surface-400 flex-shrink-0" />
                  <span className="text-surface-600">Sotuvchi:</span>
                  <span className="font-medium text-surface-900 truncate">{receipt.createdBy.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Package className="w-3 h-3 sm:w-4 sm:h-4 text-surface-400 flex-shrink-0" />
                  <span className="text-surface-600">Mahsulotlar:</span>
                  <span className="font-medium text-surface-900">{receipt.items.length} ta</span>
                </div>
                {receipt.customer && (
                  <>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <User className="w-3 h-3 sm:w-4 sm:h-4 text-surface-400 flex-shrink-0" />
                      <span className="text-surface-600">Mijoz:</span>
                      <span className="font-medium text-surface-900 truncate">{receipt.customer.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <span className="text-surface-600">Tel:</span>
                      <span className="font-medium text-surface-900">{receipt.customer.phone}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Total Amount */}
              <div className="flex items-center gap-2 p-2 sm:p-3 bg-brand-50 rounded-lg mb-3">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-surface-600">Jami:</span>
                <span className="text-base sm:text-lg font-bold text-brand-700">
                  {formatNumber(receipt.totalAmount)} so'm
                </span>
              </div>

              {/* Actions - Mobile Optimized */}
              <div className="flex gap-2">
                <button
                  onClick={() => openDetailModal(receipt)}
                  className="flex-1 flex items-center justify-center gap-1 sm:gap-2 p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-xs sm:text-sm"
                >
                  <Eye className="w-4 h-4" />
                  <span>Ko'rish</span>
                </button>
                <button
                  onClick={() => handlePrint(receipt)}
                  className="flex-1 flex items-center justify-center gap-1 sm:gap-2 p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors text-xs sm:text-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-surface-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-xl font-bold text-surface-900">Chek #{selectedReceipt.receiptNumber}</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* Items */}
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                <h3 className="font-semibold text-sm sm:text-base text-surface-900 mb-2 sm:mb-3">Mahsulotlar:</h3>
                {selectedReceipt.items.map((item, index) => (
                  <div key={index} className="flex items-start justify-between p-2 sm:p-3 bg-surface-50 rounded-lg gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base text-surface-900 break-words">{item.product.name}</p>
                      <p className="text-xs sm:text-sm text-surface-500">Kod: {item.product.code}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-xs sm:text-sm text-surface-900 whitespace-nowrap">
                        {item.quantity} x {formatNumber(item.price)}
                      </p>
                      <p className="text-xs sm:text-sm text-brand-600 font-bold">
                        {formatNumber(item.quantity * item.price)} so'm
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t border-surface-200 pt-3 sm:pt-4">
                <div className="flex items-center justify-between text-base sm:text-lg font-bold">
                  <span className="text-surface-900">JAMI:</span>
                  <span className="text-brand-700">{formatNumber(selectedReceipt.totalAmount)} so'm</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
