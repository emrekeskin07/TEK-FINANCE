export const THEME_STORAGE_KEY = 'tek-finance:active-theme';
export const DEFAULT_THEME_ID = 'deep-ocean';

export const THEME_PRESETS = {
  'deep-ocean': {
    id: 'deep-ocean',
    label: 'Deep Ocean',
    swatch: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 52%, #10b981 100%)',
    vars: {
      '--primary': '167 139 250',
      '--secondary': '236 72 153',
      '--accent': '16 185 129',
      '--bg-card': '28 34 48',
      '--bg-page': '16 20 29',
      '--text-main': '241 245 249',
      '--text-muted': '209 213 219',
    },
  },
  'cyber-pink': {
    id: 'cyber-pink',
    label: 'Cyber Pink',
    swatch: 'linear-gradient(135deg, #ec4899 0%, #a78bfa 56%, #10b981 100%)',
    vars: {
      '--primary': '236 72 153',
      '--secondary': '167 139 250',
      '--accent': '16 185 129',
      '--bg-card': '34 22 46',
      '--bg-page': '16 20 29',
      '--text-main': '248 250 252',
      '--text-muted': '216 220 229',
    },
  },
  'golden-premium': {
    id: 'golden-premium',
    label: 'Golden Premium',
    swatch: 'linear-gradient(135deg, #10b981 0%, #a78bfa 55%, #ec4899 100%)',
    vars: {
      '--primary': '16 185 129',
      '--secondary': '167 139 250',
      '--accent': '236 72 153',
      '--bg-card': '24 32 44',
      '--bg-page': '16 20 29',
      '--text-main': '243 244 246',
      '--text-muted': '209 213 219',
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
