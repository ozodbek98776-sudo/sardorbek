import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, User, Lock, ArrowRight, Building2 } from 'lucide-react';
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
      // AuthContext dan loginWithCredentials funksiyasini ishlatish
      await loginWithCredentials(login, password);
      
      // Login muvaffaqiyatli bo'lgandan keyin, user data ni olish
      const response = await api.get('/auth/me');
      const userData = response.data;
      
      // Role-based routing
      if (userData.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (userData.role === 'cashier') {
        navigate('/kassa', { replace: true });
      } else if (userData.role === 'helper') {
        navigate('/helper', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login yoki parol noto\'g\'ri');
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #ede9fe 100%)' }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)' }}
        />
        <div 
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(109, 40, 217, 0.15) 0%, transparent 70%)' }}
        />
        <div 
          className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full blur-2xl"
          style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)' }}
        />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Header */}
        <div className="text-center mb-6 animate-fade-up">
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ 
              background: 'linear-gradient(135deg, #2e1065 0%, #5b21b6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Sardor Furnitura
          </h1>
          <p className="font-medium" style={{ color: '#71717a' }}>Admin boshqaruv tizimi</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
            <span className="text-sm" style={{ color: '#a1a1aa' }}>Xavfsiz kirish</span>
          </div>
        </div>

        {/* Login Card */}
        <div 
          className="rounded-2xl p-6 animate-fade-up"
          style={{
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 245, 255, 0.95) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            boxShadow: '0 20px 40px -12px rgba(109, 40, 217, 0.2)',
            backdropFilter: 'blur(20px)'
          }}
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-1" style={{ color: '#2e1065' }}>Xush kelibsiz!</h2>
            <p style={{ color: '#71717a' }}>Login va parolingizni kiriting</p>
          </div>

          {successMessage && (
            <div 
              className="rounded-xl p-4 mb-6 animate-fade-in"
              style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', border: '1px solid #86efac' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#22c55e' }}>
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: '#166534' }}>Muvaffaqiyat</p>
                  <p className="text-sm mt-1" style={{ color: '#15803d' }}>{successMessage}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div 
              className="rounded-xl p-4 mb-6 animate-fade-in"
              style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', border: '1px solid #fca5a5' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#ef4444' }}>
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: '#991b1b' }}>Xatolik</p>
                  <p className="text-sm mt-1" style={{ color: '#b91c1c' }}>{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold flex items-center gap-2" style={{ color: '#5b21b6' }}>
                <User className="w-3.5 h-3.5" />
                Login
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-4 h-4 transition-colors" style={{ color: '#a1a1aa' }} />
                </div>
                <input
                  type="text"
                  placeholder="Loginingizni kiriting"
                  value={login}
                  onChange={e => setLogin(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl transition-all duration-200 focus:outline-none text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
                    border: '1.5px solid #ddd6fe',
                    color: '#2e1065'
                  }}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold flex items-center gap-2" style={{ color: '#5b21b6' }}>
                <Lock className="w-3.5 h-3.5" />
                Parol
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 transition-colors" style={{ color: '#a1a1aa' }} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Parolingizni kiriting"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl transition-all duration-200 focus:outline-none text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
                    border: '1.5px solid #ddd6fe',
                    color: '#2e1065'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center transition-colors"
                  style={{ color: '#a1a1aa' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                boxShadow: '0 4px 14px -2px rgba(124, 58, 237, 0.4)'
              }}
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

          <div className="mt-6 text-center">
            <div 
              className="p-3 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%)', border: '1px solid rgba(6, 182, 212, 0.3)' }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: '#155e75' }}>Kassa paneli:</p>
              <button
                onClick={() => navigate('/kassa-login')}
                className="text-sm font-semibold underline transition-colors"
                style={{ color: '#0891b2' }}
              >
                Kassa tizimiga kirish →
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 animate-fade-up">
          <p className="text-sm" style={{ color: '#71717a' }}>
            © 2025 Sardor Furnitura. Barcha huquqlar himoyalangan.
          </p>
          <div className="flex items-center justify-center gap-3 mt-2 text-xs" style={{ color: '#a1a1aa' }}>
            <span>Xavfsiz</span>
            <div className="w-1 h-1 rounded-full" style={{ background: '#ddd6fe' }} />
            <span>Professional</span>
            <div className="w-1 h-1 rounded-full" style={{ background: '#ddd6fe' }} />
            <span>Ishonchli</span>
          </div>
        </div>
      </div>
    </div>
  );
}
