import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, ArrowRight, Calculator } from 'lucide-react';
import api from '../utils/api';

export default function KassaLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showAdminLink, setShowAdminLink] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await api.post('/kassa-auth/login', {
        username: username.trim(),
        password: password
      });
      
      if (response.data.success) {
        // JWT token ni saqlash
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
        
        // Kassa session ma'lumotlarini saqlash
        const loginData = {
          loggedIn: true,
          timestamp: Date.now(),
          user: 'kassa',
          username: response.data.data.username,
          sessionToken: response.data.data.sessionToken,
          expiresAt: response.data.data.expiresAt,
          locked: true
        };
        
        localStorage.setItem('kassaLoggedIn', JSON.stringify(loginData));
        window.history.replaceState(null, '', '/kassa');
        navigate('/kassa', { replace: true });
      } else {
        setError(response.data.message || 'Login yoki parol noto\'g\'ri');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Login yoki parol noto\'g\'ri');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-all duration-700"
      style={{ 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
      }}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl animate-pulse"
          style={{ 
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
            animationDuration: '4s'
          }}
        />
        <div 
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl animate-pulse"
          style={{ 
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, transparent 70%)',
            animationDuration: '5s',
            animationDelay: '1s'
          }}
        />
        <div 
          className="absolute top-1/3 right-1/3 w-72 h-72 rounded-full blur-3xl animate-pulse"
          style={{ 
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)',
            animationDuration: '6s',
            animationDelay: '2s'
          }}
        />
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      <div className={`w-full max-w-md relative z-10 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div 
            className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 relative transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
              boxShadow: '0 20px 60px -12px rgba(139, 92, 246, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
            }}
          >
            <Calculator className="w-12 h-12 text-white relative z-10" />
          </div>
          <h1 
            className="text-4xl font-bold mb-3 transition-all duration-300"
            style={{ 
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 40px rgba(255, 255, 255, 0.1)'
            }}
          >
            Kassa Tizimi
          </h1>
          <p className="text-base font-medium text-slate-300">Sardor Furnitura - Kassa Paneli</p>
        </div>

        {/* Login Card */}
        <div 
          className="rounded-3xl p-8 backdrop-blur-xl transition-all duration-300 hover:shadow-2xl"
          style={{
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2 text-white">Tizimga kirish</h2>
            <p className="text-slate-300">Hisobingiz bilan davom eting</p>
          </div>

          {error && (
            <div 
              className="rounded-2xl p-4 mb-6 backdrop-blur-sm transition-all duration-300 animate-shake"
              style={{ 
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.15) 100%)', 
                border: '1px solid rgba(239, 68, 68, 0.3)',
                boxShadow: '0 8px 16px -4px rgba(239, 68, 68, 0.3)'
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 animate-pulse" style={{ background: '#ef4444' }}>
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-red-200">Xatolik</p>
                  <p className="text-sm mt-1 text-red-100">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                <Phone className="w-4 h-4" />
                Login
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-all duration-200 group-focus-within:scale-110">
                  <Phone className="w-5 h-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors duration-200" />
                </div>
                <input
                  type="text"
                  placeholder="Login kiriting"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl transition-all duration-200 focus:outline-none focus:scale-[1.02] text-base"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1.5px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    backdropFilter: 'blur(10px)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(6, 182, 212, 0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                <Lock className="w-4 h-4" />
                Parol
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-all duration-200 group-focus-within:scale-110">
                  <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors duration-200" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Parol kiriting"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 rounded-xl transition-all duration-200 focus:outline-none focus:scale-[1.02] text-base"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1.5px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    backdropFilter: 'blur(10px)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(6, 182, 212, 0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center transition-all duration-200 hover:scale-110 active:scale-95"
                  style={{ color: '#94a3b8' }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group mt-6 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
                boxShadow: '0 10px 30px -8px rgba(139, 92, 246, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {loading ? (
                <div className="flex items-center justify-center gap-3 relative z-10">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-base">Kirish...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 relative z-10">
                  <span className="text-base">Kirish</span>
                  <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              )}
            </button>
          </form>

          {/* Admin uchun qism - yashirish/ko'rsatish */}
          {showAdminLink && (
            <div className="mt-8">
              <div className="text-center">
                <div 
                  className="pt-6"
                  style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
                >
                  <div 
                    className="rounded-2xl p-5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] relative"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
                      border: '1px solid rgba(139, 92, 246, 0.2)'
                    }}
                  >
                    {/* Yopish tugmasi */}
                    <button
                      onClick={() => setShowAdminLink(false)}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200"
                      title="Yashirish"
                    >
                      <span className="text-white text-sm">×</span>
                    </button>
                    
                    <p className="font-semibold text-sm mb-3 text-slate-200">
                      Admin uchun:
                    </p>
                    <a 
                      href="/login" 
                      className="inline-flex items-center justify-center gap-2 font-bold transition-all duration-200 text-base hover:scale-105 active:scale-95 group"
                      style={{ color: '#a78bfa' }}
                    >
                      <span>Admin panel</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Yashirilgan bo'lsa, qayta ko'rsatish tugmasi */}
          {!showAdminLink && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowAdminLink(true)}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline"
              >
                Admin panelga kirish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
