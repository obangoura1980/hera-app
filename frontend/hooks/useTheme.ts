import { useContext } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import { DarkColors } from '@/constants/theme';

/** Returns current theme colors, isDark flag, and toggleTheme action. */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { isDark: true, colors: DarkColors, toggleTheme: () => {} };
  return ctx;
}
