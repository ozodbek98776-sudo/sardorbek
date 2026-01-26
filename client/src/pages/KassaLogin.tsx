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
      const response = await api.post('/kassa-auth/login', {
        username: username.trim(),
        password: password
      });
      
      if (response.data.success) {
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
          <div className="relative inline-block">
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                boxShadow: '0 8px 32px -8px rgba(6, 182, 212, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >
              <Calculator className="w-10 h-10 text-white" />
            </div>
            <div 
              className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                boxShadow: '0 2px 8px -2px rgba(34, 197, 94, 0.5)'
              }}
            >
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ 
              background: 'linear-gradient(135deg, #2e1065 0%, #5b21b6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Kassa Tizimi
          </h1>
          <p className="font-medium" style={{ color: '#71717a' }}>Sardor Furnitura - Kassa Paneli</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
            <span className="text-sm" style={{ color: '#a1a1aa' }}>Xavfsiz tizim</span>
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
            <h2 className="text-xl font-bold mb-1" style={{ color: '#2e1065' }}>Kassa tizimiga kirish</h2>
            <p style={{ color: '#71717a' }}>Hisobingiz bilan tizimga kiring</p>
          </div>

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
                <Phone className="w-3.5 h-3.5" />
                Login
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="w-4 h-4 transition-colors" style={{ color: '#a1a1aa' }} />
                </div>
                <input
                  type="text"
                  placeholder="Login"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl transition-all duration-200 focus:outline-none"
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
                  placeholder="Parol"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl transition-all duration-200 focus:outline-none"
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
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                boxShadow: '0 4px 14px -2px rgba(6, 182, 212, 0.4)'
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

          <div className="mt-6">
            <div className="text-center">
              <div 
                className="pt-4"
                style={{ borderTop: '1px solid #ede9fe' }}
              >
                <div 
                  className="rounded-xl p-4 mb-4"
                  style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' }}
                >
                  <p className="font-medium text-sm mb-3" style={{ color: '#5b21b6' }}>
                    Admin uchun:
                  </p>
                  <a 
                    href="/login" 
                    className="inline-flex items-center justify-center gap-2 font-semibold transition-colors text-base underline decoration-2 underline-offset-4"
                    style={{ color: '#7c3aed' }}
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
