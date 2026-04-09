import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";
type ThemeMode = Theme | "system";

type ThemeContextValue = {
  themeMode: ThemeMode;
  resolvedTheme: Theme;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const storageKey = "csedu_nexus_theme";

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(mode: ThemeMode): Theme {
  return mode === "system" ? getSystemTheme() : mode;
}

function getInitialThemeMode(): ThemeMode {
  const stored = localStorage.getItem(storageKey);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);
  const [resolvedTheme, setResolvedTheme] = useState<Theme>(() => resolveTheme(getInitialThemeMode()));

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyResolvedTheme = () => setResolvedTheme(resolveTheme(themeMode));

    applyResolvedTheme();
    mediaQuery.addEventListener("change", applyResolvedTheme);

    return () => {
      mediaQuery.removeEventListener("change", applyResolvedTheme);
    };
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
    localStorage.setItem(storageKey, themeMode);
  }, [resolvedTheme, themeMode]);

  function toggleTheme() {
    setThemeMode((current) => {
      const source = current === "system" ? getSystemTheme() : current;
      return source === "dark" ? "light" : "dark";
    });
  }

  const value = useMemo(() => ({ themeMode, resolvedTheme, setThemeMode, toggleTheme }), [themeMode, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
