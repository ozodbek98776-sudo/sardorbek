import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { 
  Receipt, User, Package, Calendar, Search, Filter, ChevronDown, ChevronUp,
  DollarSign, Clock, TrendingUp, FileText, Eye, Download, Printer, Trash2
} from 'lucide-react';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { printReceipt, ReceiptData } from '../../utils/receipt';
import { CartItem } from '../../types';

interface HelperReceipt {
  _id: string;
  receiptNumber: string;
  items: Array<{
    _id: string;
    name: string;
    code: string;
    quantity: number;
    price: number;
    total: number;
    image: string | null;
  }>;
  itemsCount: number;
  totalQuantity: number;
  total: number;
  paymentMethod: string;
  isPaid: boolean;
  status: string;
  helper: {
    _id: string;
    name: string;
    role: string;
    bonusPercentage: number;
  } | null;
  bonusAmount: number;
  createdAt: string;
  updatedAt: string;
}

interface Helper {
  _id: string;
  name: string;
  role: string;
  receiptCount: number;
  totalAmount: number;
  bonusPercentage: number;
  totalBonus: number;
}

export default function StaffReceipts() {
  const { showAlert, AlertComponent } = useAlert();
  const [receipts, setReceipts] = useState<HelperReceipt[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHelper, setSelectedHelper] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [printingReceipt, setPrintingReceipt] = useState<string | null>(null);
  const [deletingReceipt, setDeletingReceipt] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalReceipts: 0,
    totalAmount: 0,
    totalItems: 0
  });

  useEffect(() => {
    fetchHelpers();
    fetchReceipts();
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [selectedHelper, startDate, endDate, searchQuery, page]);

  const fetchHelpers = async () => {
    try {
      const res = await api.get('/receipts/helpers-stats');
      setHelpers(res.data);
    } catch (err) {
      console.error('Error fetching helpers:', err);
    }
  };

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (selectedHelper) params.append('helperId', selectedHelper);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (searchQuery) params.append('search', searchQuery);

      const res = await api.get(`/receipts/all-helper-receipts?${params}`);
      setReceipts(res.data.receipts);
      setTotalPages(res.data.pagination.totalPages);
      setSummary(res.data.summary);
    } catch (err) {
      console.error('Error fetching receipts:', err);
      showAlert('Cheklar yuklanmadi', 'Xatolik', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const toggleReceipt = (id: string) => {
    setExpandedReceipt(expandedReceipt === id ? null : id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const clearFilters = () => {
    setSelectedHelper('');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setPage(1);
  };

  const handlePrintReceipt = async (receipt: HelperReceipt) => {
    try {
      setPrintingReceipt(receipt._id);
      
      // Transform helper receipt data to ReceiptData format
      const receiptData: ReceiptData = {
        items: receipt.items.map(item => ({
          _id: item._id,
          name: item.name,
          code: item.code,
          price: item.price,
          cartQuantity: item.quantity,
          quantity: item.quantity,
          warehouse: 'main',
          category: '',
          image: item.image || undefined
        } as CartItem)),
        total: receipt.total,
        paymentMethod: receipt.paymentMethod as 'cash' | 'card' | 'click',
        receiptNumber: receipt.receiptNumber,
        cashier: receipt.helper?.name || 'Xodim',
        date: new Date(receipt.createdAt)
      };

      const success = await printReceipt(receiptData, () => {
        console.log('Chek chiqarildi:', receipt.receiptNumber);
      });

      if (success) {
        showAlert('Chek muvaffaqiyatli chiqarildi', 'Muvaffaqiyat', 'success');
      } else {
        showAlert('Chek chiqarishda xatolik yuz berdi', 'Xatolik', 'warning');
      }
    } catch (error) {
      console.error('Print error:', error);
      showAlert('Chek chiqarishda xatolik yuz berdi', 'Xatolik', 'danger');
    } finally {
      setPrintingReceipt(null);
    }
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    try {
      setDeletingReceipt(receiptId);
      
      const res = await api.delete(`/receipts/helper-receipt/${receiptId}`);
      
      if (res.data.success) {
        showAlert('Chek muvaffaqiyatli o\'chirildi', 'Muvaffaqiyat', 'success');
        // Ro'yxatni yangilash
        fetchReceipts();
        fetchHelpers();
      } else {
        showAlert(res.data.message || 'Chekni o\'chirishda xatolik', 'Xatolik', 'danger');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      showAlert(
        error.response?.data?.message || 'Chekni o\'chirishda xatolik yuz berdi', 
        'Xatolik', 
        'danger'
      );
    } finally {
      setDeletingReceipt(null);
      setShowDeleteConfirm(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-100/30 to-slate-100 pb-20 lg:pb-0">
      {AlertComponent}
      <Header title="Xodimlar cheklari" />

      <div className="p-4 lg:p-6 space-y-6 max-w-[1800px] mx-auto">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Jami cheklar</p>
                <h3 className="text-3xl font-bold text-slate-900">{summary.totalReceipts}</h3>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Receipt className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Jami summa</p>
                <h3 className="text-3xl font-bold text-slate-900">{formatNumber(summary.totalAmount)}</h3>
                <p className="text-slate-500 text-xs mt-1">UZS</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Jami mahsulotlar</p>
                <h3 className="text-3xl font-bold text-slate-900">{summary.totalItems}</h3>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Package className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200/60">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-bold text-slate-900">Filtrlar</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Helper Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Xodim
              </label>
              <select
                value={selectedHelper}
                onChange={(e) => { setSelectedHelper(e.target.value); setPage(1); }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Barchasi</option>
                {helpers.map(helper => (
                  <option key={helper._id} value={helper._id}>
                    {helper.name} ({helper.receiptCount} ta chek)
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Boshlanish
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Tugash
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Qidiruv
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Chek raqami yoki mahsulot"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {(selectedHelper || startDate || endDate || searchQuery) && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
            >
              Filtrlarni tozalash
            </button>
          )}
        </div>

        {/* Receipts Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200/60 animate-pulse">
                <div className="h-6 bg-slate-200 rounded mb-4 w-1/2" />
                <div className="h-4 bg-slate-200 rounded mb-2" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : receipts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-lg border border-slate-200/60 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Cheklar topilmadi</h3>
            <p className="text-slate-600">Tanlangan filtrlar bo'yicha cheklar mavjud emas</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {receipts.map(receipt => (
                <div
                  key={receipt._id}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Receipt className="w-4 h-4 flex-shrink-0" />
                        <span className="font-bold text-sm truncate">{receipt.receiptNumber}</span>
                        <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium flex-shrink-0">
                          {receipt.itemsCount} ta
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handlePrintReceipt(receipt)}
                          disabled={printingReceipt === receipt._id}
                          className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Chekni chiqarish"
                        >
                          {printingReceipt === receipt._id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Printer className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(receipt._id)}
                          disabled={deletingReceipt === receipt._id}
                          className="p-1.5 bg-red-500/80 hover:bg-red-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Chekni o'chirish"
                        >
                          {deletingReceipt === receipt._id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-100 text-xs mt-1.5">
                      <Clock className="w-3 h-3" />
                      <span className="truncate">{formatDate(receipt.createdAt)}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3 space-y-3">
                    {/* Helper Info */}
                    {receipt.helper && (
                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {receipt.helper.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-xs truncate">{receipt.helper.name}</p>
                          <p className="text-[10px] text-slate-600 capitalize truncate">{receipt.helper.role}</p>
                        </div>
                        {receipt.helper.bonusPercentage > 0 && (
                          <div className="text-right flex-shrink-0">
                            <p className="text-[10px] text-slate-600">Bonus</p>
                            <p className="font-bold text-emerald-600 text-xs">{receipt.helper.bonusPercentage}%</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Total Amount */}
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-emerald-700 font-medium mb-0.5">Jami summa</p>
                        <p className="text-xl font-bold text-emerald-900 truncate">{formatNumber(receipt.total)}</p>
                        <p className="text-[10px] text-emerald-600">UZS</p>
                      </div>
                      {receipt.bonusAmount > 0 && (
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-[10px] text-emerald-700 font-medium mb-0.5">Bonus</p>
                          <p className="text-base font-bold text-emerald-900">{formatNumber(receipt.bonusAmount)}</p>
                        </div>
                      )}
                    </div>

                    {/* Items Preview */}
                    <div>
                      <button
                        onClick={() => toggleReceipt(receipt._id)}
                        className="w-full flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Package className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                          <span className="font-medium text-slate-900 text-xs truncate">
                            Mahsulotlar ({receipt.totalQuantity} dona)
                          </span>
                        </div>
                        {expandedReceipt === receipt._id ? (
                          <ChevronUp className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        )}
                      </button>

                      {expandedReceipt === receipt._id && (
                        <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto">
                          {receipt.items.map(item => (
                            <div
                              key={item._id}
                              className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-all"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 text-xs truncate">{item.name}</p>
                                <p className="text-[10px] text-slate-600 truncate">Kod: {item.code}</p>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="text-xs text-slate-600 truncate">
                                    {item.quantity} x {formatNumber(item.price)}
                                  </span>
                                  <span className="text-xs font-bold text-blue-600 flex-shrink-0">
                                    = {formatNumber(item.total)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Oldingi
                </button>
                <span className="px-4 py-2 text-slate-700 font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Keyingi
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Chekni o'chirish</h3>
                <p className="text-sm text-slate-600">Bu amalni qaytarib bo'lmaydi</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-800 mb-2">
                <strong>Diqqat!</strong> Chekni o'chirsangiz:
              </p>
              <ul className="text-sm text-red-700 space-y-1 ml-4">
                <li>• Mahsulot miqdorlari qaytariladi</li>
                <li>• Xodim bonusi ayriladi</li>
                <li>• Statistika yangilanadi</li>
                <li>• Bu amalni bekor qilib bo'lmaydi</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deletingReceipt === showDeleteConfirm}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all disabled:opacity-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => handleDeleteReceipt(showDeleteConfirm)}
                disabled={deletingReceipt === showDeleteConfirm}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingReceipt === showDeleteConfirm ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    O'chirilmoqda...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    O'chirish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
