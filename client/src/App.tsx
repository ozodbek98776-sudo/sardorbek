import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Kassa from './pages/admin/Kassa';
import KassaPro from './pages/admin/KassaPro';
import Products from './pages/admin/Products';
import Warehouses from './pages/admin/Warehouses';
import Customers from './pages/admin/Customers';
import Debts from './pages/admin/Debts';
import DebtApprovals from './pages/admin/DebtApprovals';
import Orders from './pages/admin/Orders';
import Helpers from './pages/admin/Helpers';
import StaffReceipts from './pages/admin/StaffReceipts';
import CashierLayout from './layouts/CashierLayout';
import HelperLayout from './layouts/HelperLayout';
import HelperScanner from './pages/helper/Scanner';
import KassaLayout from './layouts/KassaLayout';
import KassaMain from './pages/kassa/KassaMain';
import KassaReceipts from './pages/kassa/KassaReceipts';
import KassaClients from './pages/kassa/KassaClients';
import KassaDebts from './pages/kassa/KassaDebts';
import KassaProducts from './pages/kassa/KassaProducts';
import TelegramSettings from './pages/admin/TelegramSettings';
import AdminSettings from './pages/admin/AdminSettings';
import KassaLogin from './pages/KassaLogin';
import ProductView from './pages/ProductView';
import SwipeNavigator from './components/SwipeNavigator';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles?: string[] }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-brand-100 flex items-center justify-center">
            <div className="spinner text-brand-600" />
          </div>
          <p className="text-surface-500 text-sm">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
};

// Kassa himoya komponenti - HECH QANDAY CHIQISH YO'LI YO'Q
const KassaProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);
  
  React.useEffect(() => {
    // Body ga kassa himoya class qo'shish
    document.body.classList.add('kassa-locked', 'kassa-protected');
    
    const checkKassaLogin = () => {
      try {
        const loginData = localStorage.getItem('kassaLoggedIn');
        
        // kassaLoggedIn localStorage'ni tekshirish
        if (loginData) {
          const parsed = JSON.parse(loginData);
          if (parsed.loggedIn && parsed.user === 'kassa') {
            // Session ni yangilash
            const updatedData = { ...parsed, timestamp: Date.now() };
            localStorage.setItem('kassaLoggedIn', JSON.stringify(updatedData));
            setIsAuthorized(true);
            window.history.pushState(null, '', window.location.href);
            return;
          }
        }
        
        // Autentifikatsiya yo'q - login sahifasiga yo'naltirish
        setIsAuthorized(false);
        navigate('/kassa-login', { replace: true });
        
      } catch (error) {
        console.error('Kassa login check error:', error);
        // Xatolik bo'lsa login sahifasiga yo'naltirish
        setIsAuthorized(false);
        navigate('/kassa-login', { replace: true });
      }
    };
    
    checkKassaLogin();
    
    // Browser back tugmasini bloklash - FAQAT KASSA SAHIFALARIDA
    const handlePopState = () => {
      // Faqat kassa sahifalarida ishlaydi
      if (window.location.pathname.startsWith('/kassa')) {
        window.history.pushState(null, '', window.location.href);
      }
    };
    
    // Keyboard shortcut larni bloklash - FAQAT KASSA SAHIFALARIDA
    const handleKeyDown = (event: KeyboardEvent) => {
      // Faqat kassa sahifalarida ishlaydi
      if (!window.location.pathname.startsWith('/kassa')) return;
      
      // F5 va Ctrl+R ga to'liq ruxsat berish - sahifa refresh bo'lsin
      if (event.key === 'F5' || (event.ctrlKey && (event.key === 'r' || event.key === 'R'))) {
        // preventDefault qilmaymiz - sahifa to'liq yangilansin
        return;
      }
      
      // F12 ga ruxsat berish
      if (event.key === 'F12') {
        return;
      }
      
      // Alt+F4, Ctrl+W, Ctrl+T va boshqa chiqish tugmalarini bloklash
      if (
        (event.altKey && event.key === 'F4') ||
        (event.ctrlKey && event.key === 'w') ||
        (event.ctrlKey && event.key === 'W') ||
        (event.ctrlKey && event.key === 't') ||
        (event.ctrlKey && event.key === 'T') ||
        (event.ctrlKey && event.shiftKey && event.key === 'I') ||
        (event.ctrlKey && event.shiftKey && event.key === 'J') ||
        (event.ctrlKey && event.key === 'u') ||
        (event.ctrlKey && event.key === 'U') ||
        (event.ctrlKey && event.key === 's') ||
        (event.ctrlKey && event.key === 'S') ||
        (event.ctrlKey && event.key === 'p') ||
        (event.ctrlKey && event.key === 'P')
      ) {
        event.preventDefault();
        event.stopPropagation();
        alert('⚠️ Bu amal kassa tizimida taqiqlanadi!');
        return false;
      }
    };
    
    // Context menu ni bloklash - FAQAT KASSA SAHIFALARIDA
    const handleContextMenu = (event: MouseEvent) => {
      // Faqat kassa sahifalarida ishlaydi
      if (!window.location.pathname.startsWith('/kassa')) return;
      
      event.preventDefault();
      alert('⚠️ O\'ng tugma kassa tizimida taqiqlanadi!');
      return false;
    };
    
    // Sahifa yopilishini bloklash - FAQAT KASSA SAHIFALARIDA
    const handleBeforeUnload = () => {
      // Kassa sahifalarida faqat navigation va tab yopishni bloklash
      // F5 refresh ga to'liq ruxsat berish
      if (window.location.pathname.startsWith('/kassa')) {
        // Agar bu browser refresh (F5/Ctrl+R) bo'lsa, hech qanday bloklash yo'q
        return undefined;
      }
    };
    
    // Sahifa focus yo'qolganda qaytarish
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Sahifa yashirilganda qaytarish
        setTimeout(() => {
          window.focus();
        }, 100);
      }
    };
    
    // Barcha event listener larni qo'shish
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Dastlabki focus
    window.focus();
    
    // Cleanup
    return () => {
      document.body.classList.remove('kassa-locked', 'kassa-protected');
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate]);
  
  // Loading holati
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-brand-100 flex items-center justify-center">
            <div className="spinner text-brand-600" />
          </div>
          <p className="text-surface-500 text-sm">Tekshirilmoqda...</p>
        </div>
      </div>
    );
  }
  
  // Agar ruxsat berilmagan bo'lsa, hech narsa ko'rsatmaslik
  if (!isAuthorized) {
    return null;
  }
  
  return <>{children}</>;
};

