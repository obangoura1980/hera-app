import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@/src/utils/async-storage';
import { LightColors, DarkColors, ThemeColors } from '@/constants/theme';

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = '@hera_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // 'dark' | 'light' | null
  const [isDark, setIsDark] = useState(systemScheme !== 'light'); // follow system on first render

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then(v => {
        if (v !== null) {
          // User has manually overridden — respect their choice
          setIsDark(v === 'dark');
        } else {
          // No manual override — follow system theme
          setIsDark(systemScheme !== 'light');
        }
      })
      .catch(() => { setIsDark(systemScheme !== 'light'); });
  }, [systemScheme]);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? DarkColors : LightColors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
