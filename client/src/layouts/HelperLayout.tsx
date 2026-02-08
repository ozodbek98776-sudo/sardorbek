import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Sparkles, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function HelperLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-surface-200/60">
        <div className="px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between max-w-full overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="font-bold text-base sm:text-lg text-surface-900 hidden sm:inline truncate">Sardorbek.Furnetura</span>
            <span className="font-bold text-sm text-surface-900 sm:hidden truncate">Sardorbek</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-surface-100 rounded-xl max-w-[150px]">
              <User className="w-4 h-4 text-surface-500 flex-shrink-0" />
              <span className="text-sm font-medium text-surface-700 truncate">{user?.name}</span>
            </div>
            <div className="md:hidden flex items-center justify-center w-8 h-8 bg-surface-100 rounded-lg flex-shrink-0">
              <User className="w-4 h-4 text-surface-500" />
            </div>
            <button 
              onClick={() => {
                logout();
                navigate('/login');
              }} 
              className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-surface-500 hover:text-danger-600 hover:bg-danger-50 transition-colors flex-shrink-0"
              title="Chiqish"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </header>
      <main className="p-0 m-0 w-full h-full min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
