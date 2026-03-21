import React from 'react';
import Header from './Header';

export default function AppNavbar({
  isSidebarCollapsed,
  setIsSidebarOpen,
  user,
  onSignOut,
  onOpenSettings,
  onSearchNavigate,
  isPrivacyActive,
  onTogglePrivacy,
}) {
  return (
    <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-[86px]' : 'lg:ml-[272px]'}`}>
      <Header
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        user={user}
        onSignOut={onSignOut}
        onOpenSettings={onOpenSettings}
        onSearchNavigate={onSearchNavigate}
        isPrivacyActive={isPrivacyActive}
        onTogglePrivacy={onTogglePrivacy}
      />
    </div>
  );
}
