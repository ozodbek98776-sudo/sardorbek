import { NavLink } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

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

  return (
    <div className="lg:hidden sticky top-0 z-40 bg-slate-900 shadow-lg">
      <div className="flex overflow-x-auto scrollbar-hide">
        {items.map((item) => {
          const fullPath = item.path ? `${basePath}${item.path}` : basePath;
          const label = item.label.startsWith('sidebar.') ? t(item.label) : item.label;

          return (
            <NavLink
              key={fullPath}
              to={fullPath}
              end={!item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 min-w-[70px] text-center whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                  isActive
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 active:text-slate-200'
                }`
              }
            >
              <span className="[&>svg]:w-4 [&>svg]:h-4">{item.icon}</span>
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
