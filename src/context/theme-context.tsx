"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "fandomwear:theme";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * FandomWear is dark-by-default (per the brand spec), with an optional light
 * mode. A small blocking script in the document head (see layout.tsx) applies
 * the saved theme class before paint so there's no flash of the wrong theme.
 */
/**
 * Read the saved theme synchronously on the client so the initial React state
 * already matches what the blocking <script> in <head> applied to <html>.
 * This prevents the one-frame flash where the "dark" default briefly removes
 * the "light" class that the inline script already set.
 *
 * On the server (SSR) we always return "dark"; the inline script and
 * suppressHydrationWarning on <html> handle the mismatch transparently.
 */
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* storage blocked */
  }
  return "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer reads localStorage on the very first client render,
  // so `theme` is already correct before any effect runs.
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);


  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* storage unavailable — theme still switches for this session */
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