const RoleRedirect = () => {
  const { user, loading } = useAuth();
  const [checkingAdmin, setCheckingAdmin] = React.useState(true);
  const [hasAdmin, setHasAdmin] = React.useState(false);
  
  React.useEffect(() => {
    const checkAdminExists = async () => {
      try {
        // Backend dan admin borligini tekshirish - retry logic bilan
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 soniya timeout
        
        const response = await fetch('http://localhost:8000/api/auth/check-admin', {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setHasAdmin(data.hasAdmin);
      } catch (error: any) {
        console.error('Admin check error:', error);
        
        // Agar server ishlamasa yoki timeout bo'lsa, default true qo'yamiz
        if (error.name === 'AbortError') {
          console.warn('Admin check timeout - server javob bermadi');
        } else if (error.message?.includes('Failed to fetch')) {
          console.warn('Server bilan aloqa yo\'q - localhost:8000 ishlamayapti');
        }
        
        // Xatolik bo'lsa ham login sahifasiga yo'naltirish uchun true
        setHasAdmin(true);
      } finally {
        setCheckingAdmin(false);
      }
    };
    
    checkAdminExists();
  }, []);
  
  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-brand-100 flex items-center justify-center">
            <div className="spinner text-brand-600" />
          </div>
          <p className="text-surface-500 text-sm">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }
  
  // Agar admin yo'q bo'lsa, ro'yxatdan o'tish sahifasiga yo'naltirish
  if (!hasAdmin && !user) {
    return <Navigate to="/register" />;
  }
  
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin') return <Navigate to="/admin" />;
  if (user.role === 'cashier') return <Navigate to="/kassa" />;
  return <Navigate to="/helper" />;
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <SwipeNavigator />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/kassa-login" element={<KassaLogin />} />
            <Route path="/product/:id" element={<ProductView />} />
            <Route path="/" element={<RoleRedirect />} />
            
            {/* Kassa Routes - TO'LIQ HIMOYALANGAN */}
            <Route path="/kassa" element={<KassaProtectedRoute><KassaLayout /></KassaProtectedRoute>}>
              <Route index element={<KassaMain />} />
              <Route path="receipts" element={<KassaReceipts />} />
              <Route path="clients" element={<KassaClients />} />
              <Route path="debts" element={<KassaDebts />} />
              <Route path="products" element={<KassaProducts />} />
            </Route>
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="kassa" element={<Kassa />} />
              <Route path="kassa-pro" element={<KassaPro />} />
              <Route path="products" element={<Products />} />
              <Route path="warehouses" element={<Warehouses />} />
              <Route path="customers" element={<Customers />} />
              <Route path="debts" element={<Debts />} />
              <Route path="debt-approvals" element={<DebtApprovals />} />
              <Route path="orders" element={<Orders />} />
              <Route path="helpers" element={<Helpers />} />
              <Route path="staff-receipts" element={<StaffReceipts />} />
              {/* Settings route removed - Task 30 */}
              <Route path="telegram-settings" element={<TelegramSettings />} />
            </Route>

            {/* Cashier Routes */}
            <Route path="/cashier" element={<ProtectedRoute roles={['cashier']}><CashierLayout /></ProtectedRoute>}>
              <Route index element={<Kassa />} />
              <Route path="debts" element={<Debts />} />
              <Route path="staff-receipts" element={<StaffReceipts />} />
            </Route>

            {/* Helper Routes */}
            <Route path="/helper" element={<ProtectedRoute roles={['helper']}><HelperLayout /></ProtectedRoute>}>
              <Route index element={<HelperScanner />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
