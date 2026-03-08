import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Settings, X, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { useSwipeToClose } from '../hooks/useSwipeToClose';
import { useModalScrollLock } from '../hooks/useModalScrollLock';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

interface MobileNavBarProps {
  items: NavItem[];
  basePath: string;
}

export default function MobileNavBar({ items, basePath }: MobileNavBarProps) {
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useSwipeToClose(showSettings ? () => setShowSettings(false) : undefined);
  useModalScrollLock(showSettings);

  const savedItems = user?.settings?.navbarItems || [];
  // Bo'sh array = hammasi ko'rinadi
  const visibleItems = savedItems.length > 0
    ? items.filter(item => savedItems.includes(item.path))
    : items;

  const openSettings = () => {
    setSelected(savedItems.length > 0 ? [...savedItems] : items.map(i => i.path));
    setShowSettings(true);
  };

  const toggleItem = (path: string) => {
    setSelected(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Agar hammasi tanlangan bo'lsa, bo'sh array saqlash (= hammasi)
      const navbarItems = selected.length === items.length ? [] : selected;
      await api.put('/auth/settings', { navbarItems });
      if (user) {
        updateUser({ ...user, settings: { ...user.settings, navbarItems } });
      }
      setShowSettings(false);
    } catch (err) {
      console.error('Settings save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="lg:hidden sticky top-0 z-40 bg-slate-900 shadow-lg">
        <div
          className="flex overflow-x-auto scrollbar-hide no-swipe"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
        >
          {visibleItems.map((item) => {
            const fullPath = item.path ? `${basePath}${item.path}` : basePath;
            const label = item.label.startsWith('sidebar.') ? t(item.label) : item.label;

            return (
              <NavLink
                key={fullPath}
                to={fullPath}
                end={!item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-4 py-2.5 min-w-[76px] text-center whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                    isActive
                      ? 'border-cyan-400 text-cyan-400'
                      : 'border-transparent text-slate-400 active:text-slate-200'
                  }`
                }
              >
                <span className="[&>svg]:w-5 [&>svg]:h-5">{item.icon}</span>
                <span className="text-[11px] font-medium leading-tight">{label}</span>
              </NavLink>
            );
          })}

          {/* Settings button */}
          <button
            onClick={openSettings}
            className="flex flex-col items-center gap-1 px-4 py-2.5 min-w-[56px] text-slate-500 border-b-2 border-transparent flex-shrink-0"
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">Sozlash</span>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div data-modal="true" className="fixed inset-0 bg-black/60 z-50 flex items-end lg:hidden" onClick={() => setShowSettings(false)}>
          <div className="bg-white w-full rounded-t-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Navbar sozlamalari</h3>
              <button onClick={() => setShowSettings(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-3 space-y-1">
              {items.map((item) => {
                const label = item.label.startsWith('sidebar.') ? t(item.label) : item.label;
                const isSelected = selected.includes(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => toggleItem(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                      isSelected ? 'bg-cyan-50 text-cyan-700' : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    <span className="[&>svg]:w-5 [&>svg]:h-5">{item.icon}</span>
                    <span className="flex-1 text-left text-sm font-medium">{label}</span>
                    {isSelected && <Check className="w-4 h-4 text-cyan-500" />}
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-200">
              <button
                onClick={handleSave}
                disabled={saving || selected.length === 0}
                className="w-full py-2.5 bg-cyan-600 text-white rounded-xl font-medium disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
