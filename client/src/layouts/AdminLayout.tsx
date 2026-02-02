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
      <main className={`
        transition-all duration-300 ease-smooth
        lg:ml-64
        ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}
        
        /* Mobile bottom navigation space */
        2xs:pb-[88px] xs:pb-[88px] sm:pb-[88px] md:pb-0
        
        /* Responsive min-height */
        min-h-screen
      `}>
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
