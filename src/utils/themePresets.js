export const THEME_STORAGE_KEY = 'tek-finance:active-theme';
export const DEFAULT_THEME_ID = 'deep-ocean';

export const THEME_PRESETS = {
  'deep-ocean': {
    id: 'deep-ocean',
    label: 'Deep Ocean',
    swatch: 'linear-gradient(135deg, #0ea5e9 0%, #14b8a6 60%, #22c55e 100%)',
    vars: {
      '--primary': '14 165 233',
      '--secondary': '20 184 166',
      '--accent': '16 185 129',
      '--bg-card': '15 23 42',
      '--bg-page': '11 17 32',
      '--text-main': '226 232 240',
      '--text-muted': '148 163 184',
    },
  },
  'cyber-pink': {
    id: 'cyber-pink',
    label: 'Cyber Pink',
    swatch: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 45%, #f472b6 100%)',
    vars: {
      '--primary': '217 70 239',
      '--secondary': '168 85 247',
      '--accent': '244 114 182',
      '--bg-card': '36 18 56',
      '--bg-page': '19 11 34',
      '--text-main': '244 244 255',
      '--text-muted': '196 181 253',
    },
  },
  'golden-premium': {
    id: 'golden-premium',
    label: 'Golden Premium',
    swatch: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 55%, #fcd34d 100%)',
    vars: {
      '--primary': '245 158 11',
      '--secondary': '251 191 36',
      '--accent': '252 211 77',
      '--bg-card': '26 20 12',
      '--bg-page': '10 10 12',
      '--text-main': '250 245 230',
      '--text-muted': '214 199 160',
    },
  },
};

export const THEME_OPTIONS = Object.values(THEME_PRESETS);

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

  document.documentElement.setAttribute('data-theme', resolvedThemeId);
  return resolvedThemeId;
};
