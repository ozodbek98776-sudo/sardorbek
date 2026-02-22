import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, User, Lock, ArrowRight, Shield } from 'lucide-react';
import api from '../utils/api';

export default function Login() {
  const [formData, setFormData] = useState({
    login: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Agar user allaqachon login qilgan bo'lsa, role bo'yicha yo'naltirish
  useEffect(() => {
    if (!authLoading && user) {
      console.log('🔄 User allaqachon login qilgan, redirect qilinmoqda:', user);
      
      // Agar user response wrapper bo'lsa, ichidagi data ni olish
      const userData = (user as any).success && (user as any).data ? (user as any).data : user;
      
      console.log('📦 Actual user data:', userData);
      
      switch (userData.role) {
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        case 'cashier':
          navigate('/kassa/pos', { replace: true });
          break;
        case 'helper':
          navigate('/helper', { replace: true });
          break;
        default:
          console.warn('⚠️ Noma\'lum role:', userData.role);
          // Noma'lum role bo'lsa login sahifasida qolish
          break;
      }
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(formData.login, formData.password);
      
      // Login muvaffaqiyatli bo'lsa, user ma'lumotlarini olish
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      // Redirect parametri bo'lsa, o'sha yerga qaytarish
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect');
      if (redirectUrl) {
        navigate(redirectUrl, { replace: true });
        return;
      }

      // Role bo'yicha yo'naltirish
      switch (userData.role) {
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        case 'cashier':
          navigate('/kassa/pos', { replace: true });
          break;
        case 'helper':
          navigate('/helper', { replace: true });
          break;
        default:
          navigate('/admin', { replace: true });
          break;
      }
      
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || err.message || 'Login ma\'lumotlari noto\'g\'ri');
    } finally {
      setLoading(false);
    }
  };

  // Auth loading holatida
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-brand-100 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-slate-600 text-sm">Tekshirilmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl animate-pulse opacity-20 bg-gradient-to-r from-blue-400 to-purple-600" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl animate-pulse opacity-20 bg-gradient-to-r from-green-400 to-blue-600" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Login Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Shield className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Sardor Furnitura</h1>
              <p className="text-white/80 text-sm">Biznes boshqaruv tizimi</p>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Login Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Login yoki Telefon
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.login}
                    onChange={(e) => setFormData(prev => ({ ...prev, login: e.target.value }))}
                    placeholder="Login yoki telefon raqam"
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50/50"
                    required
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  <div>• <strong>Admin:</strong> login = <code className="bg-gray-100 px-1 rounded">admin</code>, parol = <code className="bg-gray-100 px-1 rounded">admin123</code></div>
                  <div>• <strong>Kassir/Yordamchi:</strong> telefon raqam va parol (admin tomonidan yaratilgan)</div>
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parol
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Parolni kiriting"
                    className="w-full pl-12 pr-12 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Kirish
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Tizimga kirish ma'lumotlari:</h3>
          <div className="space-y-3 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="font-medium text-blue-800">👨‍💼 Admin (Hardcoded)</div>
              <div className="text-blue-600 mt-1">
                Login: <code className="bg-blue-100 px-2 py-1 rounded">admin</code><br />
                Parol: <code className="bg-blue-100 px-2 py-1 rounded">admin123</code>
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="font-medium text-green-800">💰 Kassir & 🔧 Yordamchi</div>
              <div className="text-green-600 mt-1">
                Admin tomonidan yaratilgan telefon va parol bilan kirish
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
