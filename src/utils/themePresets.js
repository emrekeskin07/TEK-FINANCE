export const THEME_STORAGE_KEY = 'tek-finance:active-theme';
export const DEFAULT_THEME_ID = 'light-soft';

export const THEME_PRESETS = {
  'light-soft': {
    id: 'light-soft',
    label: 'Light Soft',
    mode: 'light',
    swatch: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 58%, #f5f3ff 100%)',
    vars: {
      '--primary': '79 70 229',
      '--secondary': '109 40 217',
      '--accent': '124 58 237',
      '--bg-card': '255 255 255',
      '--bg-page': '248 249 250',
      '--text-main': '17 24 39',
      '--text-muted': '71 85 105',
    },
  },
  'deep-ocean': {
    id: 'deep-ocean',
    label: 'Deep Ocean',
    mode: 'dark',
    swatch: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 55%, #a78bfa 100%)',
    vars: {
      '--primary': '139 92 246',
      '--secondary': '217 70 239',
      '--accent': '232 121 249',
      '--bg-card': '15 23 42',
      '--bg-page': '2 6 23',
      '--text-main': '248 250 252',
      '--text-muted': '148 163 184',
    },
  },
  'cyber-pink': {
    id: 'cyber-pink',
    label: 'Cyber Pink',
    mode: 'dark',
    swatch: 'linear-gradient(135deg, #d946ef 0%, #a855f7 56%, #8b5cf6 100%)',
    vars: {
      '--primary': '217 70 239',
      '--secondary': '168 85 247',
      '--accent': '192 132 252',
      '--bg-card': '15 23 42',
      '--bg-page': '2 6 23',
      '--text-main': '248 250 252',
      '--text-muted': '148 163 184',
    },
  },
  'golden-premium': {
    id: 'golden-premium',
    label: 'Golden Premium',
    mode: 'dark',
    swatch: 'linear-gradient(135deg, #7c3aed 0%, #c026d3 58%, #a855f7 100%)',
    vars: {
      '--primary': '124 58 237',
      '--secondary': '192 38 211',
      '--accent': '168 85 247',
      '--bg-card': '15 23 42',
      '--bg-page': '2 6 23',
      '--text-main': '248 250 252',
      '--text-muted': '148 163 184',
    },
  },
};

export const THEME_OPTIONS = Object.values(THEME_PRESETS);
export const isDarkThemeId = (themeId) => THEME_PRESETS[resolveThemeId(themeId)]?.mode === 'dark';

export const resolveThemeId = (themeId) => (
  THEME_PRESETS[themeId] ? themeId : DEFAULT_THEME_ID
);

export const applyThemeToRoot = (themeId) => {
  if (typeof window === 'undefined') {
    return resolveThemeId(themeId);
  }

  const resolvedThemeId = resolveThemeId(themeId);
  const theme = THEME_PRESETS[resolvedThemeId];

  Object.entries(theme.vars).forEach(([cssVar, cssValue]) => {
    document.documentElement.style.setProperty(cssVar, cssValue);
  });

  const isDarkMode = theme.mode === 'dark';
  // Ensure only one mode class exists to prevent dark:* utility leakage.
  document.documentElement.classList.remove('dark', 'light');
  document.documentElement.classList.add(isDarkMode ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', resolvedThemeId);
  return resolvedThemeId;
};
