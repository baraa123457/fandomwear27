"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchHomepageSettings,
  updateHomepageSettings,
  type HomepageSettings,
} from "@/lib/supabase/queries/homepage-settings";

export type HeroProductIds = [
  string | null,
  string | null,
  string | null,
];

interface HomepageSettingsContextValue {
  heroProductIds: HeroProductIds;
  bestsellerMode: "auto" | "custom";
  bestsellerProductIds: string[];
  isLoading: boolean;
  setHeroProducts: (ids: HeroProductIds) => Promise<void>;
  setBestsellerSettings: (mode: "auto" | "custom", ids: string[]) => Promise<void>;
}

const HomepageSettingsContext =
  createContext<HomepageSettingsContextValue | null>(null);

const STORAGE_KEY = "fandomwear:homepage-settings";

const DEFAULT_SETTINGS: HomepageSettings = {
  heroProduct1: null,
  heroProduct2: null,
  heroProduct3: null,
  bestsellerMode: "auto",
  bestsellerProductIds: [],
};

function getInitialSettings(): HomepageSettings {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(cached) };
      }
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_SETTINGS;
}

export function HomepageSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<HomepageSettings>(getInitialSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const result = await fetchHomepageSettings(supabase);
        if (!cancelled) {
          setSettings(result);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
          } catch {
            /* ignore */
          }
        }
      } catch (err) {
        console.warn("[homepage-settings] Failed to load:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);


  const setHeroProducts = useCallback(
    async (ids: HeroProductIds) => {
      const previous = settings;
      const next: HomepageSettings = {
        ...settings,
        heroProduct1: ids[0],
        heroProduct2: ids[1],
        heroProduct3: ids[2],
      };

      setSettings(next);
      try {
        const supabase = createClient();
        await updateHomepageSettings(supabase, next);
      } catch (err) {
        setSettings(previous);
        throw err;
      }
    },
    [settings]
  );

  const setBestsellerSettings = useCallback(
    async (mode: "auto" | "custom", ids: string[]) => {
      const previous = settings;
      const next: HomepageSettings = {
        ...settings,
        bestsellerMode: mode,
        bestsellerProductIds: ids,
      };

      setSettings(next);
      try {
        const supabase = createClient();
        await updateHomepageSettings(supabase, {
          bestsellerMode: mode,
          bestsellerProductIds: ids,
        });
      } catch (err) {
        setSettings(previous);
        throw err;
      }
    },
    [settings]
  );

  return (
    <HomepageSettingsContext.Provider
      value={{
        heroProductIds: [
          settings.heroProduct1,
          settings.heroProduct2,
          settings.heroProduct3,
        ],
        bestsellerMode: settings.bestsellerMode,
        bestsellerProductIds: settings.bestsellerProductIds,
        isLoading,
        setHeroProducts,
        setBestsellerSettings,
      }}
    >
      {children}
    </HomepageSettingsContext.Provider>
  );
}

export function useHomepageSettings() {
  const ctx = useContext(HomepageSettingsContext);
  if (!ctx) {
    throw new Error(
      "useHomepageSettings must be used inside HomepageSettingsProvider"
    );
  }
  return ctx;
}
