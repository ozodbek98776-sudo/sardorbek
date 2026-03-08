import { useState, useEffect, useMemo, useCallback } from 'react';
import { FileText, Printer, Trash2, Eye, Calendar, User, Package, DollarSign, RefreshCw, ChevronDown, ChevronUp, CheckCircle, XCircle, Users, Clock, TrendingUp } from 'lucide-react';
import api from '../../utils/api';
import { useAlert } from '../../hooks/useAlert';
import { formatNumber, formatDateTime } from '../../utils/format';
import { useSocket } from '../../hooks/useSocket';
import { UPLOADS_URL } from '../../config/api';
import { useSwipeToClose } from '../../hooks/useSwipeToClose';

const toLocalDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

function DateInput({ value, onChange, min, max }: { value: string; onChange: (v: string) => void; min?: string; max?: string }) {
  const [parts, setParts] = useState(() => { const [y,m,d] = value.split('-'); return { d, m, y }; });
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) { const [y,m,d] = value.split('-'); setParts({ d, m, y }); } }, [value, editing]);
  const commit = () => {
    setEditing(false);
    const dd = String(Math.min(31, Math.max(1, Number(parts.d) || 1))).padStart(2,'0');
    const mm = String(Math.min(12, Math.max(1, Number(parts.m) || 1))).padStart(2,'0');
    const yy = parts.y.length === 4 ? parts.y : '2026';
    const val = `${yy}-${mm}-${dd}`;
    if (max && val > max) { onChange(max); return; }
    if (min && val < min) { onChange(min); return; }
    onChange(val);
  };
  const set = (field: 'd'|'m'|'y', raw: string) => { setEditing(true); setParts(p => ({ ...p, [field]: raw })); };
  return (
    <div className="flex items-center gap-0.5 px-1.5 py-1 rounded border border-surface-200 bg-surface-50">
      <input type="text" inputMode="numeric" value={parts.d} onFocus={e => e.target.select()} onBlur={commit}
        onChange={e => set('d', e.target.value.replace(/\D/g,'').slice(0,2))}
        className="w-[24px] text-center text-xs bg-transparent outline-none" />
      <span className="text-xs text-surface-400">.</span>
      <input type="text" inputMode="numeric" value={parts.m} onFocus={e => e.target.select()} onBlur={commit}
        onChange={e => set('m', e.target.value.replace(/\D/g,'').slice(0,2))}
        className="w-[24px] text-center text-xs bg-transparent outline-none" />
      <span className="text-xs text-surface-400">.</span>
      <input type="text" inputMode="numeric" value={parts.y} onFocus={e => e.target.select()} onBlur={commit}
        onChange={e => set('y', e.target.value.replace(/\D/g,'').slice(0,4))}
        className="w-[40px] text-center text-xs bg-transparent outline-none" />
    </div>
  );
}

interface ReceiptItem {
  product: {
    _id: string;
    name: string;
    code: string;
    images?: Array<{ path: string }>;
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
  const socket = useSocket();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [expandedImages, setExpandedImages] = useState<{ [key: number]: boolean }>({});
  const [startDate, setStartDate] = useState(toLocalDateStr(new Date()));
  const [endDate, setEndDate] = useState(toLocalDateStr(new Date()));
  const { showAlert, showConfirm, AlertComponent } = useAlert();

  const filteredStats = useMemo(() => {
    const totalAmount = receipts.reduce((sum, r) => sum + r.totalAmount, 0);
    const pendingCount = receipts.filter(r => r.status === 'pending').length;
    const approvedCount = receipts.filter(r => r.status === 'approved').length;

    const byStaff: Record<string, { name: string; role: string; count: number; total: number; pending: number; approved: number }> = {};
    receipts.forEach(r => {
      const key = r.createdBy.name;
      if (!byStaff[key]) {
        byStaff[key] = { name: r.createdBy.name, role: r.createdBy.role, count: 0, total: 0, pending: 0, approved: 0 };
      }
      byStaff[key].count++;
      byStaff[key].total += r.totalAmount;
      if (r.status === 'pending') byStaff[key].pending++;
      if (r.status === 'approved') byStaff[key].approved++;
    });

    return { totalAmount, pendingCount, approvedCount, byStaff: Object.values(byStaff) };
  }, [receipts]);

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const response = await api.get('/receipts/kassa', {
        params: { startDate: start.toISOString(), endDate: end.toISOString() }
      });
      setReceipts(response.data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showAlert(err.response?.data?.message || 'Cheklar yuklashda xatolik', 'Xatolik', 'danger');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReceipts();
  }, [startDate, endDate]);

