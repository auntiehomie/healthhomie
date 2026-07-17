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
  chipBackground: string;
  chipText: string;
};

// A cooler, neutral-gray-plus-indigo palette closer to Linear/Notion/Todoist than the
// original warm cream-and-green look.
export const lightColors: ThemeColors = {
  background: '#f5f6fa',
  surface: '#ffffff',
  surfaceAlt: '#eef0f6',
  border: '#e3e6ee',
  text: '#15171f',
  textMuted: '#5c6270',
  primary: '#5850ec',
  onPrimary: '#ffffff',
  danger: '#dc4c4c',
  success: '#1f9d63',
  chipBackground: '#eef0f6',
  chipText: '#383c48',
};

export const darkColors: ThemeColors = {
  background: '#0e0f14',
  surface: '#181a22',
  surfaceAlt: '#20232d',
  border: '#2b2f3b',
  text: '#f3f4f8',
  textMuted: '#9aa0b1',
  primary: '#8b84f7',
  onPrimary: '#12131a',
  danger: '#f2716f',
  success: '#3ecb8c',
  chipBackground: '#20232d',
  chipText: '#d7d9e3',
};
