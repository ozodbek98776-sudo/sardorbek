import { useState, useEffect } from 'react';
import { X, Wallet, User, Phone, DollarSign, CheckCircle } from 'lucide-react';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';

interface Debt {
  _id: string;
  customer: {
    _id: string;
    name: string;
    phone: string;
  };
  amount: number; // Jami qarz
  paidAmount: number; // To'langan summa
  isPaid: boolean;
  status: string;
}

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}

export function DebtPaymentModal({ 
  isOpen, 
  onClose,
  onPaymentSuccess
}: DebtPaymentModalProps) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal scroll lock
  useModalScrollLock(isOpen);

  // Fetch debts
  useEffect(() => {
    if (isOpen) {
      fetchDebts();
    }
  }, [isOpen]);

  const fetchDebts = async () => {
    setLoading(true);
    try {
      // Faqat menga qarzdorlarni olish (receivable)
      const response = await api.get('/debts', {
        params: { 
          type: 'receivable' // Menga qarzdorlar
        }
      });
      
      console.log('📊 Debts API response:', response.data);
      
      // Handle response format from serviceWrapper (xuddi Debts.tsx dagi kabi)
      let debtsData = [];
      
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        // ServiceWrapper format: { success: true, data: [...] }
        debtsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        // Direct array format (fallback)
        debtsData = response.data;
      } else {
        console.warn('Unexpected debts API response format:', response.data);
        debtsData = [];
      }
      
      console.log('📊 Parsed debts data:', debtsData.length, 'items');
      
      // Faqat to'lanmagan qarzlarni ko'rsatish
      const unpaidDebts = debtsData.filter((debt: Debt) => !debt.isPaid);
      
      console.log('📊 Filtered unpaid debts:', unpaidDebts.length, 'items');
      
      setDebts(unpaidDebts);
    } catch (error) {
      console.error('❌ Error fetching debts:', error);
      setDebts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDebt = (debt: Debt) => {
    setSelectedDebt(debt);
    setPaymentAmount('');
  };

  const handleSetFullAmount = () => {
    if (selectedDebt) {
      const remainingAmount = selectedDebt.amount - selectedDebt.paidAmount;
      setPaymentAmount(remainingAmount.toString());
    }
  };

  const handlePayment = async () => {
    if (!selectedDebt || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    const remainingAmount = selectedDebt.amount - selectedDebt.paidAmount;
    
    if (isNaN(amount) || amount <= 0) {
      alert('To\'lov summasini to\'g\'ri kiriting');
      return;
    }

    if (amount > remainingAmount) {
      alert('To\'lov summasi qarz summasidan oshib ketdi');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/debts/${selectedDebt._id}/payment`, {
        amount,
        method: 'cash'
      });

      // Success
      alert('To\'lov muvaffaqiyatli qabul qilindi!');
      setSelectedDebt(null);
      setPaymentAmount('');
      fetchDebts(); // Refresh list
      
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(error.response?.data?.message || 'To\'lov qabul qilinmadi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedDebt(null);
    setPaymentAmount('');
    setSearchQuery('');
    onClose();
  };

  // Filter debts by search
  const filteredDebts = debts.filter(debt => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      debt.customer.name.toLowerCase().includes(query) ||
      debt.customer.phone.includes(query)
    );
  });

  if (!isOpen) return null;

  return (
    <div 
      data-modal="true"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slideUp"
        style={{ marginBottom: '80px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold">Qarz to'lash</h3>
          </div>
          <button 
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scroll-smooth-instagram momentum-scroll p-6">
          {!selectedDebt ? (
            // Debts List
            <div className="space-y-4">
              {/* Search */}
              <input
                type="text"
                placeholder="Ism yoki telefon raqam bo'yicha qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-green-500 focus:outline-none"
              />

              {/* Loading */}
              {loading && (
                <div className="text-center py-8 text-slate-500">
                  Yuklanmoqda...
                </div>
              )}

              {/* Empty */}
              {!loading && filteredDebts.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  {searchQuery ? 'Natija topilmadi' : 'Qarzlar yo\'q'}
                </div>
              )}

              {/* Debts */}
              {!loading && filteredDebts.map(debt => (
                <button
                  key={debt._id}
                  onClick={() => handleSelectDebt(debt)}
                  className="w-full bg-slate-50 hover:bg-green-50 border-2 border-slate-200 hover:border-green-300 rounded-xl p-4 transition-all text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-slate-500" />
                        <h4 className="font-bold text-slate-900">{debt.customer.name}</h4>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-3 h-3" />
                        <span>{debt.customer.phone}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-1">Qolgan qarz</p>
                      <p className="text-lg font-bold text-red-600">
                        {formatNumber(debt.amount - debt.paidAmount)} so'm
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // Payment Form
            <div className="space-y-6">
              {/* Selected Customer */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-green-600" />
                  <h4 className="font-bold text-slate-900 text-lg">{selectedDebt.customer.name}</h4>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4" />
                  <span>{selectedDebt.customer.phone}</span>
                </div>
              </div>

              {/* Debt Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">Jami qarz</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatNumber(selectedDebt.amount)} so'm
                  </p>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-xs text-red-600 mb-1">Qolgan qarz</p>
                  <p className="text-lg font-bold text-red-600">
                    {formatNumber(selectedDebt.amount - selectedDebt.paidAmount)} so'm
                  </p>
                </div>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  To'lov summasi
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="Summa kiriting"
                    className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-green-500 focus:outline-none text-lg font-semibold"
                  />
                </div>
                
                {/* To'liq tugma */}
                <button
                  onClick={handleSetFullAmount}
                  className="mt-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-semibold rounded-lg transition-all text-sm"
                >
                  To'liq ({formatNumber(selectedDebt.amount - selectedDebt.paidAmount)} so'm)
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedDebt(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Orqaga
                </button>
                <button
                  onClick={handlePayment}
                  disabled={!paymentAmount || submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  {submitting ? 'Yuklanmoqda...' : 'To\'lovni qabul qilish'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
