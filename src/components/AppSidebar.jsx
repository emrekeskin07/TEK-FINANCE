import React from 'react';
import SidebarMenu from './SidebarMenu';

export default function AppSidebar({
  activePage,
  isSidebarCollapsed,
  isSidebarOpen,
  setIsSidebarCollapsed,
  setIsSidebarOpen,
  onNavigate,
  user,
  onSignOut,
}) {
  return (
    <SidebarMenu
      activePage={activePage}
      isCollapsed={isSidebarCollapsed}
      isMobileOpen={isSidebarOpen}
      onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      onCloseMobile={() => setIsSidebarOpen(false)}
      onNavigate={onNavigate}
      user={user}
      onSignOut={onSignOut}
    />
  );
}
