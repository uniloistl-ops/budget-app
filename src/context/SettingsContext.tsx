import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PaydaySettings } from "../types";

export type ThemeMode = "light" | "dark" | "system";
export type DetailLevel = "minimal" | "detailed";

export interface Settings {
  theme: ThemeMode;
  animations: boolean;
  fontScale: number; // 1 = default, 1.15 = large, 1.3 = extra large
  detailLevel: DetailLevel;
  payday: PaydaySettings | null;
}

const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  animations: true,
  fontScale: 1,
  detailLevel: "minimal",
  payday: null,
};

const STORAGE_KEY = "calm-budget:settings";

interface SettingsContextValue {
  settings: Settings;
  resolvedTheme: "light" | "dark";
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme: "light" | "dark" =
    settings.theme === "system" ? (systemPrefersDark ? "dark" : "light") : settings.theme;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    const root = document.documentElement;
    if (settings.theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", settings.theme);
    }
    root.setAttribute("data-motion", settings.animations ? "on" : "off");
    root.style.setProperty("--font-scale", String(settings.fontScale));
  }, [settings]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      resolvedTheme,
      update: (key, val) => setSettings((s) => ({ ...s, [key]: val })),
    }),
    [settings, resolvedTheme]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
