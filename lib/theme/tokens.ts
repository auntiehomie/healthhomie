export type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  danger: string;
  success: string;
  warning: string;
  chipBackground: string;
  chipText: string;
};

// Monochromatic blue: every neutral (background/surface/border/text) is a blue-tinted gray from
// the same hue family as the accent, rather than a true neutral gray — one hue, varying shades
// and tints, per the "monochromatic" palette structure. danger/success/warning stay as their
// conventional red/green/amber since overriding those hurts usability more than it helps
// cohesion (error states in blue read as "not actually an error").
export const lightColors: ThemeColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceAlt: '#f1f5f9',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  primary: '#2563eb',
  onPrimary: '#ffffff',
  danger: '#dc2626',
  success: '#059669',
  warning: '#d97706',
  chipBackground: '#f1f5f9',
  chipText: '#334155',
};

export const darkColors: ThemeColors = {
  background: '#020617',
  surface: '#0f172a',
  surfaceAlt: '#1e293b',
  border: '#334155',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  primary: '#3b82f6',
  onPrimary: '#ffffff',
  danger: '#f87171',
  success: '#34d399',
  warning: '#fbbf24',
  chipBackground: '#1e293b',
  chipText: '#e2e8f0',
};
