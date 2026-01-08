import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, ArrowRight, Calculator, Shield } from 'lucide-react';
import api from '../utils/api';

export default function KassaLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Avval server bilan bog'lanishga harakat qilish
      try {
        const response = await api.post('/kassa-auth/login', {
          username: username.trim(),
          password: password
        });
        
        if (response.data.success) {
          // Server login muvaffaqiyatli - TO'LIQ BLOKLASH REJIMI
          const loginData = {
            loggedIn: true,
            timestamp: Date.now(),
            user: 'kassa',
            username: response.data.data.username,
            sessionToken: response.data.data.sessionToken,
            expiresAt: response.data.data.expiresAt,
            locked: true // Qo'shimcha bloklash belgisi
          };
          
          localStorage.setItem('kassaLoggedIn', JSON.stringify(loginData));
          
          // Browser history ni tozalash va bloklash
          window.history.replaceState(null, '', '/kassa');
          
          navigate('/kassa', { replace: true });
          return;
        } else {
          setError(response.data.message || 'Login xatosi');
          return;
        }
      } catch (serverError) {
        console.log('Server bilan bog\'lanish xatosi, offline login tekshiruvi...');
        
        // Server bilan bog'lanish xatosi - offline login
        const validCredentials = [
          { username: 'alisher', password: '2011' },
          { username: 'kassa1', password: 'kassa123' },
          { username: 'admin', password: 'admin123' }
        ];
        
        const user = validCredentials.find(u => u.username === username.trim() && u.password === password);
        
        if (user) {
          // Offline login muvaffaqiyatli - TO'LIQ BLOKLASH REJIMI
          const loginData = {
            loggedIn: true,
            timestamp: Date.now(),
            user: 'kassa',
            username: user.username,
            offline: true, // Offline rejim belgisi
            locked: true // Qo'shimcha bloklash belgisi
          };
          
          localStorage.setItem('kassaLoggedIn', JSON.stringify(loginData));
          
          // Browser history ni tozalash va bloklash
          window.history.replaceState(null, '', '/kassa');
          
          navigate('/kassa', { replace: true });
          return;
        } else {
          setError('Noto\'g\'ri login yoki parol');
          return;
        }
      }
      
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-blue-300/10 to-indigo-400/10 rounded-full blur-2xl" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23e2e8f0%22%20fill-opacity%3D%220.3%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%221.5%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" />

      <div className="w-full max-w-sm relative z-10">
        {/* Header */}
        <div className="text-center mb-6 animate-fade-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl shadow-blue-500/25 mb-4 relative">
            <Calculator className="w-8 h-8 text-white" />
            <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
              <Shield className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
            Kassa Tizimi
          </h1>
          <p className="text-slate-600 font-medium">Sardor Furnitura - Kassa Paneli</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm text-slate-500">Xavfsiz tizim</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 animate-fade-up">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Kassa tizimiga kirish</h2>
            <p className="text-slate-600 text-sm">Hisobingiz bilan tizimga kiring</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <div>
                  <p className="text-red-800 font-medium text-sm">Xatolik</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Phone className="w-3 h-3" />
                Login
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="alisher"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Lock className="w-3 h-3" />
                Parol
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="2011"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-blue-500/25 transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Kirish...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Kirish</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <div className="pt-4 border-t border-slate-200">
                <div className="bg-blue-50 rounded-2xl p-4 mb-4">
                  <p className="text-blue-700 font-medium text-sm mb-3">
                    Kassa xodimi uchun:
                  </p>
                  <a 
                    href="/login" 
                    className="inline-flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors text-base underline decoration-2 underline-offset-4 hover:decoration-blue-700"
                  >
                    <span>Admin panel →</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 animate-fade-up">
          <p className="text-slate-500 text-sm">
            © 2025 Sardorbek.Furnetura. All rights reserved.
          </p>
          <div className="flex items-center justify-center gap-3 mt-2 text-xs text-slate-400">
            <span>Secure</span>
            <div className="w-1 h-1 bg-slate-300 rounded-full" />
            <span>Professional</span>
            <div className="w-1 h-1 bg-slate-300 rounded-full" />
            <span>Reliable</span>
          </div>
        </div>
      </div>
    </div>
  );
}