import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, ArrowRight, Calculator } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/25 mb-4">
            <Calculator className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Kassa Tizimi</h1>
          <p className="text-gray-500">Sardor Furnitura - Kassa Paneli</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
            Kassa tizimiga kirish
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Login</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="alisher"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Parol</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="2011"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-3.5 text-base font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Kirish</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700 font-medium mb-2">Kassa ma'lumotlari:</p>
            <div className="space-y-1">
              <p className="text-xs text-blue-600">👤 Login: alisher</p>
              <p className="text-xs text-blue-600">🔐 Parol: 2011</p>
            </div>
          </div>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              ⚠️ Kassa tizimiga kirganingizdan keyin chiqish imkoni bo'lmaydi
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          2025 Sardorbek.Furnetura. Barcha huquqlar himoyalangan.
        </p>
      </div>
    </div>
  );
}