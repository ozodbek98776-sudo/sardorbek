import { useState } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import Sidebar, { adminMenuItems } from '../components/Sidebar';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  const handleMenuToggle = () => {
    // Call global function to open mobile sidebar
    if ((window as any).toggleSidebar) {
      (window as any).toggleSidebar();
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #ede9fe 100%)' }}>
      {/* Sidebar */}
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
        ${collapsed ? 'lg:ml-0' : 'lg:ml-64'}
        
        /* Mobile: NO margin (sidebar is overlay) */
        ml-0
        
        /* Full height */
        min-h-screen
        
        /* No padding */
        p-0 m-0
      `}>
        <div className="w-full h-full">
          <Outlet context={{ onMenuToggle: handleMenuToggle }} />
        </div>
      </main>
    </div>
  );
}
