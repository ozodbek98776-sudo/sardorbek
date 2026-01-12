import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, User, Lock, ArrowRight } from 'lucide-react';
import api from '../utils/api';

export default function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginWithCredentials } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const successMessage = location.state?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await loginWithCredentials(login, password);
      
      const userResponse = await api.get('/auth/me');
      const userData = userResponse.data;
      
      switch (userData.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'cashier':
          navigate('/kassa');
          break;
        case 'helper':
          navigate('/helper');
          break;
        default:
          navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login yoki parol noto\'g\'ri');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-2 sm:p-3 md:p-4 relative overflow-hidden">
      
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-gradient-to-tr from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 sm:w-56 md:w-64 h-48 sm:h-56 md:h-64 bg-gradient-to-r from-blue-300/10 to-indigo-400/10 rounded-full blur-2xl" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23e2e8f0%22%20fill-opacity%3D%220.3%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%221.5%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" />

      <div className="w-full max-w-[280px] sm:max-w-xs md:max-w-sm relative z-10">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-5 md:mb-6 animate-fade-up">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-1 sm:mb-2">
            Admin Panel
          </h1>
          <p className="text-slate-600 font-medium text-xs sm:text-sm">Boshqaruv tizimi</p>
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] sm:text-xs md:text-sm text-slate-500">Xavfsiz kirish</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl border border-white/20 animate-fade-up">
          <div className="text-center mb-4 sm:mb-5 md:mb-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg shadow-blue-500/30">
              <User className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 mb-0.5 sm:mb-1">Xush kelibsiz!</h2>
            <p className="text-slate-600 text-xs sm:text-sm">Login va parolingizni kiriting</p>
          </div>

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-5 md:mb-6 animate-fade-in">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-[10px] sm:text-xs font-bold">✓</span>
                </div>
                <div>
                  <p className="text-emerald-800 font-medium text-xs sm:text-sm">Muvaffaqiyat</p>
                  <p className="text-emerald-700 text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-1">{successMessage}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-5 md:mb-6 animate-fade-in">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-[10px] sm:text-xs font-bold">!</span>
                </div>
                <div>
                  <p className="text-red-800 font-medium text-xs sm:text-sm">Xatolik</p>
                  <p className="text-red-700 text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5 sm:gap-2">
                <User className="w-3 h-3" />
                Login
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Loginingizni kiriting"
                  value={login}
                  onChange={e => setLogin(e.target.value)}
                  className="w-full pl-8 sm:pl-10 pr-3 py-2.5 sm:py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5 sm:gap-2">
                <Lock className="w-3 h-3" />
                Parol
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                  <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Parolingizni kiriting"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2.5 sm:py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 sm:pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg sm:rounded-xl shadow-md shadow-blue-500/25 transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group text-sm sm:text-base"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Kirish...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Kirish</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </button>
          </form>

          <div className="mt-4 sm:mt-5 md:mt-6 text-center">
            <div className="p-2 sm:p-2.5 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-[10px] sm:text-xs text-blue-700 font-medium mb-0.5 sm:mb-1">Kassa xodimi uchun:</p>
              <button
                onClick={() => navigate('/kassa-login')}
                className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Kassa tizimiga kirish →
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 sm:mt-5 md:mt-6 animate-fade-up">
          <p className="text-slate-500 text-[10px] sm:text-xs md:text-sm">
            © 2025 Sardorbek.Furnetura. All rights reserved.
          </p>
          <div className="flex items-center justify-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] md:text-xs text-slate-400">
            <span>Secure</span>
            <div className="w-0.5 sm:w-1 h-0.5 sm:h-1 bg-slate-300 rounded-full" />
            <span>Professional</span>
            <div className="w-0.5 sm:w-1 h-0.5 sm:h-1 bg-slate-300 rounded-full" />
            <span>Reliable</span>
          </div>
        </div>
      </div>
    </div>
  );
}
