import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Package, Users, 
  CreditCard, ShoppingBag, UserPlus, Receipt, Menu, X, LogOut, Building2, Edit, Phone, Lock, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { formatPhone } from '../utils/format';

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
    <aside className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 transition-all duration-300 ease-in-out z-50 shadow-lg ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900">Sardorbek</span>
              <p className="text-xs text-slate-500 font-medium">Furnetura</p>
            </div>
          </div>
        )}
        <button 
          onClick={() => setCollapsed?.(!collapsed)} 
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all duration-200"
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-160px)]">
        {items.map((item, i) => (
          <NavLink
            key={i}
            to={`${basePath}${item.path}`}
            end={item.path === ''}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 group
              ${collapsed ? 'justify-center px-2' : ''}
              ${isActive 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }
            `}
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0 transition-transform group-hover:scale-110">{item.icon}</span>
            {!collapsed && <span className="truncate text-sm">{t(item.label)}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50">
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="w-8 h-8 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-slate-700">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 capitalize font-medium">{user?.role}</p>
            </div>
            {user?.role === 'admin' && (
              <button
                onClick={openEditModal}
                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200"
                title="Profilni tahrirlash"
              >
                <Edit className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
        <button
          onClick={logout}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 font-medium text-sm ${
            collapsed ? 'justify-center px-2' : ''
          }`}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>{t('sidebar.signout')}</span>}
        </button>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="bg-white rounded-3xl w-full max-w-md p-8 relative z-10 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-900">{t('sidebar.editProfile')}</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-3 block flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t('sidebar.fullName')}
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    className="w-full pl-12 pr-4 py-4 text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white" 
                    placeholder={t('sidebar.namePlaceholder')} 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-3 block flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {t('sidebar.phoneNumber')}
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="tel" 
                    className="w-full pl-12 pr-4 py-4 text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white" 
                    placeholder="+998 (XX) XXX-XX-XX" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: formatPhone(e.target.value)})} 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-3 block flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {t('sidebar.newPassword')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="password" 
                    className="w-full pl-12 pr-4 py-4 text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white" 
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
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-2xl hover:bg-slate-200 transition-all duration-200"
                >
                  {t('sidebar.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200"
                >
                  {t('sidebar.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}

export const adminMenuItems: MenuItem[] = [
  { icon: <LayoutDashboard className="w-5 h-5" />, label: 'sidebar.statistics', path: '' },
  { icon: <Package className="w-5 h-5" />, label: 'sidebar.products', path: '/products' },
  { icon: <Users className="w-5 h-5" />, label: 'sidebar.customers', path: '/customers' },
  { icon: <CreditCard className="w-5 h-5" />, label: 'sidebar.debts', path: '/debts' },
  { icon: <ShoppingBag className="w-5 h-5" />, label: 'sidebar.orders', path: '/orders' },
  { icon: <UserPlus className="w-5 h-5" />, label: 'sidebar.helpers', path: '/helpers' },
];

export const cashierMenuItems: MenuItem[] = [
  { icon: <ShoppingCart className="w-5 h-5" />, label: 'sidebar.pos', path: '' },
  { icon: <CreditCard className="w-5 h-5" />, label: 'sidebar.debts', path: '/debts' },
  { icon: <Receipt className="w-5 h-5" />, label: 'sidebar.receipts', path: '/staff-receipts' },
];
