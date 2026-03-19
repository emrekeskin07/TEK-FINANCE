export const THEME_STORAGE_KEY = 'tek-finance:active-theme';
export const DEFAULT_THEME_ID = 'deep-ocean';

export const THEME_PRESETS = {
  'deep-ocean': {
    id: 'deep-ocean',
    label: 'Deep Ocean',
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
