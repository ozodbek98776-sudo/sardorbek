import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { Plus, UserPlus, X, Shield, ShoppingCart, Trash2, Phone, Lock, User, Edit, Receipt, Eye, Calendar, DollarSign } from 'lucide-react';
import { User as UserType } from '../../types';
import api from '../../utils/api';
import { useAlert } from '../../hooks/useAlert';
import { formatPhone, getRawPhone, displayPhone, formatNumber } from '../../utils/format';

interface HelperStats {
  _id: string;
  name: string;
  role: string;
  receiptCount: number;
  totalAmount: number;
  bonusPercentage: number;
  totalEarnings: number;
  totalBonus: number;
}

interface HelperReceipt {
  _id: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  total: number;
  createdAt: string;
  helperId: {
    name: string;
  };
}

export default function Helpers() {
  const { showConfirm, showAlert, AlertComponent } = useAlert();
  const [helpers, setHelpers] = useState<UserType[]>([]);
  const [helpersStats, setHelpersStats] = useState<HelperStats[]>([]);
  const [selectedHelperReceipts, setSelectedHelperReceipts] = useState<HelperReceipt[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [selectedHelper, setSelectedHelper] = useState<HelperStats | null>(null);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', phone: '', password: '', role: 'helper' as 'cashier' | 'helper', bonusPercentage: 0
  });

  useEffect(() => { 
    fetchHelpers();
    fetchHelpersStats();
  }, []);

  const fetchHelpers = async () => {
    try {
      const res = await api.get('/users/helpers');
      setHelpers(res.data);
    } catch (err) { console.error('Error fetching helpers:', err); }
    finally { setLoading(false); }
  };

  const fetchHelpersStats = async () => {
    try {
      const res = await api.get('/receipts/helpers-stats');
      setHelpersStats(res.data);
    } catch (err) { 
      console.error('Error fetching helpers stats:', err); 
    }
  };

  const fetchHelperReceipts = async (helperId: string) => {
    setReceiptsLoading(true);
    try {
      const res = await api.get(`/receipts/helper/${helperId}/receipts`);
      setSelectedHelperReceipts(res.data.receipts);
    } catch (err) { 
      console.error('Error fetching helper receipts:', err); 
    } finally {
      setReceiptsLoading(false);
    }
  };

  const openReceiptsModal = (helper: HelperStats) => {
    setSelectedHelper(helper);
    setShowReceiptsModal(true);
    fetchHelperReceipts(helper._id);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({...formData, phone: formatted});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        phone: getRawPhone(formData.phone),
        role: formData.role,
        ...(formData.password && { password: formData.password }),
        ...(formData.role === 'cashier' && { bonusPercentage: formData.bonusPercentage })
      };
      
      if (editingUser) {
        await api.put(`/users/${editingUser._id}`, data);
      } else {
        await api.post('/users', { ...data, password: formData.password });
      }
      fetchHelpers();
      fetchHelpersStats(); // Statistikani yangilash
      closeModal();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  const handleDelete = async (helper: HelperStats) => {
    const confirmed = await showConfirm(
      `"${helper.name}" yordamchisini o'chirishni tasdiqlaysizmi?`, 
      "Yordamchini o'chirish"
    );
    if (!confirmed) return;
    
    try {
      await api.delete(`/users/${helper._id}`);
      
      // Ma'lumotlarni yangilash
      await fetchHelpers();
      await fetchHelpersStats();
      
      showAlert('Yordamchi muvaffaqiyatli o\'chirildi', 'Muvaffaqiyat', 'success');
    } catch (err: any) { 
      console.error('Error deleting helper:', err);
      showAlert(`Yordamchini o'chirishda xatolik: ${err.response?.data?.message || err.message}`, 'Xatolik', 'danger');
    }
  };

  const openEditModal = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      phone: displayPhone(user.phone),
      password: '',
      role: user.role as 'cashier' | 'helper',
      bonusPercentage: (user as any).bonusPercentage || 0
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ name: '', phone: '', password: '', role: 'helper', bonusPercentage: 0 });
  };

  return (
    <div className="min-h-screen bg-surface-50 pb-20 lg:pb-0">
      {AlertComponent}
      <Header 
        title="Yordamchilar"
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Yangi yordamchi</span>
          </button>
        }
      />

      <div className="p-4 lg:p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner text-brand-600 w-8 h-8" />
          </div>
        ) : helpers.length === 0 ? (
          <div className="card flex flex-col items-center py-16">
            <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
              <UserPlus className="w-8 h-8 text-surface-400" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 mb-2">Yordamchilar yo'q</h3>
            <p className="text-surface-500 mb-6">Birinchi yordamchini qo'shing</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Yordamchi qo'shish
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Kassirlar statistikasi */}
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Kassirlar statistikasi</h2>
            {helpersStats.length === 0 ? (
              <p className="text-surface-500 text-center py-8">Hali cheklar chiqarilmagan</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {helpersStats.map(helper => (
                  <div key={helper._id} className="bg-white rounded-xl p-4 hover:bg-surface-50 transition-colors shadow-sm border border-surface-200 relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center text-white font-bold">
                        {helper.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-surface-900">{helper.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          helper.role === 'cashier' ? 'bg-success-100 text-success-700' : 'bg-brand-100 text-brand-700'
                        }`}>
                          {helper.role === 'cashier' ? 'Kassir' : 'Yordamchi'}
                        </span>
                      </div>
                      {/* Tahrirlash, ko'rish va o'chirish tugmalari */}
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            // Helper ma'lumotlarini topish
                            const helperUser = helpers.find(h => h.name === helper.name);
                            if (helperUser) openEditModal(helperUser);
                          }}
                          className="btn-icon-sm hover:bg-brand-100 hover:text-brand-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openReceiptsModal(helper);
                          }}
                          className="btn-icon-sm hover:bg-blue-100 hover:text-blue-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(helper);
                          }}
                          className="btn-icon-sm hover:bg-danger-100 hover:text-danger-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay" onClick={closeModal} />
          <div className="modal w-full max-w-md p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">
                {editingUser ? 'Tahrirlash' : 'Yangi yordamchi'}
              </h3>
              <button onClick={closeModal} className="btn-icon-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Ism</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input type="text" className="input pl-12" placeholder="Yordamchi ismi" value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Telefon raqam</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input type="tel" className="input pl-12" placeholder="+998 (XX) XXX-XX-XX" value={formData.phone}
                    onChange={handlePhoneChange} required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">
                  {editingUser ? 'Yangi parol (ixtiyoriy)' : 'Parol'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input type="password" className="input pl-12" placeholder={editingUser ? "O'zgartirmaslik uchun bo'sh qoldiring" : "Parol"} value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})} {...(!editingUser && { required: true, minLength: 6 })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-3 block">Rol</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, role: 'cashier'})}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.role === 'cashier' 
                        ? 'border-success-500 bg-success-50' 
                        : 'border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <ShoppingCart className={`w-6 h-6 mx-auto mb-2 ${formData.role === 'cashier' ? 'text-success-600' : 'text-surface-400'}`} />
                    <p className="font-medium text-surface-900">Kassir</p>
                    <p className="text-xs text-surface-500">Kassa, qarzlar</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, role: 'helper'})}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.role === 'helper' 
                        ? 'border-brand-500 bg-brand-50' 
                        : 'border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <Shield className={`w-6 h-6 mx-auto mb-2 ${formData.role === 'helper' ? 'text-brand-600' : 'text-surface-400'}`} />
                    <p className="font-medium text-surface-900">Yordamchi</p>
                    <p className="text-xs text-surface-500">QR skaner</p>
                  </button>
                </div>
              </div>
              
              {/* Bonus foizi - faqat kassir uchun */}
              {formData.role === 'cashier' && (
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">
                    Bonus foizi (%)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input 
                      type="number" 
                      className="input pl-12" 
                      placeholder="Masalan: 1 (1% bonus)" 
                      value={formData.bonusPercentage}
                      min="0"
                      max="100"
                      step="0.1"
                      onChange={e => setFormData({...formData, bonusPercentage: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <p className="text-xs text-surface-500 mt-1">
                    Kassir har bir savdodan {formData.bonusPercentage}% bonus oladi
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Bekor qilish</button>
                <button type="submit" className="btn-primary flex-1">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kassir cheklari modali */}
      {showReceiptsModal && selectedHelper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay" onClick={() => setShowReceiptsModal(false)} />
          <div className="modal w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-10">
            <div className="p-6 border-b border-surface-100 bg-gradient-to-r from-brand-50 to-blue-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {selectedHelper.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-surface-900">{selectedHelper.name}</h3>
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                      selectedHelper.role === 'cashier' ? 'bg-success-100 text-success-700' : 'bg-brand-100 text-brand-700'
                    }`}>
                      {selectedHelper.role === 'cashier' ? 'Kassir' : 'Yordamchi'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowReceiptsModal(false)} className="btn-icon-sm hover:bg-white/50">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Statistika kartlari */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                  <div className="flex items-center justify-center mb-2">
                    <Receipt className="w-5 h-5 text-brand-600" />
                  </div>
                  <p className="text-2xl font-bold text-surface-900">{selectedHelper.receiptCount}</p>
                  <p className="text-xs text-surface-500">Cheklar</p>
                </div>
                
                <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                  <div className="flex items-center justify-center mb-2">
                    <DollarSign className="w-5 h-5 text-success-600" />
                  </div>
                  <p className="text-lg font-bold text-success-600">{formatNumber(selectedHelper.totalAmount)}</p>
                  <p className="text-xs text-surface-500">Savdo</p>
                </div>
                
                {selectedHelper.bonusPercentage > 0 && (
                  <>
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                      <div className="flex items-center justify-center mb-2">
                        <span className="text-orange-500 font-bold">%</span>
                      </div>
                      <p className="text-lg font-bold text-orange-600">{selectedHelper.bonusPercentage}%</p>
                      <p className="text-xs text-surface-500">Bonus foizi</p>
                    </div>
                    
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                      <div className="flex items-center justify-center mb-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-lg font-bold text-green-600">
                        {formatNumber((selectedHelper.totalAmount * selectedHelper.bonusPercentage) / 100)}
                      </p>
                      <p className="text-xs text-surface-500">Jami bonus</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              {receiptsLoading ? (
                <div className="flex justify-center py-20">
                  <div className="spinner text-brand-600 w-8 h-8" />
                </div>
              ) : selectedHelperReceipts.length === 0 ? (
                <div className="text-center py-20">
                  <Receipt className="w-12 h-12 mx-auto mb-4 text-surface-400" />
                  <p className="text-surface-500">Cheklar topilmadi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedHelperReceipts.map(receipt => (
                    <div key={receipt._id} className="bg-white rounded-xl p-5 shadow-sm border border-surface-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-brand-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-surface-900">
                              Chek #{receipt._id.slice(-6)}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-surface-500">
                              <Calendar className="w-4 h-4" />
                              {new Date(receipt.createdAt).toLocaleString('uz-UZ')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-brand-600">
                            {formatNumber(receipt.total)}
                          </p>
                          <p className="text-sm text-surface-500">so'm</p>
                        </div>
                      </div>
                      
                      <div className="border-t border-surface-100 pt-4">
                        <h5 className="text-sm font-medium text-surface-700 mb-3">Mahsulotlar:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {receipt.items.map((item, index) => (
                            <div key={index} className="flex justify-between items-center py-2 px-3 bg-surface-50 rounded-lg">
                              <span className="text-sm text-surface-700 font-medium">
                                {item.name}
                              </span>
                              <div className="text-right">
                                <span className="text-sm text-surface-600">
                                  {item.quantity} × {formatNumber(item.price)}
                                </span>
                                <p className="text-sm font-semibold text-surface-900">
                                  {formatNumber(item.price * item.quantity)} so'm
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
