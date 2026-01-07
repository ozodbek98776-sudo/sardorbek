import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Kassa from './pages/admin/Kassa';
import Products from './pages/admin/Products';
import Warehouses from './pages/admin/Warehouses';
import Customers from './pages/admin/Customers';
import Debts from './pages/admin/Debts';
import Orders from './pages/admin/Orders';
import Helpers from './pages/admin/Helpers';
import StaffReceipts from './pages/admin/StaffReceipts';
import CashierLayout from './layouts/CashierLayout';
import HelperLayout from './layouts/HelperLayout';
import HelperScanner from './pages/helper/Scanner';
import KassaLayout from './layouts/KassaLayout';
import KassaMain from './pages/kassa/KassaMain';
import KassaClients from './pages/kassa/KassaClients';
import KassaDebts from './pages/kassa/KassaDebts';
import KassaProducts from './pages/kassa/KassaProducts';
import KassaLogin from './pages/KassaLogin';

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
  
  React.useEffect(() => {
    // Body ga kassa himoya class qo'shish
    document.body.classList.add('kassa-locked', 'kassa-protected');
    
    const checkKassaLogin = () => {
      try {
        const loginData = localStorage.getItem('kassaLoggedIn');
        if (!loginData) {
          navigate('/kassa-login', { replace: true });
          return;
        }
        
        const parsed = JSON.parse(loginData);
        if (!parsed.loggedIn || parsed.user !== 'kassa') {
          navigate('/kassa-login', { replace: true });
          return;
        }
        
        // Session ni doimiy yangilash - HECH QACHON EXPIRE BO'LMASIN
        const updatedData = { ...parsed, timestamp: Date.now() };
        localStorage.setItem('kassaLoggedIn', JSON.stringify(updatedData));
        
        // Browser back/forward tugmalarini bloklash
        window.history.pushState(null, '', window.location.href);
        
      } catch (error) {
        console.error('Kassa login check error:', error);
        // Xatolik bo'lsa ham kassa tizimida qolsin
        const fallbackData = { 
          loggedIn: true, 
          user: 'kassa', 
          username: 'Kassa', 
          timestamp: Date.now() 
        };
        localStorage.setItem('kassaLoggedIn', JSON.stringify(fallbackData));
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
      
      // F5, Ctrl+R, F12 va Ctrl+Shift+I ni ruxsat berish
      if (event.key === 'F5' || 
          (event.ctrlKey && (event.key === 'r' || event.key === 'R')) ||
          event.key === 'F12' ||
          (event.ctrlKey && event.shiftKey && event.key === 'I')) {
        // F12 va Ctrl+Shift+I uchun flag qo'ymaslik, faqat refresh uchun
        if (event.key === 'F5' || (event.ctrlKey && (event.key === 'r' || event.key === 'R'))) {
          sessionStorage.setItem('kassaRefreshing', 'true');
        }
        return;
      }
      
      // Boshqa xavfli tugmalarni bloklash (F12 va Ctrl+Shift+I olib tashlandi)
      if (
        (event.altKey && event.key === 'F4') ||
        (event.ctrlKey && event.key === 'w') ||
        (event.ctrlKey && event.key === 'W') ||
        (event.ctrlKey && event.key === 't') ||
        (event.ctrlKey && event.key === 'T') ||
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
    
    // Context menu ni bloklash - FAQAT KASSA SAHIFALARIDA (Developer tools uchun ruxsat)
    const handleContextMenu = (event: MouseEvent) => {
      // Faqat kassa sahifalarida ishlaydi
      if (!window.location.pathname.startsWith('/kassa')) return;
      
      // Developer tools uchun Ctrl+Shift+I yoki F12 bilan birga o'ng tugma ruxsat
      if (event.ctrlKey || event.shiftKey) {
        return; // Developer tools uchun ruxsat
      }
      
      event.preventDefault();
      alert('⚠️ O\'ng tugma kassa tizimida taqiqlanadi! Developer tools uchun F12 yoki Ctrl+Shift+I ishlatng.');
      return false;
    };
    
    // Sahifa yopilishini bloklash - FAQAT KASSA SAHIFALARIDA (refresh uchun emas)
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Faqat kassa sahifalarida ishlaydi
      if (window.location.pathname.startsWith('/kassa')) {
        // Refresh holatini aniqlash uchun sessionStorage ishlatamiz
        const isRefresh = sessionStorage.getItem('kassaRefreshing') === 'true';
        
        if (!isRefresh) {
          event.preventDefault();
          event.returnValue = '⚠️ DIQQAT: Kassa tizimidan chiqish taqiqlanadi! Faqat admin ruxsati bilan chiqish mumkin.';
          return '⚠️ DIQQAT: Kassa tizimidan chiqish taqiqlanadi! Faqat admin ruxsati bilan chiqish mumkin.';
        } else {
          // Refresh tugagandan keyin flag ni tozalash
          sessionStorage.removeItem('kassaRefreshing');
        }
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
  
  return <>{children}</>;
};

const RoleRedirect = () => {
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
  if (user.role === 'admin') return <Navigate to="/admin" />;
  if (user.role === 'cashier') return <Navigate to="/cashier" />;
  return <Navigate to="/helper" />;
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/kassa-login" element={<KassaLogin />} />
            <Route path="/" element={<RoleRedirect />} />
            
            {/* Kassa Routes - TO'LIQ HIMOYALANGAN */}
            <Route path="/kassa" element={<KassaProtectedRoute><KassaLayout /></KassaProtectedRoute>}>
              <Route index element={<KassaMain />} />
              <Route path="clients" element={<KassaClients />} />
              <Route path="debts" element={<KassaDebts />} />
              <Route path="products" element={<KassaProducts />} />
            </Route>
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="kassa" element={<Kassa />} />
              <Route path="products" element={<Products />} />
              <Route path="warehouses" element={<Warehouses />} />
              <Route path="customers" element={<Customers />} />
              <Route path="debts" element={<Debts />} />
              <Route path="orders" element={<Orders />} />
              <Route path="helpers" element={<Helpers />} />
              <Route path="staff-receipts" element={<StaffReceipts />} />
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
