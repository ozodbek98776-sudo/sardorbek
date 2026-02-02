import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { Lock, User, Eye, EyeOff, Save, Shield, Key, Users, Plus, Edit2, Trash2, X } from 'lucide-react';
import api from '../../utils/api';
import { useAlert } from '../../hooks/useAlert';
import { useAuth } from '../../context/AuthContext';

interface KassaUser {
  _id: string;
  name: string;
  login: string;
  role: string;
  createdAt: string;
}

export default function AdminSettings() {
  const { showAlert, AlertComponent } = useAlert();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Kassa foydalanuvchilari uchun state
  const [kassaUsers, setKassaUsers] = useState<KassaUser[]>([]);
  const [loadingKassa, setLoadingKassa] = useState(false);
  const [showKassaModal, setShowKassaModal] = useState(false);
  const [editingKassa, setEditingKassa] = useState<KassaUser | null>(null);
  const [kassaFormData, setKassaFormData] = useState({
    name: '',
    login: '',
    password: ''
  });
  const [showKassaPassword, setShowKassaPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newLogin: user?.login || '',
    newPassword: '',
    confirmPassword: ''
  });

  // Kassa foydalanuvchilarini yuklash
  useEffect(() => {
    loadKassaUsers();
  }, []);

  const loadKassaUsers = async () => {
    try {
      setLoadingKassa(true);
      const response = await api.get('/auth/admin/kassa-users');
      if (response.data.success) {
        setKassaUsers(response.data.users);
      }
    } catch (error: any) {
      console.error('Load kassa users error:', error);
    } finally {
      setLoadingKassa(false);
    }
  };

  const handleKassaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!kassaFormData.name || !kassaFormData.login) {
      showAlert('Barcha maydonlarni to\'ldiring', 'Xatolik', 'danger');
      return;
    }
    
    if (!editingKassa && !kassaFormData.password) {
      showAlert('Parolni kiriting', 'Xatolik', 'danger');
      return;
    }
    
    if (kassaFormData.password && kassaFormData.password.length < 4) {
      showAlert('Parol kamida 4 ta belgidan iborat bo\'lishi kerak', 'Xatolik', 'danger');
      return;
    }
    
    setLoading(true);
    
    try {
      if (editingKassa) {
        // O'zgartirish
        const response = await api.put(`/auth/admin/kassa-users/${editingKassa._id}`, kassaFormData);
        if (response.data.success) {
          showAlert('Kassa foydalanuvchisi muvaffaqiyatli o\'zgartirildi', 'Muvaffaqiyat', 'success');
          loadKassaUsers();
          closeKassaModal();
        }
      } else {
        // Yangi yaratish
        const response = await api.post('/auth/admin/kassa-users', kassaFormData);
        if (response.data.success) {
          showAlert('Kassa foydalanuvchisi muvaffaqiyatli yaratildi', 'Muvaffaqiyat', 'success');
          loadKassaUsers();
          closeKassaModal();
        }
      }
    } catch (error: any) {
      console.error('Kassa user submit error:', error);
      const errorMsg = error.response?.data?.message || 'Xatolik yuz berdi';
      showAlert(errorMsg, 'Xatolik', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKassa = async (id: string) => {
    if (!confirm('Rostdan ham bu kassa foydalanuvchisini o\'chirmoqchimisiz?')) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await api.delete(`/auth/admin/kassa-users/${id}`);
      if (response.data.success) {
        showAlert('Kassa foydalanuvchisi muvaffaqiyatli o\'chirildi', 'Muvaffaqiyat', 'success');
        loadKassaUsers();
      }
    } catch (error: any) {
      console.error('Delete kassa user error:', error);
      const errorMsg = error.response?.data?.message || 'O\'chirishda xatolik';
      showAlert(errorMsg, 'Xatolik', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const openKassaModal = (kassa?: KassaUser) => {
    if (kassa) {
      setEditingKassa(kassa);
      setKassaFormData({
        name: kassa.name,
        login: kassa.login,
        password: ''
      });
    } else {
      setEditingKassa(null);
      setKassaFormData({
        name: '',
        login: '',
        password: ''
      });
    }
    setShowKassaModal(true);
  };

  const closeKassaModal = () => {
    setShowKassaModal(false);
    setEditingKassa(null);
    setKassaFormData({
      name: '',
      login: '',
      password: ''
    });
    setShowKassaPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validatsiya
    if (!formData.currentPassword) {
      showAlert('Joriy parolni kiriting', 'Xatolik', 'danger');
      return;
    }
    
    if (!formData.newLogin) {
      showAlert('Yangi loginni kiriting', 'Xatolik', 'danger');
      return;
    }
    
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      showAlert('Yangi parollar mos kelmadi', 'Xatolik', 'danger');
      return;
    }
    
    if (formData.newPassword && formData.newPassword.length < 6) {
      showAlert('Parol kamida 6 ta belgidan iborat bo\'lishi kerak', 'Xatolik', 'danger');
      return;
    }
    
    setLoading(true);
    
    console.log('🔐 Admin credentials update - Frontend');
    console.log('   Current Password:', formData.currentPassword ? '***' : 'empty');
    console.log('   New Login:', formData.newLogin);
    console.log('   New Password:', formData.newPassword ? '***' : 'empty');
    
    try {
      console.log('📤 Sending request to /auth/admin/credentials');
      const response = await api.put('/auth/admin/credentials', {
        currentPassword: formData.currentPassword,
        newLogin: formData.newLogin,
        newPassword: formData.newPassword || undefined
      });
      
      console.log('📥 Response received:', response.data);
      
      if (response.data.success) {
        console.log('✅ Success response');
        
        // Yangi token ni saqlash
        if (response.data.token) {
          console.log('💾 Saving new token to localStorage');
          localStorage.setItem('token', response.data.token);
          console.log('✅ Token saved');
        }
        
        // User ma'lumotlarini yangilash
        if (response.data.user) {
          console.log('👤 Updating user context:', response.data.user);
          updateUser(response.data.user);
          console.log('✅ User context updated');
        }
        
        showAlert('Login va parol muvaffaqiyatli o\'zgartirildi', 'Muvaffaqiyat', 'success');
        
        // Formani tozalash
        setFormData({
          currentPassword: '',
          newLogin: response.data.user.login,
          newPassword: '',
          confirmPassword: ''
        });
        
        console.log('✅ Form cleared');
      }
    } catch (error: any) {
      console.error('❌ Admin credentials update error:', error);
      console.error('   Error response:', error.response?.data);
      const errorMsg = error.response?.data?.message || 'Login va parolni o\'zgartirishda xatolik';
      showAlert(errorMsg, 'Xatolik', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-100/30 to-slate-100">
      <Header title="Admin Sozlamalari" />
      {AlertComponent}
      
      <div className="p-3 sm:p-4 md:p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          {/* Admin Sozlamalari */}
          <div>
            {/* Header Card */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 mb-3 sm:mb-4 md:mb-6 border border-slate-200">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Shield className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 truncate">Admin Sozlamalari</h2>
                  <p className="text-xs sm:text-sm md:text-base text-slate-600 mt-0.5 sm:mt-1 truncate">Login va parolni o'zgartirish</p>
                </div>
              </div>
            </div>

            {/* Settings Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-slate-200">
              <div className="space-y-4 sm:space-y-5 md:space-y-6">
                {/* Current Password */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Joriy Parol *
                    </div>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 border border-slate-300 rounded-lg sm:rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Joriy parolni kiriting"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-200 pt-4 sm:pt-5 md:pt-6">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-700 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                    <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Yangi Ma'lumotlar
                  </h4>
                </div>

                {/* New Login */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">
                    Yangi Login *
                  </label>
                  <input
                    type="text"
                    value={formData.newLogin}
                    onChange={(e) => setFormData({ ...formData, newLogin: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg sm:rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Yangi loginni kiriting"
                    required
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">
                    Yangi Parol (ixtiyoriy)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 border border-slate-300 rounded-lg sm:rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Yangi parolni kiriting (ixtiyoriy)"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Kamida 6 ta belgi. Bo'sh qoldiring agar parolni o'zgartirmoqchi bo'lmasangiz.
                  </p>
                </div>

                {/* Confirm Password */}
                {formData.newPassword && (
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">
                      Yangi Parolni Tasdiqlash *
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg sm:rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Yangi parolni qayta kiriting"
                      required
                    />
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 sm:py-3.5 md:py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-bold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm sm:text-base">Saqlanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base">O'zgarishlarni Saqlash</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Security Tips - REMOVED (Task 17) */}
          </div>

          {/* Kassa Foydalanuvchilari */}
          <div>
            {/* Header Card */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 mb-3 sm:mb-4 md:mb-6 border border-slate-200">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg flex-shrink-0">
                    <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg md:text-2xl font-bold text-slate-900 truncate">Kassa Foydalanuvchilari</h2>
                    <p className="text-xs sm:text-sm md:text-base text-slate-600 mt-0.5 sm:mt-1 truncate">Kassa login va parollarini boshqarish</p>
                  </div>
                </div>
                <button
                  onClick={() => openKassaModal()}
                  className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base font-bold hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                  <span className="hidden xs:inline">Yangi</span>
                </button>
              </div>
            </div>

            {/* Kassa Users List */}
            <div className="space-y-3 sm:space-y-4">
              {loadingKassa ? (
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200 flex items-center justify-center">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : kassaUsers.length === 0 ? (
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200 text-center">
                  <Users className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300 mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-slate-600 font-medium">Hozircha kassa foydalanuvchilari yo'q</p>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1.5 sm:mt-2">Yangi kassa foydalanuvchisi qo'shish uchun "Yangi" tugmasini bosing</p>
                </div>
              ) : (
                kassaUsers.map((kassa) => (
                  <div key={kassa._id} className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-slate-200 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center shadow-md flex-shrink-0">
                            <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">{kassa.name}</h3>
                            <p className="text-xs sm:text-sm text-slate-500">
                              {new Date(kassa.createdAt).toLocaleDateString('uz-UZ')}
                            </p>
                          </div>
                        </div>
                        <div className="bg-slate-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-200">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs sm:text-sm text-slate-600 font-medium">Login:</span>
                            <span className="text-xs sm:text-sm text-slate-900 font-bold truncate">{kassa.login}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 sm:gap-2 flex-shrink-0">
                        <button
                          onClick={() => openKassaModal(kassa)}
                          className="p-1.5 sm:p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                          title="O'zgartirish"
                        >
                          <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteKassa(kassa._id)}
                          className="p-1.5 sm:p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Kassa Modal */}
      {showKassaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-500 to-green-600 p-4 sm:p-5 md:p-6 rounded-t-xl sm:rounded-t-2xl">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-white truncate">
                  {editingKassa ? 'Kassa Foydalanuvchisini O\'zgartirish' : 'Yangi Kassa Foydalanuvchisi'}
                </h3>
                <button
                  onClick={closeKassaModal}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1.5 sm:p-2 transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleKassaSubmit} className="p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">
                  Ism *
                </label>
                <input
                  type="text"
                  value={kassaFormData.name}
                  onChange={(e) => setKassaFormData({ ...kassaFormData, name: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg sm:rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Ism kiriting"
                  required
                />
              </div>

              {/* Login */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">
                  Login *
                </label>
                <input
                  type="text"
                  value={kassaFormData.login}
                  onChange={(e) => setKassaFormData({ ...kassaFormData, login: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg sm:rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Login kiriting"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                  <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                  <span className="truncate">Parol {editingKassa ? '(ixtiyoriy - o\'zgartirish uchun)' : '*'}</span>
                </label>
                <div className="relative">
                  <input
                    type={showKassaPassword ? 'text' : 'password'}
                    value={kassaFormData.password}
                    onChange={(e) => setKassaFormData({ ...kassaFormData, password: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 border-2 border-slate-300 rounded-lg sm:rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder={editingKassa ? 'Yangi parol kiriting (o\'zgartirish uchun)' : 'Parol kiriting'}
                    required={!editingKassa}
                    minLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKassaPassword(!showKassaPassword)}
                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showKassaPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
                {editingKassa ? (
                  <div className="mt-2 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700 font-medium flex items-start gap-1.5 sm:gap-2">
                      <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5" />
                      <span>Parolni o'zgartirish uchun yangi parol kiriting. Bo'sh qoldiring agar parolni o'zgartirmoqchi bo'lmasangiz.</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">
                    Kamida 4 ta belgi. Kassa panelga kirish uchun ishlatiladi.
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
                <button
                  type="button"
                  onClick={closeKassaModal}
                  className="flex-1 py-2.5 sm:py-3 bg-slate-200 text-slate-700 rounded-lg sm:rounded-xl text-sm sm:text-base font-bold hover:bg-slate-300 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-bold hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saqlanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Saqlash</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
