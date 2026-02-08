import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import React, { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { API_BASE_URL } from './config/api';
import ErrorBoundary from './components/ErrorBoundary';

// Eager loading - darhol kerak bo'lgan sahifalar
import Login from './pages/Login';

// Lazy loading - kerak bo'lganda yuklanadigan sahifalar
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
// Kassa sahifasi
const KassaPro = lazy(() => import('./pages/admin/KassaPro'));
// Admin sahifalari
const Products = lazy(() => import('./pages/admin/Products'));
const Warehouses = lazy(() => import('./pages/admin/Warehouses'));
const Customers = lazy(() => import('./pages/admin/Customers'));
const Debts = lazy(() => import('./pages/admin/Debts'));
const DebtApprovals = lazy(() => import('./pages/admin/DebtApprovals'));
const Orders = lazy(() => import('./pages/admin/Orders'));
const Helpers = lazy(() => import('./pages/admin/Helpers'));
const HelpersOptimized = lazy(() => import('./pages/admin/HelpersOptimized'));
const StaffReceipts = lazy(() => import('./pages/admin/StaffReceipts'));
const TelegramSettings = lazy(() => import('./pages/admin/TelegramSettings'));
const Categories = lazy(() => import('./pages/admin/Categories'));
const KassaLayout = lazy(() => import('./layouts/KassaLayout'));
const HelperLayout = lazy(() => import('./layouts/HelperLayout'));
const HelperScanner = lazy(() => import('./pages/helper/Scanner'));
// Kassa sahifalari (admin va kassir uchun)
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
  
  // Token yo'q bo'lsa login sahifasiga yo'naltirish
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Role tekshirish - agar roles berilgan bo'lsa va user role'i mos kelmasa
  if (roles && !roles.includes(user.role)) {
    // Role mos kelmasa, user role'iga mos sahifaga yo'naltirish
    switch (user.role) {
      case 'admin':
        return <Navigate to="/admin" replace />;
      case 'cashier':
        return <Navigate to="/kassa/kassa" replace />; // Kassir faqat kassa sahifasiga
      case 'helper':
        return <Navigate to="/helper" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }
  
  return <>{children}</>;
};

const RoleRedirect = () => {
  const { user, loading } = useAuth();
  
  // Loading holatida
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
  
  // Agar token yo'q bo'lsa - login sahifasiga yo'naltirish va u yerda ushlab turish
  if (!user) {
    console.log('🔍 User topilmadi, login sahifasiga yo\'naltirish');
    return <Navigate to="/login" replace />;
  }
  
  // Token bor - role bo'yicha to'g'ridan-to'g'ri yo'naltirish
  console.log('✅ User topildi, role bo\'yicha yo\'naltirish:', user.role);
  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'cashier':
      return <Navigate to="/kassa/kassa" replace />; // Kassir faqat kassa sahifasiga
    case 'helper':
      return <Navigate to="/helper" replace />;
    default:
      // Noma'lum role bo'lsa login sahifasiga qaytarish
      console.warn('⚠️ Noma\'lum role, login sahifasiga qaytarish:', user.role);
      return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<PageLoader />}>
              <SwipeNavigator />
            </Suspense>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/product/:id" element={<Suspense fallback={<PageLoader />}><ProductView /></Suspense>} />
              <Route path="/" element={<RoleRedirect />} />
              
              {/* Kassa Routes - TO'LIQ HIMOYALANGAN - Admin va Kassir uchun */}
              <Route path="/kassa" element={<ProtectedRoute roles={['admin', 'cashier']}><Suspense fallback={<PageLoader />}><KassaLayout /></Suspense></ProtectedRoute>}>
                <Route index element={<Navigate to="/kassa/kassa" replace />} />
                <Route path="pos" element={<Navigate to="/kassa/kassa" replace />} />
                <Route path="kassa" element={<Suspense fallback={<PageLoader />}><KassaPro /></Suspense>} />
                <Route path="receipts" element={<Suspense fallback={<PageLoader />}><KassaReceipts /></Suspense>} />
                <Route path="clients" element={<Suspense fallback={<PageLoader />}><KassaClients /></Suspense>} />
                <Route path="debts" element={<Suspense fallback={<PageLoader />}><KassaDebts /></Suspense>} />
              </Route>
              
              {/* Admin Routes - FAQAT ADMIN UCHUN */}
              <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Suspense fallback={<PageLoader />}><AdminLayout /></Suspense></ProtectedRoute>}>
                <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
                {/* Admin uchun kassa sahifasi - AdminLayout ichida */}
                <Route path="kassa" element={<Suspense fallback={<PageLoader />}><KassaPro /></Suspense>} />
                <Route path="products" element={<Suspense fallback={<PageLoader />}><Products /></Suspense>} />
                <Route path="categories" element={<Suspense fallback={<PageLoader />}><Categories /></Suspense>} />
                <Route path="warehouses" element={<Suspense fallback={<PageLoader />}><Warehouses /></Suspense>} />
                <Route path="customers" element={<Suspense fallback={<PageLoader />}><Customers /></Suspense>} />
                <Route path="debts" element={<Suspense fallback={<PageLoader />}><Debts /></Suspense>} />
                <Route path="debt-approvals" element={<Suspense fallback={<PageLoader />}><DebtApprovals /></Suspense>} />
                <Route path="orders" element={<Suspense fallback={<PageLoader />}><Orders /></Suspense>} />
                <Route path="helpers" element={<Suspense fallback={<PageLoader />}><HelpersOptimized /></Suspense>} />
                <Route path="helpers-old" element={<Suspense fallback={<PageLoader />}><Helpers /></Suspense>} />
                <Route path="staff-receipts" element={<Suspense fallback={<PageLoader />}><StaffReceipts /></Suspense>} />
                <Route path="telegram-settings" element={<Suspense fallback={<PageLoader />}><TelegramSettings /></Suspense>} />
              </Route>

              {/* Cashier Routes - DEPRECATED - Endi /kassa ishlatiladi */}
              <Route path="/cashier" element={<Navigate to="/kassa/kassa" replace />} />

              {/* Helper Routes */}
              <Route path="/helper" element={<ProtectedRoute roles={['helper']}><Suspense fallback={<PageLoader />}><HelperLayout /></Suspense></ProtectedRoute>}>
                <Route index element={<Suspense fallback={<PageLoader />}><HelperScanner /></Suspense>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