  // Socket.IO - Real-time updates for receipts
  useEffect(() => {
    if (!socket) return;

    socket.on('receipt:created', async (data: { _id: string }) => {
      try {
        const response = await api.get(`/receipts/${data._id}`);
        const newReceipt = response.data;
        setReceipts(prev => [newReceipt, ...prev]);
        showAlert('Yangi chek keldi!', 'Yangilik', 'success');
      } catch {
        fetchReceipts();
      }
    });

    return () => {
      socket.off('receipt:created');
    };
  }, [socket]);

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
          .info-section {
            margin: 10px 0;
            padding: 8px;
            background: #f5f5f5;
            border-radius: 4px;
            font-size: 11px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .info-label {
            font-weight: bold;
            color: #333;
          }
          .info-value {
            color: #666;
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

        <!-- Hodim va Mijoz ma'lumotlari -->
        <div class="info-section">
          <div class="info-row">
            <span class="info-label">👤 Sotuvchi:</span>
            <span class="info-value">${receipt.createdBy.name}</span>
          </div>
          ${receipt.customer ? `
            <div class="info-row">
              <span class="info-label">🛒 Mijoz:</span>
              <span class="info-value">${receipt.customer.name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">📞 Tel:</span>
              <span class="info-value">${receipt.customer.phone}</span>
            </div>
          ` : `
            <div class="info-row">
              <span class="info-label">🛒 Mijoz:</span>
              <span class="info-value" style="font-style: italic;">Ko'rsatilmagan</span>
            </div>
          `}
          <div class="info-row">
            <span class="info-label">📅 Sana:</span>
            <span class="info-value">${formatDateTime(receipt.createdAt)}</span>
          </div>
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

  const handleApprove = async (receiptId: string) => {
    const confirmed = await showConfirm(
      'Bu chekni kassaga o\'tkazmoqchimisiz?',
      'Tasdiqlangandan keyin mahsulot miqdori kamayadi',
      'success'
    );
    if (!confirmed) return;

    try {
      await api.put(`/receipts/${receiptId}/approve`);
      showAlert('Chek muvaffaqiyatli tasdiqlandi', 'Muvaffaqiyat', 'success');
      await fetchReceipts();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showAlert(err.response?.data?.message || 'Tasdiqlashda xatolik', 'Xatolik', 'danger');
    }
  };

  const handleReject = async (receiptId: string) => {
    const confirmed = await showConfirm(
      'Bu chekni rad etmoqchimisiz?',
      'Rad etilgan chek qayta tiklanmaydi',
      'danger'
    );
    if (!confirmed) return;

    try {
      await api.put(`/receipts/${receiptId}/reject`);
      showAlert('Chek rad etildi', 'Muvaffaqiyat', 'success');
      await fetchReceipts();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showAlert(err.response?.data?.message || 'Rad etishda xatolik', 'Xatolik', 'danger');
    }
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

  useSwipeToClose(showDetailModal ? () => setShowDetailModal(false) : undefined);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 p-1 w-full h-full">
      {AlertComponent}
      
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 mb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-base font-bold text-surface-900 truncate">Cheklar</h1>
            </div>
          </div>
          <button
            onClick={() => fetchReceipts()}
            className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
            title="Yangilash"
          >
            <RefreshCw className={`w-4 h-4 text-surface-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow-sm px-2 py-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
          <DateInput value={startDate} max={endDate} onChange={setStartDate} />
          <span className="text-xs text-surface-400">—</span>
          <DateInput value={endDate} min={startDate} max={toLocalDateStr(new Date())} onChange={setEndDate} />
          <button
            onClick={() => { const today = toLocalDateStr(new Date()); setStartDate(today); setEndDate(today); }}
            className="ml-auto px-2 py-1 rounded text-[10px] font-medium bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors flex-shrink-0"
          >
            Bugun
          </button>
        </div>
      </div>

      {/* Today Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
        <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Cheklar</p>
              <p className="text-sm sm:text-base font-bold text-surface-900">{receipts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Jami summa</p>
              <p className="text-sm sm:text-base font-bold text-green-700">{formatNumber(filteredStats.totalAmount)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Kutilmoqda</p>
              <p className="text-sm sm:text-base font-bold text-yellow-700">{filteredStats.pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Tasdiqlangan</p>
              <p className="text-sm sm:text-base font-bold text-emerald-700">{filteredStats.approvedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Breakdown */}
      {filteredStats.byStaff.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 mb-2">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-surface-500" />
            <h2 className="text-xs sm:text-sm font-semibold text-surface-700">Xodimlar bo'yicha</h2>
          </div>
          <div className="grid gap-1.5">
            {filteredStats.byStaff.map((staff) => (
              <div key={staff.name} className="flex items-center justify-between p-2 bg-surface-50 rounded-lg text-xs sm:text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-3 h-3 text-brand-600" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-surface-900 truncate block">{staff.name}</span>
                    <span className="text-xs text-surface-400">{staff.role === 'helper' ? 'Yordamchi' : staff.role === 'cashier' ? 'Kassir' : staff.role}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <span className="text-surface-500">{staff.count} chek</span>
                    {staff.pending > 0 && (
                      <span className="ml-1 text-xs text-yellow-600">({staff.pending} kutilmoqda)</span>
                    )}
                  </div>
                  <span className="font-bold text-brand-700 whitespace-nowrap">{formatNumber(staff.total)} so'm</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receipts List */}
      {receipts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center">
          <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-surface-300 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-surface-900 mb-2">Cheklar yo'q</h3>
          <p className="text-sm sm:text-base text-surface-500">Hali hech qanday chek yaratilmagan</p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-360px)] overflow-y-auto scroll-smooth-instagram momentum-scroll">
          <div className="grid gap-3 sm:gap-4 pr-1">
            {receipts.map((receipt) => (
            <div key={receipt._id} className="bg-white rounded-xl shadow-sm p-3 sm:p-4 hover:shadow-md transition-shadow">
              {/* Receipt Header */}
              <div className="flex items-center gap-2 sm:gap-3 mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-surface-900 truncate">Chek #{receipt.receiptNumber}</h3>
                    {receipt.status === 'pending' && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">Kutilmoqda</span>
                    )}
                    {receipt.status === 'approved' && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Tasdiqlangan</span>
                    )}
                    {receipt.status === 'rejected' && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">Rad etilgan</span>
                    )}
                  </div>
                  <p className="text-xs text-surface-500">
                    {formatDateTime(receipt.createdAt)}
                  </p>
                </div>
              </div>

              {/* Receipt Info */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <User className="w-3 h-3 sm:w-4 sm:h-4 text-surface-400 flex-shrink-0" />
                  <span className="text-surface-600">Sotuvchi:</span>
                  <span className="font-medium text-surface-900 truncate">{receipt.createdBy.name}</span>
                  <span className="text-xs text-surface-500">({receipt.createdBy.role})</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Package className="w-3 h-3 sm:w-4 sm:h-4 text-surface-400 flex-shrink-0" />
                  <span className="text-surface-600">Mahsulotlar:</span>
                  <span className="font-medium text-surface-900">{receipt.items.length} ta</span>
                </div>
                {receipt.customer ? (
                  <>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <User className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                      <span className="text-surface-600">Mijoz:</span>
                      <span className="font-semibold text-green-700 truncate">{receipt.customer.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <span className="text-surface-600 ml-7">Tel:</span>
                      <span className="font-medium text-surface-900">{receipt.customer.phone}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-500 italic">Mijoz ko'rsatilmagan</span>
                  </div>
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
              <div className="flex gap-2 flex-wrap">
                {receipt.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(receipt._id)}
                      className="flex-1 flex items-center justify-center gap-1 sm:gap-2 p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors text-xs sm:text-sm font-medium"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Tasdiqlash</span>
                    </button>
                    <button
                      onClick={() => handleReject(receipt._id)}
                      className="flex-1 flex items-center justify-center gap-1 sm:gap-2 p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-xs sm:text-sm font-medium"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Rad etish</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => openDetailModal(receipt)}
                  className="flex-1 flex items-center justify-center gap-1 sm:gap-2 p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-xs sm:text-sm"
                >
                  <Eye className="w-4 h-4" />
                  <span>Ko'rish</span>
                </button>
                <button
                  onClick={() => handlePrint(receipt)}
                  className="flex items-center justify-center gap-1 sm:gap-2 p-2 bg-surface-50 hover:bg-surface-100 text-surface-600 rounded-lg transition-colors text-xs sm:text-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Print</span>
                </button>
                <button
                  onClick={() => handleDelete(receipt._id)}
                  className="flex items-center justify-center gap-1 sm:gap-2 p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-xs sm:text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">O'chirish</span>
                </button>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm" data-modal="true">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scroll-smooth-instagram momentum-scroll">
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
                {selectedReceipt.items.map((item, index) => {
                  const hasImages = item.product.images && item.product.images.length > 0;
                  const isExpanded = expandedImages[index] || false;
                  const displayImages = isExpanded ? item.product.images : item.product.images?.slice(0, 1);
                  
                  return (
                    <div key={index} className="p-2 sm:p-3 bg-surface-50 rounded-lg">
                      <div className="flex items-start gap-2 sm:gap-3">
                        {/* Product Images */}
                        {hasImages && (
                          <div className="flex-shrink-0">
                            <div className="space-y-1">
                              {displayImages?.map((img, imgIndex) => (
                                <div key={imgIndex} className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-surface-100 border border-surface-200">
                                  <img 
                                    src={`${UPLOADS_URL}${img.path}`} 
                                    alt={item.product.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = '/o5sk1awh.png';
                                    }}
                                  />
                                </div>
                              ))}
                              {/* Show more/less button */}
                              {item.product.images && item.product.images.length > 1 && (
                                <button
                                  onClick={() => setExpandedImages(prev => ({ ...prev, [index]: !isExpanded }))}
                                  className="w-full flex items-center justify-center gap-1 py-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="w-3 h-3" />
                                      <span>Yashirish</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3 h-3" />
                                      <span>+{item.product.images.length - 1} rasm</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm sm:text-base text-surface-900 break-words">{item.product.name}</p>
                          <p className="text-xs sm:text-sm text-surface-500">Kod: {item.product.code}</p>
                          <div className="mt-2 text-right">
                            <p className="font-semibold text-xs sm:text-sm text-surface-900">
                              {item.quantity} x {formatNumber(item.price)}
                            </p>
                            <p className="text-xs sm:text-sm text-brand-600 font-bold">
                              {formatNumber(item.quantity * item.price)} so'm
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
