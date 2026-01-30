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
  const [kassaUser, setKassaUser] = useState<{ login: string; name: string } | null>(null);
  const [selectedHelperReceipts, setSelectedHelperReceipts] = useState<HelperReceipt[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAddHelperModal, setShowAddHelperModal] = useState(false);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [selectedHelper, setSelectedHelper] = useState<HelperStats | null>(null);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [editingLoading, setEditingLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', phone: '', password: '', role: 'helper' as 'cashier' | 'helper', bonusPercentage: 0
  });
  const [addHelperData, setAddHelperData] = useState({
    name: '', login: '', phone: '', password: '', confirmPassword: '', role: 'helper' as 'cashier' | 'helper', bonusPercentage: 0
  });
  const [addingHelper, setAddingHelper] = useState(false);

  useEffect(() => { 
    fetchHelpers();
    fetchHelpersStats();
    fetchKassaUser();
  }, []);

  const fetchKassaUser = async () => {
    try {
      const res = await api.get('/auth/admin/kassa-users');
      if (res.data.success && res.data.users.length > 0) {
        // Birinchi kassa foydalanuvchisini olish
        const firstKassa = res.data.users[0];
        setKassaUser({ login: firstKassa.login, name: firstKassa.name });
      }
    } catch (err) {
      console.error('Error fetching kassa user:', err);
    }
  };

  const fetchHelpers = async () => {
    try {
      const res = await api.get('/auth/admin/helpers');
      setHelpers(res.data.users || res.data);
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
    setEditingLoading(true);
    try {
      const data = {
        name: formData.name,
        phone: getRawPhone(formData.phone),
        role: formData.role,
        ...(formData.password && { password: formData.password }),
        ...(formData.role === 'cashier' && { bonusPercentage: formData.bonusPercentage })
      };
      
      if (editingUser) {
        await api.put(`/auth/admin/helpers/${editingUser._id}`, data);
        // Local state ni yangilash - tez
        setHelpersStats(helpersStats.map(h => 
          h._id === editingUser._id 
            ? { ...h, name: formData.name, role: formData.role, bonusPercentage: formData.bonusPercentage }
            : h
        ));
        setHelpers(helpers.map(h =>
          h._id === editingUser._id
            ? { ...h, name: formData.name, role: formData.role, phone: getRawPhone(formData.phone) }
            : h
        ));
      } else {
        await api.post('/users', { ...data, password: formData.password });
        // Yangi yordamchini qo'shish
        const newHelper = {
          _id: Math.random().toString(),
          name: formData.name,
          role: formData.role,
          receiptCount: 0,
          totalAmount: 0,
          bonusPercentage: formData.bonusPercentage || 0,
          totalEarnings: 0,
          totalBonus: 0
        };
        setHelpersStats([...helpersStats, newHelper]);
      }
      
      // 2 sekunddan keyin modal yopiladi
      setTimeout(() => {
        closeModal();
        setEditingLoading(false);
      }, 2000);
    } catch (err: any) {
      setEditingLoading(false);
      alert(err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  const handleDelete = async (helper: HelperStats) => {
    const confirmed = await showConfirm(
      `"${helper.name}" yordamchisini o'chirishni tasdiqlaysizmi?`, 
      "Yordamchini o'chirish"
    );
    if (!confirmed) return;
    
    setDeletingId(helper._id);
    try {
      await api.delete(`/auth/admin/helpers/${helper._id}`);
      
      // Local state ni yangilash - tez
      setHelpersStats(helpersStats.filter(h => h._id !== helper._id));
      setHelpers(helpers.filter(h => h._id !== helper._id));
      
      showAlert('Yordamchi muvaffaqiyatli o\'chirildi', 'Muvaffaqiyat', 'success');
      
      // 2 sekunddan keyin loading state o'chadi
      setTimeout(() => {
        setDeletingId(null);
      }, 2000);
    } catch (err: any) { 
      setDeletingId(null);
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

  const closeAddHelperModal = () => {
    setShowAddHelperModal(false);
    setAddHelperData({ name: '', login: '', phone: '', password: '', confirmPassword: '', role: 'helper', bonusPercentage: 0 });
  };

  const handleAddHelper = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (addHelperData.password !== addHelperData.confirmPassword) {
      showAlert('Parollar mos kelmadi', 'Xatolik', 'danger');
      return;
    }

    if (addHelperData.password.length < 6) {
      showAlert('Parol kamida 6 ta belgidan iborat bo\'lishi kerak', 'Xatolik', 'danger');
      return;
    }

    setAddingHelper(true);
    try {
      const data = {
        name: addHelperData.name,
        login: addHelperData.login,
        phone: getRawPhone(addHelperData.phone),
        password: addHelperData.password
      };
      
      console.log('📤 Xodim yaratish so\'rovi:', data);
      const response = await api.post('/auth/admin/helpers', data);
      console.log('✅ Server javobi:', response.data);
      
      // Yangi xodimni local state ga qo'shish
      const newHelper = {
        _id: response.data.user._id,
        name: response.data.user.name,
        login: response.data.user.login,
        phone: response.data.user.phone,
        role: response.data.user.role,
        receiptCount: 0,
        totalAmount: 0,
        totalEarnings: 0,
        totalBonus: 0
      };
      
      setHelpersStats([...helpersStats, newHelper]);
      
      showAlert('Xodim muvaffaqiyatli qo\'shildi', 'Muvaffaqiyat', 'success');
      
      // 2 sekunddan keyin modal yopiladi
      setTimeout(() => {
        closeAddHelperModal();
        setAddingHelper(false);
      }, 2000);
    } catch (err: any) {
      setAddingHelper(false);
      showAlert(err.response?.data?.message || 'Xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 pb-20 lg:pb-0">
      {AlertComponent}
      <Header 
        title="Yordamchilar"
        actions={
          <button onClick={() => setShowAddHelperModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Yordamchi qo'shish</span>
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
          </div>
        ) : (
          <div className="space-y-6">
            {/* MAXSUS KASSA KODI KARTASI - O'CHIRIB BO'LMAYDIGAN */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-lg border-2 border-purple-400">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Kassa Paneli Kodi</h3>
                    <p className="text-purple-100 text-sm">Admin tomonidan belgilangan login va parol</p>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                  <span className="text-white text-xs font-semibold">Maxsus</span>
                </div>
              </div>
              
              {kassaUser ? (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-100 text-sm font-medium">Ism:</span>
                    <span className="text-white font-bold">{kassaUser.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-100 text-sm font-medium">Login:</span>
                    <span className="text-white font-bold">{kassaUser.login}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-100 text-sm font-medium">Parol:</span>
                    <span className="text-white font-bold">••••••</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/20">
                    <span className="text-purple-100 text-sm font-medium">Rol:</span>
                    <span className="bg-white/20 text-white px-3 py-1 rounded-lg text-xs font-semibold">Kassir</span>
                  </div>
                  
                  {/* Parolni o'zgartirish tugmasi */}
                  <div className="pt-3 border-t border-white/20">
                    <a
                      href="/admin/settings"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg font-semibold transition-all duration-300 hover:shadow-lg"
                    >
                      <Lock className="w-4 h-4" />
                      Parolni o'zgartirish
                    </a>
                  </div>
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <p className="text-white text-sm">Kassa foydalanuvchisi topilmadi</p>
                  <p className="text-purple-100 text-xs mt-2">Admin sozlamalarida kassa yarating</p>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 text-purple-100 text-xs">
                <Lock className="w-4 h-4" />
                <span>Bu karta o'chirib bo'lmaydi. Faqat Admin Sozlamalari → Kassa Foydalanuvchilari bo'limida o'zgartirish mumkin.</span>
              </div>
            </div>

            {/* Kassirlar statistikasi */}
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Kassirlar statistikasi</h2>
            {helpersStats.length === 0 ? (
              <p className="text-surface-500 text-center py-8">Hali cheklar chiqarilmagan</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {helpersStats.map(helper => (
                  <div key={helper._id} className="bg-white rounded-2xl p-6 shadow-sm border border-surface-200 hover:shadow-lg transition-all h-full flex flex-col">
                    {/* Header - Name and Role */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {helper.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-surface-900 truncate" title={helper.name}>{helper.name}</h3>
                        <span className={`inline-block text-xs px-2 py-1 rounded-full font-semibold mt-1 ${
                          helper.role === 'cashier' ? 'bg-success-100 text-success-700' : 'bg-brand-100 text-brand-700'
                        }`}>
                          {helper.role === 'cashier' ? 'Kassir' : 'Yordamchi'}
                        </span>
                      </div>
                    </div>

                    {/* Stats Grid - Uniform */}
                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-surface-100 flex-1">
                      <div className="text-center">
                        <p className="text-xl font-bold text-brand-600">{helper.receiptCount}</p>
                        <p className="text-xs text-surface-500 mt-1">Cheklar</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-success-600">{formatNumber(helper.totalAmount)}</p>
                        <p className="text-xs text-surface-500 mt-1">Savdo</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-orange-600">{helper.bonusPercentage}%</p>
                        <p className="text-xs text-surface-500 mt-1">Bonus</p>
                      </div>
                    </div>

                    {/* Action buttons - Bottom with Shadow Animation */}
                    <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-surface-100">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const helperUser = helpers.find(h => h.name === helper.name);
                          if (helperUser) openEditModal(helperUser);
                        }}
                        className="p-2.5 hover:bg-brand-100 hover:text-brand-600 text-surface-400 rounded-lg transition-all hover:shadow-md hover:-translate-y-0.5"
                        title="Tahrirlash"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openReceiptsModal(helper);
                        }}
                        className="p-2.5 hover:bg-blue-100 hover:text-blue-600 text-surface-400 rounded-lg transition-all hover:shadow-md hover:-translate-y-0.5"
                        title="Cheklar"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(helper);
                        }}
                        disabled={deletingId === helper._id}
                        className="p-2.5 hover:bg-danger-100 hover:text-danger-600 text-surface-400 rounded-lg transition-all hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="O'chirish"
                      >
                        {deletingId === helper._id ? (
                          <div className="w-4 h-4 border-2 border-danger-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Yordamchi qo'shish modali */}
      {showAddHelperModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4 bg-black/50">
          <div className="overlay" onClick={closeAddHelperModal} />
          <div className="modal w-full max-w-[95%] xs:max-w-sm sm:max-w-md p-3 sm:p-4 md:p-5 relative z-50 max-h-[85vh] overflow-y-auto bg-white rounded-xl sm:rounded-2xl shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-2 sm:mb-3 pb-2 sm:pb-3 border-b border-surface-200">
              <h3 className="text-sm sm:text-base font-semibold text-surface-900">Yordamchi qo'shish</h3>
              <button onClick={closeAddHelperModal} className="btn-icon-sm"><X className="w-3 h-3 sm:w-4 sm:h-4" /></button>
            </div>
            <form onSubmit={handleAddHelper} className="space-y-2 sm:space-y-3 flex flex-col h-full">
              <div>
                <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1 sm:mb-2 block">Ism</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-surface-400" />
                  <input type="text" className="input pl-9 text-sm disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Yordamchi ismi" value={addHelperData.name}
                    onChange={e => setAddHelperData({...addHelperData, name: e.target.value})} disabled={addingHelper} required />
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1 sm:mb-2 block">Login</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-surface-400" />
                  <input type="text" className="input pl-9 text-sm disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Login (foydalanuvchi nomi)" value={addHelperData.login}
                    onChange={e => setAddHelperData({...addHelperData, login: e.target.value})} disabled={addingHelper} required />
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1 sm:mb-2 block">Telefon raqam</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-surface-400" />
                  <input type="tel" className="input pl-9 text-sm disabled:opacity-50 disabled:cursor-not-allowed" placeholder="+998 (XX) XXX-XX-XX" value={addHelperData.phone}
                    onChange={e => setAddHelperData({...addHelperData, phone: formatPhone(e.target.value)})} disabled={addingHelper} required />
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1 sm:mb-2 block">Parol</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-surface-400" />
                  <input type="password" className="input pl-9 text-sm disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Kamida 6 ta belgi" value={addHelperData.password}
                    onChange={e => setAddHelperData({...addHelperData, password: e.target.value})} disabled={addingHelper} required minLength={6} />
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1 sm:mb-2 block">Parolni tasdiqlash</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-surface-400" />
                  <input type="password" className="input pl-9 text-sm disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Parolni qayta kiriting" value={addHelperData.confirmPassword}
                    onChange={e => setAddHelperData({...addHelperData, confirmPassword: e.target.value})} disabled={addingHelper} required minLength={6} />
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-surface-700 mb-2 block">Rol</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddHelperData({...addHelperData, role: 'cashier'})}
                    disabled={addingHelper}
                    className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                      addHelperData.role === 'cashier' 
                        ? 'border-success-500 bg-success-50' 
                        : 'border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <ShoppingCart className={`w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 ${addHelperData.role === 'cashier' ? 'text-success-600' : 'text-surface-400'}`} />
                    <p className="font-medium text-surface-900">Kassir</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddHelperData({...addHelperData, role: 'helper'})}
                    disabled={addingHelper}
                    className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                      addHelperData.role === 'helper' 
                        ? 'border-brand-500 bg-brand-50' 
                        : 'border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <Shield className={`w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 ${addHelperData.role === 'helper' ? 'text-brand-600' : 'text-surface-400'}`} />
                    <p className="font-medium text-surface-900">Yordamchi</p>
                  </button>
                </div>
              </div>

              {/* Bonus foizi - faqat kassir uchun */}
              {addHelperData.role === 'cashier' && (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1 sm:mb-2 block">
                    Bonus foizi (%)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-surface-400" />
                    <input 
                      type="number" 
                      className="input pl-9 text-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                      placeholder="Masalan: 1" 
                      value={addHelperData.bonusPercentage}
                      min="0"
                      max="100"
                      step="0.1"
                      disabled={addingHelper}
                      onChange={e => setAddHelperData({...addHelperData, bonusPercentage: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <p className="text-[10px] sm:text-xs text-surface-500 mt-0.5 sm:mt-1">
                    {addHelperData.bonusPercentage}% bonus
                  </p>
                </div>
              )}

              {/* Action Buttons - Bottom */}
              <div className="flex gap-2 pt-4 mt-auto border-t border-surface-100">
                <button type="button" onClick={closeAddHelperModal} disabled={addingHelper} className="btn-secondary flex-1 text-xs sm:text-sm py-1.5 sm:py-2 disabled:opacity-50 disabled:cursor-not-allowed">Bekor</button>
                <button type="submit" disabled={addingHelper} className="btn-primary flex-1 text-xs sm:text-sm py-1.5 sm:py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {addingHelper ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Qo'shilmoqda...</span>
                    </>
                  ) : (
                    'Qo\'shish'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4 bg-black/50">
          <div className="overlay" onClick={closeModal} />
          <div className="modal w-full max-w-[95%] xs:max-w-sm sm:max-w-md p-3 sm:p-4 md:p-5 relative z-50 max-h-[85vh] overflow-y-auto bg-white rounded-xl sm:rounded-2xl shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-2 sm:mb-3 pb-2 sm:pb-3 border-b border-surface-200">
              <h3 className="text-sm sm:text-base font-semibold text-surface-900">
                {editingUser ? 'Tahrirlash' : 'Yangi yordamchi'}
              </h3>
              <button onClick={closeModal} className="btn-icon-sm"><X className="w-3 h-3 sm:w-4 sm:h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3 flex flex-col h-full">
              <div>
                <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1 sm:mb-2 block">Ism</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-surface-400" />
                  <input type="text" className="input pl-9 text-sm" placeholder="Yordamchi ismi" value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1 sm:mb-2 block">Telefon raqam</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-surface-400" />
                  <input type="tel" className="input pl-9 text-sm" placeholder="+998 (XX) XXX-XX-XX" value={formData.phone}
                    onChange={handlePhoneChange} required />
                </div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1 sm:mb-2 block">
                  {editingUser ? 'Yangi parol (ixtiyoriy)' : 'Parol'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-surface-400" />
                  <input type="password" className="input pl-9 text-sm" placeholder={editingUser ? "O'zgartirmaslik uchun bo'sh qoldiring" : "Parol"} value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})} {...(!editingUser && { required: true, minLength: 6 })} />
                </div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-surface-700 mb-2 block">Rol</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, role: 'cashier'})}
                    className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-xs sm:text-sm ${
                      formData.role === 'cashier' 
                        ? 'border-success-500 bg-success-50' 
                        : 'border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <ShoppingCart className={`w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 ${formData.role === 'cashier' ? 'text-success-600' : 'text-surface-400'}`} />
                    <p className="font-medium text-surface-900">Kassir</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, role: 'helper'})}
                    className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-xs sm:text-sm ${
                      formData.role === 'helper' 
                        ? 'border-brand-500 bg-brand-50' 
                        : 'border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <Shield className={`w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 ${formData.role === 'helper' ? 'text-brand-600' : 'text-surface-400'}`} />
                    <p className="font-medium text-surface-900">Yordamchi</p>
                  </button>
                </div>
              </div>
              
              {/* Bonus foizi - faqat kassir uchun */}
              {formData.role === 'cashier' && (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1 sm:mb-2 block">
                    Bonus foizi (%)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-surface-400" />
                    <input 
                      type="number" 
                      className="input pl-9 text-sm" 
                      placeholder="Masalan: 1" 
                      value={formData.bonusPercentage}
                      min="0"
                      max="100"
                      step="0.1"
                      onChange={e => setFormData({...formData, bonusPercentage: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <p className="text-[10px] sm:text-xs text-surface-500 mt-0.5 sm:mt-1">
                    {formData.bonusPercentage}% bonus
                  </p>
                </div>
              )}

              {/* Action Buttons - Bottom */}
              <div className="flex gap-2 pt-4 mt-auto border-t border-surface-100">
                <button type="button" onClick={closeModal} disabled={editingLoading} className="btn-secondary flex-1 text-xs sm:text-sm py-1.5 sm:py-2 disabled:opacity-50 disabled:cursor-not-allowed">Bekor</button>
                <button type="submit" disabled={editingLoading} className="btn-primary flex-1 text-xs sm:text-sm py-1.5 sm:py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {editingLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saqlanmoqda...</span>
                    </>
                  ) : (
                    'Saqlash'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kassir cheklari modali */}
      {showReceiptsModal && selectedHelper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4">
          <div className="overlay" onClick={() => setShowReceiptsModal(false)} />
          <div className="modal w-full max-w-[98%] sm:max-w-[95%] md:max-w-4xl max-h-[90vh] overflow-hidden relative z-10">
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
