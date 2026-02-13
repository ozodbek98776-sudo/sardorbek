import { useState } from 'react';
import { Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { LogOut, Sparkles, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar, { helperMenuItems } from '../components/Sidebar';

export default function HelperLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleMenuToggle = () => {
    if ((window as any).toggleSidebar) {
      (window as any).toggleSidebar();
    }
  };

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Sidebar */}
      <Sidebar 
        items={helperMenuItems} 
        basePath="/helper" 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
      />
      
      {/* Main Content */}
      <main className={`
        transition-all duration-300 ease-smooth
        ${collapsed ? 'lg:ml-0' : 'lg:ml-64'}
        ml-0
        min-h-screen
        p-0 m-0
      `}>
        <div className="w-full h-full">
          <Outlet context={{ onMenuToggle: handleMenuToggle }} />
        </div>
      </main>
    </div>
  );
}
