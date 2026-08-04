import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "nf_dark_mode";

export type ThemeMode = "light" | "dark" | "system";

type ThemeContextType = {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
};

const ThemeCtx = createContext<ThemeContextType>({
  mode: "system",
  isDark: false,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val === "light" || val === "dark" || val === "system") {
        setModeState(val);
      }
    });
  }, []);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    await AsyncStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const isDark =
    mode === "dark" ? true :
    mode === "light" ? false :
    systemScheme === "dark";

  return (
    <ThemeCtx.Provider value={{ mode, isDark, setMode }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);

// ── Dark and Light color palettes ──────────────────────────────────────────
export const lightColors = {
  surface: "#FAFAFA",
  onSurface: "#121412",
  surfaceSecondary: "#FFFFFF",
  surfaceTertiary: "#F2F4F2",
  onSurfaceTertiary: "#4A544C",
  surfaceInverse: "#121412",
  onSurfaceInverse: "#FFFFFF",
  brand: "#5C715E",
  brandSecondary: "#E0E8E1",
  onBrandSecondary: "#2C3B30",
  brandTertiary: "#ECF0ED",
  success: "#4B7A54",
  warning: "#C28E3A",
  error: "#A85751",
  border: "#E5E5E5",
  borderStrong: "#CCCCCC",
  textSecondary: "#4A544C",
  textMuted: "#8A8F8B",
};

export const darkColors = {
  surface: "#0F1410",
  onSurface: "#E8EDE9",
  surfaceSecondary: "#1A211B",
  surfaceTertiary: "#242C25",
  onSurfaceTertiary: "#A8B4A9",
  surfaceInverse: "#E8EDE9",
  onSurfaceInverse: "#0F1410",
  brand: "#7FA882",
  brandSecondary: "#2A3B2C",
  onBrandSecondary: "#B8D4BA",
  brandTertiary: "#1E2E20",
  success: "#6DB87A",
  warning: "#D4A855",
  error: "#C47570",
  border: "#2A342B",
  borderStrong: "#3A463B",
  textSecondary: "#A8B4A9",
  textMuted: "#6A756B",
};

// Hook to get current colors based on theme
export function useColors() {
  const { isDark } = useTheme();
  return isDark ? darkColors : lightColors;
}
