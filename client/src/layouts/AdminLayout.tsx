import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar, { adminMenuItems } from '../components/Sidebar';
import BottomNavigation from '../components/BottomNavigation';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #ede9fe 100%)' }}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          items={adminMenuItems} 
          basePath="/admin" 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
        />
      </div>
      
      {/* Main Content */}
      <main className={`transition-all duration-300 ease-smooth ${
        collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
      }`}>
        <Outlet />
      </main>
      
      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
