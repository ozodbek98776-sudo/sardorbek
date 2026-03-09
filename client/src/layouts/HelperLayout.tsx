import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar, { helperMenuItems } from '../components/Sidebar';
import MobileNavBar from '../components/MobileNavBar';
import SwipeNavigator from '../components/SwipeNavigator';

export default function HelperLayout() {
  const [collapsed, setCollapsed] = useState(false);

  const handleMenuToggle = () => {
    if ((window as unknown as { toggleSidebar?: () => void }).toggleSidebar) {
      (window as unknown as { toggleSidebar: () => void }).toggleSidebar();
    }
  };

  return (
    <div className="min-h-screen bg-surface-50">
      <SwipeNavigator navItems={helperMenuItems} basePath="/helper" />
      <Sidebar
        items={helperMenuItems}
        basePath="/helper"
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Mobile Top NavBar */}
      <MobileNavBar items={helperMenuItems} basePath="/helper" />

      <main className={`
        transition-[margin-left] duration-300 ease-smooth
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
