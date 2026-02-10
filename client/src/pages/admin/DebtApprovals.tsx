import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { CheckCircle2, X, AlertTriangle, User, Calendar, DollarSign, ArrowLeft, CreditCard } from 'lucide-react';
import { Debt } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { UniversalPageHeader } from '../../components/common';

export default function DebtApprovals() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const navigate = useNavigate();
  const [pendingDebts, setPendingDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingDebts();
  }, []);

  const fetchPendingDebts = async () => {
    try {
      const res = await api.get('/debts?status=pending_approval');
      setPendingDebts(res.data);
    } catch (err) {
      console.error('Error fetching pending debts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (debtId: string) => {
    setApprovingId(debtId);
    try {
      await api.post(`/debts/${debtId}/approve`);
      
      // Local state ni yangilash - API call o'rniga
      setPendingDebts(pendingDebts.filter(d => d._id !== debtId));
      
      showAlert('Qarz muvaffaqiyatli tasdiqlandi', 'Muvaffaqiyat', 'success');
    } catch (err: any) {
      setApprovingId(null);
      console.error('Error approving debt:', err);
      showAlert(err.response?.data?.message || 'Xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  const handleReject = async (debtId: string) => {
    const confirmed = await showConfirm(
      "Bu qarzni rad etasizmi?",
      "Rad etish"
    );
    if (!confirmed) return;

    setRejectingId(debtId);
    try {
      await api.post(`/debts/${debtId}/reject`);
      
      // Local state ni yangilash - API call o'rniga
      setPendingDebts(pendingDebts.filter(d => d._id !== debtId));
      
      showAlert('Qarz rad etildi', 'Muvaffaqiyat', 'success');
    } catch (err: any) {
      setRejectingId(null);
      console.error('Error rejecting debt:', err);
      showAlert(err.response?.data?.message || 'Xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 w-full h-full">
      {AlertComponent}
      
      <Header 
        title="Qarz tasdiqlash"
        actions={
          <button 
            onClick={() => navigate('/admin/debts')}
            className="btn-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            Orqaga
          </button>
        }
      />

      <div className="p-1 sm:p-2 space-y-2 sm:space-y-3 w-full">
        {/* Header Info */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 sm:p-4 border border-amber-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-amber-900">Tasdiqlashni kutayotgan qarzlar</h2>
              <p className="text-sm text-amber-700">
                {pendingDebts.length} ta qarz kassachi tomonidan qo'shilgan va sizning tasdiqlashingizni kutmoqda
              </p>
            </div>
          </div>
        </div>

        {/* Debts List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="spinner text-brand-600 w-8 h-8 mb-4" />
            <p className="text-surface-500">Yuklanmoqda...</p>
          </div>
        ) : pendingDebts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 mb-2">Barcha qarzlar ko'rib chiqildi</h3>
            <p className="text-surface-500 text-center max-w-md">
              Hozirda tasdiqlashni kutayotgan qarzlar yo'q. Yangi qarzlar qo'shilganda bu yerda ko'rinadi.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingDebts.map(debt => (
              <div key={debt._id} className="bg-white rounded-2xl p-6 border border-amber-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-surface-900 text-lg">{debt.customer?.name}</h4>
                      <p className="text-surface-500">{debt.customer?.phone}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-surface-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Muddat: {new Date(debt.dueDate).toLocaleDateString('uz-UZ')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-medium text-lg">{formatNumber(debt.amount)} so'm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-amber">
                    <AlertTriangle className="w-3 h-3" />
                    Kutilmoqda
                  </span>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {debt.description && (
                    <div className="bg-surface-50 rounded-xl p-4">
                      <h5 className="font-medium text-surface-700 mb-2">Izoh</h5>
                      <p className="text-surface-600 text-sm">{debt.description}</p>
                    </div>
                  )}
                  
                  {debt.collateral && (
                    <div className="bg-amber-50 rounded-xl p-4">
                      <h5 className="font-medium text-amber-700 mb-2">Zalog</h5>
                      <p className="text-amber-600 text-sm">{debt.collateral}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReject(debt._id)}
                    disabled={rejectingId === debt._id || approvingId === debt._id}
                    className="btn-secondary flex-1 text-red-600 hover:bg-red-50 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {rejectingId === debt._id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        <span>Rad etilmoqda...</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        Rad etish
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleApprove(debt._id)}
                    disabled={approvingId === debt._id || rejectingId === debt._id}
                    className="btn-primary flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {approvingId === debt._id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Tasdiqlanamoqda...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Tasdiqlash
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}