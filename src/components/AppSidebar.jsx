import React from 'react';
import SidebarMenu from './SidebarMenu';

export default function AppSidebar({
  activeTab,
  setActiveTab,
  isSidebarCollapsed = false,
  isSidebarOpen = false,
  setIsSidebarCollapsed = () => {},
  setIsSidebarOpen = () => {},
  user = null,
  onSignOut = () => {},
}) {
  return (
    <div className="w-64 z-50 h-full">
      <SidebarMenu
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isSidebarOpen}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onCloseMobile={() => setIsSidebarOpen(false)}
        onNavigate={setActiveTab}
        user={user}
        onSignOut={onSignOut}
      />
    </div>
  );
}
