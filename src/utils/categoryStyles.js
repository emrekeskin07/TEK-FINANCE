export const CATEGORY_COLORS = {
  'Hisse Senedi': '#a5b4fc',
  'Yatırım Fonu': '#fde68a',
  'Döviz': '#86efac',
  'Değerli Madenler': '#fdba74',
  'Emtia/Altın': '#fdba74',
  'Kripto': '#f9a8d4',
  'Nakit': '#c4b5fd',
  'Nakit/Banka': '#99f6e4',
  'Diğer': '#cbd5e1',
};

const hexToRgb = (hex) => {
  const sanitized = hex.replace('#', '');
  const full = sanitized.length === 3
    ? sanitized.split('').map((char) => char + char).join('')
    : sanitized;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  return { r, g, b };
};

export const getCategoryColor = (category) => CATEGORY_COLORS[category] || CATEGORY_COLORS['Diğer'];

export const getCategoryBadgeStyle = (category, isSelected = false) => {
  const color = getCategoryColor(category);
  const { r, g, b } = hexToRgb(color);

  return {
    color,
    borderColor: `rgba(${r}, ${g}, ${b}, ${isSelected ? 0.7 : 0.42})`,
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${isSelected ? 0.22 : 0.12})`,
  };
};
