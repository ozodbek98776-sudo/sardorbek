import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { 
  Receipt, Check, X, Clock, User, CheckCircle2, XCircle, Package, FileText
} from 'lucide-react';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';

interface StaffReceipt {
  _id: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  createdBy: {
    _id: string;
    name: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function StaffReceipts() {
  const { showConfirm, AlertComponent } = useAlert();
  const [receipts, setReceipts] = useState<StaffReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const res = await api.get('/receipts/staff');
      setReceipts(res.data);
    } catch (err) {
      console.error('Error fetching staff receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    const confirmed = await showConfirm("Bu chekni tasdiqlaysizmi?", "Tasdiqlash");
    if (!confirmed) return;
    
    try {
      await api.put(`/receipts/${id}/approve`);
      fetchReceipts();
    } catch (err) {
      console.error('Error approving receipt:', err);
    }
  };

  const handleReject = async (id: string) => {
    const confirmed = await showConfirm("Bu chekni rad etasizmi?", "Rad etish");
    if (!confirmed) return;
    
    try {
      await api.put(`/receipts/${id}/reject`);
      fetchReceipts();
    } catch (err) {
      console.error('Error rejecting receipt:', err);
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    if (statusFilter === 'all') return true;
    return receipt.status === statusFilter;
  });

  const statusConfig = {
    pending: { color: 'warning', label: 'Kutilmoqda', icon: Clock },
    approved: { color: 'success', label: 'Tasdiqlangan', icon: CheckCircle2 },
    rejected: { color: 'danger', label: 'Rad etilgan', icon: XCircle }
  };

  const stats = {
    total: receipts.length,
    pending: receipts.filter(r => r.status === 'pending').length,
    approved: receipts.filter(r => r.status === 'approved').length,
    rejected: receipts.filter(r => r.status === 'rejected').length
  };

  return (
    <div className="min-h-screen bg-surface-50 pb-20 lg:pb-0">
      {AlertComponent}
      <Header 
        title="Xodimlar cheklari"
        filterOptions={[
          { value: 'all', label: 'Barchasi' },
          { value: 'pending', label: 'Kutilmoqda' },
          { value: 'approved', label: 'Tasdiqlangan' },
          { value: 'rejected', label: 'Rad etilgan' }
        ]}
        filterValue={statusFilter}
        onFilterChange={setStatusFilter}
      />

      <div className="p-4 lg:p-6 space-y-6 max-w-[1800px] mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-icon bg-blue-50">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <p className="stat-value">{stats.total}</p>
            <p className="stat-label">Jami cheklar</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-orange-50">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <p className="stat-value">{stats.pending}</p>
            <p className="stat-label">Kutilmoqda</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-green-50">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <p className="stat-value">{stats.approved}</p>
            <p className="stat-label">Tasdiqlangan</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-red-50">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="stat-value">{stats.rejected}</p>
            <p className="stat-label">Rad etilgan</p>
          </div>
        </div>

        {/* Receipts List */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="spinner text-brand-600 w-8 h-8 mb-4" />
              <p className="text-surface-500">Yuklanmoqda...</p>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
                <Receipt className="w-8 h-8 text-surface-400" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-2">Cheklar topilmadi</h3>
              <p className="text-surface-500 text-center max-w-md">
                {statusFilter !== 'all' ? 'Filtr bo\'yicha cheklar topilmadi' : 'Hozircha xodimlar cheklari yo\'q'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-surface-100">
              {filteredReceipts.map(receipt => {
                const config = statusConfig[receipt.status];
                return (
                  <div key={receipt._id} className="p-6 hover:bg-surface-50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <Receipt className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-surface-900">
                              Chek #{receipt._id.slice(-6)}
                            </h4>
                            <span className={`badge badge-${config.color}`}>
                              <config.icon className="w-3 h-3" />
                              {config.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-surface-500">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{receipt.createdBy.name}</span>
                            </div>
                            <span>{new Date(receipt.createdAt).toLocaleDateString('uz-UZ')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-surface-900">
                          {formatNumber(receipt.total)}
                        </p>
                        <p className="text-sm text-surface-500">so'm</p>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="bg-surface-50 rounded-xl p-4 mb-4">
                      <h5 className="font-medium text-surface-700 mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Mahsulotlar ({receipt.items.length})
                      </h5>
                      <div className="space-y-2">
                        {receipt.items.map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-surface-700">{item.name}</span>
                            <div className="flex items-center gap-3 text-surface-500">
                              <span>{item.quantity} x {formatNumber(item.price)}</span>
                              <span className="font-medium text-surface-900">
                                {formatNumber(item.quantity * item.price)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    {receipt.status === 'pending' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReject(receipt._id)}
                          className="btn-secondary flex-1 text-red-600 hover:bg-red-50 hover:border-red-200"
                        >
                          <X className="w-4 h-4" />
                          Rad etish
                        </button>
                        <button
                          onClick={() => handleApprove(receipt._id)}
                          className="btn-primary flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4" />
                          Tasdiqlash
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}