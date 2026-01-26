import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Package, Users, 
  CreditCard, UserPlus, Receipt, Menu, X, LogOut, Building2, Edit, Phone, Lock, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { formatPhone } from '../utils/format';
import PWAInstallButton from '../components/PWAInstallButton.tsx';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

interface SidebarProps {
  items: MenuItem[];
  basePath: string;
  collapsed?: boolean;
  setCollapsed?: (v: boolean) => void;
}

export default function Sidebar({ items, basePath, collapsed = false, setCollapsed }: SidebarProps) {
  const { user, logout, updateUser } = useAuth();
  const { t } = useLanguage();
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', password: '' });

  const openEditModal = () => {
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
      password: ''
    });
    setShowEditModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: any = { name: formData.name, phone: formData.phone };
      if (formData.password) data.password = formData.password;
      
      const res = await api.put('/auth/profile', data);
      updateUser(res.data);
      setShowEditModal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  return (
    <aside 
      className={`fixed left-0 top-0 h-full transition-all duration-300 ease-in-out z-50 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      style={{
        background: 'linear-gradient(180deg, #2e1065 0%, #4c1d95 100%)',
        borderRight: '1px solid rgba(6, 182, 212, 0.2)',
        boxShadow: '4px 0 24px -4px rgba(46, 16, 101, 0.3)'
      }}
    >
      {/* Header */}
      <div 
        className="h-16 flex items-center justify-between px-4"
        style={{
          borderBottom: '1px solid rgba(6, 182, 212, 0.15)',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, transparent 100%)'
        }}
      >
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                boxShadow: '0 4px 12px -2px rgba(6, 182, 212, 0.4)'
              }}
            >
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base text-white">Sardor</span>
              <p className="text-xs font-medium" style={{ color: '#c4b5fd' }}>Furnitura</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1">
          <PWAInstallButton variant="icon" />
          <button 
            onClick={() => setCollapsed?.(!collapsed)} 
            className="p-2 rounded-xl transition-all duration-200"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#c4b5fd'
            }}
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1.5 overflow-y-auto h-[calc(100vh-180px)]">
        {items.map((item, i) => (
          <NavLink
            key={i}
            to={`${basePath}${item.path}`}
            end={item.path === ''}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-all duration-200 group
              ${collapsed ? 'justify-center px-2' : ''}
            `}
            style={({ isActive }) => ({
              background: isActive 
                ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' 
                : 'transparent',
              color: isActive ? '#ffffff' : '#c4b5fd',
              boxShadow: isActive ? '0 4px 12px -2px rgba(6, 182, 212, 0.4)' : 'none'
            })}
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0 transition-transform group-hover:scale-110">{item.icon}</span>
            {!collapsed && <span className="truncate text-sm">{t(item.label)}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div 
        className="absolute bottom-0 left-0 right-0 p-3"
        style={{
          borderTop: '1px solid rgba(6, 182, 212, 0.15)',
          background: 'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.2) 100%)'
        }}
      >
        {!collapsed && (
          <div 
            className="flex items-center gap-2 px-3 py-2.5 mb-2 rounded-xl"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.15)'
            }}
          >
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
              }}
            >
              <span className="text-sm font-bold text-white">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs capitalize font-medium" style={{ color: '#a78bfa' }}>{user?.role}</p>
            </div>
            {user?.role === 'admin' && (
              <button
                onClick={openEditModal}
                className="p-1.5 rounded-lg transition-all duration-200"
                style={{
                  background: 'rgba(6, 182, 212, 0.2)',
                  color: '#67e8f9'
                }}
                title="Profilni tahrirlash"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        <button
          onClick={logout}
          className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm ${
            collapsed ? 'justify-center px-2' : ''
          }`}
          style={{ color: '#fca5a5' }}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>{t('sidebar.signout')}</span>}
        </button>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div 
            className="fixed inset-0 -z-10" 
            style={{ background: 'rgba(46, 16, 101, 0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowEditModal(false)} 
          />
          <div 
            className="w-full sm:w-auto max-w-md p-4 sm:p-8 relative z-10 rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90vh] overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #ffffff 0%, #faf5ff 100%)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              boxShadow: '0 25px 50px -12px rgba(46, 16, 101, 0.35)'
            }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between mb-4 sm:mb-8 pb-4 sm:pb-0 border-b border-surface-100 sm:border-0">
              <h3 className="text-lg sm:text-xl font-bold truncate" style={{ color: '#2e1065' }}>{t('sidebar.editProfile')}</h3>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="flex-shrink-0 p-2 rounded-xl transition-all"
                style={{ background: '#f5f3ff', color: '#7c3aed' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label className="text-sm font-semibold mb-3 block flex items-center gap-2" style={{ color: '#5b21b6' }}>
                  <User className="w-4 h-4" />
                  {t('sidebar.fullName')}
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#a1a1aa' }} />
                  <input 
                    type="text" 
                    className="w-full pl-12 pr-4 py-4 rounded-2xl transition-all duration-200 focus:outline-none" 
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
                      border: '1.5px solid #ddd6fe',
                      color: '#2e1065'
                    }}
                    placeholder={t('sidebar.namePlaceholder')} 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-3 block flex items-center gap-2" style={{ color: '#5b21b6' }}>
                  <Phone className="w-4 h-4" />
                  {t('sidebar.phoneNumber')}
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#a1a1aa' }} />
                  <input 
                    type="tel" 
                    className="w-full pl-12 pr-4 py-4 rounded-2xl transition-all duration-200 focus:outline-none" 
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
                      border: '1.5px solid #ddd6fe',
                      color: '#2e1065'
                    }}
                    placeholder="+998 (XX) XXX-XX-XX" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: formatPhone(e.target.value)})} 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-3 block flex items-center gap-2" style={{ color: '#5b21b6' }}>
                  <Lock className="w-4 h-4" />
                  {t('sidebar.newPassword')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#a1a1aa' }} />
                  <input 
                    type="password" 
                    className="w-full pl-12 pr-4 py-4 rounded-2xl transition-all duration-200 focus:outline-none" 
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
                      border: '1.5px solid #ddd6fe',
                      color: '#2e1065'
                    }}
                    placeholder={t('sidebar.passwordHint')} 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)} 
                  className="flex-1 px-6 py-3.5 font-semibold rounded-2xl transition-all duration-200"
                  style={{
                    background: '#f5f3ff',
                    color: '#7c3aed'
                  }}
                >
                  {t('sidebar.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-6 py-3.5 text-white font-semibold rounded-2xl transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                    boxShadow: '0 4px 14px -2px rgba(124, 58, 237, 0.4)'
                  }}
                >
                  {t('sidebar.saveChanges')}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export const adminMenuItems: MenuItem[] = [
  { icon: <LayoutDashboard className="w-5 h-5" />, label: 'sidebar.statistics', path: '' },
  { icon: <ShoppingCart className="w-5 h-5" />, label: 'sidebar.pos', path: '/kassa' },
  { icon: <Package className="w-5 h-5" />, label: 'sidebar.products', path: '/products' },
  { icon: <Users className="w-5 h-5" />, label: 'sidebar.customers', path: '/customers' },
  { icon: <CreditCard className="w-5 h-5" />, label: 'sidebar.debts', path: '/debts' },
  { icon: <UserPlus className="w-5 h-5" />, label: 'sidebar.helpers', path: '/helpers' },
];

export const cashierMenuItems: MenuItem[] = [
  { icon: <ShoppingCart className="w-5 h-5" />, label: 'sidebar.pos', path: '' },
  { icon: <CreditCard className="w-5 h-5" />, label: 'sidebar.debts', path: '/debts' },
  { icon: <Receipt className="w-5 h-5" />, label: 'sidebar.receipts', path: '/staff-receipts' },
];
