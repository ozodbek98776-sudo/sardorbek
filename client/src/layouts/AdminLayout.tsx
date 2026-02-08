import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar, { adminMenuItems } from '../components/Sidebar';
import BottomNavigation from '../components/BottomNavigation';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #ede9fe 100%)' }}>
      {/* Desktop Sidebar - automatically hidden on mobile */}
      <Sidebar 
        items={adminMenuItems} 
        basePath="/admin" 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
      />
      
      {/* Main Content */}
      <main className={`
        transition-all duration-300 ease-smooth
        
        /* Desktop: margin for sidebar */
        lg:ml-64
        ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}
        
        /* Mobile: NO sidebar, only bottom nav space */
        ml-0
        
        /* Mobile bottom navigation space */
        pb-[88px] lg:pb-0
        
        /* Responsive min-height - FULL SCREEN */
        min-h-screen
        
        /* Remove all padding - FULL CONTENT */
        p-0 m-0
      `}>
        {/* Remove max-width constraint and padding */}
        <div className="w-full h-full">
          <Outlet />
        </div>
      </main>
      
      {/* Mobile Bottom Navigation - ONLY on small screens */}
      <div className="lg:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
}
