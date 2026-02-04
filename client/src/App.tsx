import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import React, { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

// Eager loading - darhol kerak bo'lgan sahifalar
import Login from './pages/Login';
import Register from './pages/Register';
import KassaLogin from './pages/KassaLogin';

// Lazy loading - kerak bo'lganda yuklanadigan sahifalar
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Kassa = lazy(() => import('./pages/admin/Kassa'));
const KassaPro = lazy(() => import('./pages/admin/KassaPro'));
const Products = lazy(() => import('./pages/admin/Products'));
const Warehouses = lazy(() => import('./pages/admin/Warehouses'));
const Customers = lazy(() => import('./pages/admin/Customers'));
const Debts = lazy(() => import('./pages/admin/Debts'));
const DebtApprovals = lazy(() => import('./pages/admin/DebtApprovals'));
const Orders = lazy(() => import('./pages/admin/Orders'));
const Helpers = lazy(() => import('./pages/admin/Helpers'));
const StaffReceipts = lazy(() => import('./pages/admin/StaffReceipts'));
const TelegramSettings = lazy(() => import('./pages/admin/TelegramSettings'));
const Categories = lazy(() => import('./pages/admin/Categories'));
const CashierLayout = lazy(() => import('./layouts/CashierLayout'));
const HelperLayout = lazy(() => import('./layouts/HelperLayout'));
const HelperScanner = lazy(() => import('./pages/helper/Scanner'));
const KassaLayout = lazy(() => import('./layouts/KassaLayout'));
const KassaReceipts = lazy(() => import('./pages/kassa/KassaReceipts'));
const KassaClients = lazy(() => import('./pages/kassa/KassaClients'));
const KassaDebts = lazy(() => import('./pages/kassa/KassaDebts'));
const ProductView = lazy(() => import('./pages/ProductView'));
const SwipeNavigator = lazy(() => import('./components/SwipeNavigator'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen bg-surface-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-brand-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
      </div>
      <p className="text-surface-500 text-sm">Yuklanmoqda...</p>
    </div>
  </div>
);

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
    
    // Barcha event listener larni qo'shish
    window.addEventListener('popstate', handlePopState);
    
    // Dastlabki focus
    window.focus();
    
    // Cleanup
    return () => {
      document.body.classList.remove('kassa-locked', 'kassa-protected');
      window.removeEventListener('popstate', handlePopState);
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
          <Suspense fallback={<PageLoader />}>
            <SwipeNavigator />
          </Suspense>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/kassa-login" element={<KassaLogin />} />
            <Route path="/product/:id" element={<Suspense fallback={<PageLoader />}><ProductView /></Suspense>} />
            <Route path="/" element={<RoleRedirect />} />
            
            {/* Kassa Routes - TO'LIQ HIMOYALANGAN */}
            <Route path="/kassa" element={<KassaProtectedRoute><Suspense fallback={<PageLoader />}><KassaLayout /></Suspense></KassaProtectedRoute>}>
              <Route index element={<Navigate to="/kassa/pos" replace />} />
              <Route path="pos" element={<Suspense fallback={<PageLoader />}><KassaPro /></Suspense>} />
              <Route path="receipts" element={<Suspense fallback={<PageLoader />}><KassaReceipts /></Suspense>} />
              <Route path="clients" element={<Suspense fallback={<PageLoader />}><KassaClients /></Suspense>} />
              <Route path="debts" element={<Suspense fallback={<PageLoader />}><KassaDebts /></Suspense>} />
            </Route>
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Suspense fallback={<PageLoader />}><AdminLayout /></Suspense></ProtectedRoute>}>
              <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
              <Route path="kassa" element={<Suspense fallback={<PageLoader />}><Kassa /></Suspense>} />
              <Route path="kassa-pro" element={<Suspense fallback={<PageLoader />}><KassaPro /></Suspense>} />
              <Route path="products" element={<Suspense fallback={<PageLoader />}><Products /></Suspense>} />
              <Route path="categories" element={<Suspense fallback={<PageLoader />}><Categories /></Suspense>} />
              <Route path="warehouses" element={<Suspense fallback={<PageLoader />}><Warehouses /></Suspense>} />
              <Route path="customers" element={<Suspense fallback={<PageLoader />}><Customers /></Suspense>} />
              <Route path="debts" element={<Suspense fallback={<PageLoader />}><Debts /></Suspense>} />
              <Route path="debt-approvals" element={<Suspense fallback={<PageLoader />}><DebtApprovals /></Suspense>} />
              <Route path="orders" element={<Suspense fallback={<PageLoader />}><Orders /></Suspense>} />
              <Route path="helpers" element={<Suspense fallback={<PageLoader />}><Helpers /></Suspense>} />
              <Route path="staff-receipts" element={<Suspense fallback={<PageLoader />}><StaffReceipts /></Suspense>} />
              <Route path="telegram-settings" element={<Suspense fallback={<PageLoader />}><TelegramSettings /></Suspense>} />
            </Route>

            {/* Cashier Routes */}
            <Route path="/cashier" element={<ProtectedRoute roles={['cashier']}><Suspense fallback={<PageLoader />}><CashierLayout /></Suspense></ProtectedRoute>}>
              <Route index element={<Suspense fallback={<PageLoader />}><Kassa /></Suspense>} />
              <Route path="debts" element={<Suspense fallback={<PageLoader />}><Debts /></Suspense>} />
              <Route path="staff-receipts" element={<Suspense fallback={<PageLoader />}><StaffReceipts /></Suspense>} />
            </Route>

            {/* Helper Routes */}
            <Route path="/helper" element={<ProtectedRoute roles={['helper']}><Suspense fallback={<PageLoader />}><HelperLayout /></Suspense></ProtectedRoute>}>
              <Route index element={<Suspense fallback={<PageLoader />}><HelperScanner /></Suspense>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
