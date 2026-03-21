import React from 'react';
import SettingsPage from '../components/SettingsPage';

export default function SettingsPageRoute({
  user,
  activeTheme,
  isDarkThemeId,
  handleSetThemeMode,
  baseCurrency,
  setBaseCurrency,
  isPrivacyActive,
  setIsPrivacyActive,
  insightTone,
  setInsightTone,
  handleClearAllUserData,
}) {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <SettingsPage
        user={user}
        isDarkMode={isDarkThemeId(activeTheme)}
        setThemeMode={handleSetThemeMode}
        baseCurrency={baseCurrency}
        setBaseCurrency={setBaseCurrency}
        isPrivacyActive={isPrivacyActive}
        setPrivacyActive={setIsPrivacyActive}
        insightTone={insightTone}
        setInsightTone={setInsightTone}
        onClearAllData={handleClearAllUserData}
      />
    </div>
  );
}
