import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorTokens = typeof Colors.light | typeof Colors.dark;

interface ThemeContextType {
  themeMode: ThemeMode;
  activeTheme: 'light' | 'dark';
  colors: ColorTokens;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const THEME_FILE = (FileSystem.documentDirectory ?? '') + 'theme_preference.txt';

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  activeTheme: 'light',
  colors: Colors.light,
  isDark: false,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const systemScheme = colorScheme ?? 'light';
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  // Load saved theme preference on start
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined' && window.localStorage) {
            const saved = window.localStorage.getItem('moonflow_theme') || window.localStorage.getItem('moonhub_theme');
            if (saved === 'light' || saved === 'dark' || saved === 'system') {
              setThemeModeState(saved as ThemeMode);
            }
          }
          return;
        }

        if (!FileSystem.documentDirectory) return;
        const info = await FileSystem.getInfoAsync(THEME_FILE);
        if (info.exists) {
          const saved = await FileSystem.readAsStringAsync(THEME_FILE);
          if (saved === 'light' || saved === 'dark' || saved === 'system') {
            setThemeModeState(saved as ThemeMode);
          }
        }
      } catch {
        // ignore load errors
      }
    })();
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('moonflow_theme', mode);
        }
        return;
      }
      if (FileSystem.documentDirectory) {
        await FileSystem.writeAsStringAsync(THEME_FILE, mode);
      }
    } catch {
      // ignore write errors
    }
  }, []);

  const activeTheme: 'light' | 'dark' = useMemo(() => {
    if (themeMode === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  }, [themeMode, systemScheme]);

  const toggleTheme = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // web ignore
    }
    const nextTheme: ThemeMode = activeTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(nextTheme);
  }, [activeTheme, setThemeMode]);

  const isDark = activeTheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const value = useMemo(
    () => ({
      themeMode,
      activeTheme,
      colors,
      isDark,
      toggleTheme,
      setThemeMode,
    }),
    [themeMode, activeTheme, colors, isDark, toggleTheme, setThemeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
