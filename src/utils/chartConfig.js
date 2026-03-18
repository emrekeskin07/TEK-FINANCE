export const CHART_THEME = {
  palette: ['#10b981', '#fbbf24', '#06b6d4', '#6366f1', '#f43f5e', '#14b8a6', '#eab308', '#3b82f6'],
  categoryPalette: ['#10b981', '#f59e0b', '#06b6d4', '#6366f1', '#e11d48'],
  physicalAssetsColor: '#f59e0b',
  lineStrokeColor: '#93c5fd',
  gridStroke: 'rgba(255,255,255,0.05)',
  axisStroke: '#94a3b8',
  fontFamily: "'Manrope', 'Segoe UI', sans-serif",
  legendFontSize: 12,
  axisFontSize: 12,
  lineGradientStops: [
    { offset: '0%', color: '#93c5fd', opacity: 0.44 },
    { offset: '45%', color: '#99f6e4', opacity: 0.2 },
    { offset: '100%', color: '#99f6e4', opacity: 0 },
  ],
};

export const CHART_ANIMATION = {
  duration: 1500,
  easing: 'ease-in-out',
  lineBegin: 120,
};

export const CHART_DONUT = {
  innerRadius: 66,
  outerRadius: 82,
  paddingAngle: 6,
  animationDuration: 800,
  activeOuterScale: 1.15,
  shadowOpacity: 0.38,
  shadowBlur: 4.6,
  spring: {
    stiffness: 220,
    damping: 20,
    mass: 0.75,
  },
};

export const CHART_LINE = {
  strokeWidth: 3,
  activeDot: { r: 6, strokeWidth: 0 },
};

export const lightenHex = (hexColor, factor = 0.16) => {
  const sanitized = String(hexColor || '').replace('#', '');
  const full = sanitized.length === 3
    ? sanitized.split('').map((char) => char + char).join('')
    : sanitized;

  if (full.length !== 6) {
    return hexColor;
  }

  const toLightenedChannel = (channelHex) => {
    const channel = parseInt(channelHex, 16);
    const lightened = Math.round(channel + (255 - channel) * factor);
    return Math.max(0, Math.min(255, lightened));
  };

  const r = toLightenedChannel(full.slice(0, 2));
  const g = toLightenedChannel(full.slice(2, 4));
  const b = toLightenedChannel(full.slice(4, 6));

  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
};

export const darkenHex = (hexColor, factor = 0.22) => {
  const sanitized = String(hexColor || '').replace('#', '');
  const full = sanitized.length === 3
    ? sanitized.split('').map((char) => char + char).join('')
    : sanitized;

  if (full.length !== 6) {
    return hexColor;
  }

  const toDarkenedChannel = (channelHex) => {
    const channel = parseInt(channelHex, 16);
    const darkened = Math.round(channel * (1 - factor));
    return Math.max(0, Math.min(255, darkened));
  };

  const r = toDarkenedChannel(full.slice(0, 2));
  const g = toDarkenedChannel(full.slice(2, 4));
  const b = toDarkenedChannel(full.slice(4, 6));

  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
};
