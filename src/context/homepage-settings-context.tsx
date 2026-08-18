"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchHomepageSettings,
  updateHomepageSettings,
  type HomepageSettings,
} from "@/lib/supabase/queries/homepage-settings";

/**
 * The 3 admin-selected Hero product ids, in display order. `null` means
 * that slot hasn't been picked yet — callers (the Hero itself) decide
 * the fallback, this context only ever reports the real saved state.
 *
 * Deliberately unrelated to Best Sellers/product_sales_counts — this is
 * manual curation for the homepage Hero only.
 */
export type HeroProductIds = [
  string | null,
  string | null,
  string | null,
];

interface HomepageSettingsContextValue {
  heroProductIds: HeroProductIds;
  isLoading: boolean;
  /** Admin-only write (enforced by RLS — see migration 20260816000017).
   *  Optimistic like the rest of the admin's writes; rolls back and
   *  rethrows on failure so the caller can show an error. */
  setHeroProducts: (ids: HeroProductIds) => Promise<void>;
}

const HomepageSettingsContext =
  createContext<HomepageSettingsContextValue | null>(null);

const EMPTY_SETTINGS: HomepageSettings = {
  heroProduct1: null,
  heroProduct2: null,
  heroProduct3: null,
};

export function HomepageSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<HomepageSettings>(EMPTY_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const result = await fetchHomepageSettings(supabase);
        if (!cancelled) setSettings(result);
      } catch (err) {
        // Public read should basically never fail; if it does, the Hero
        // falls back to catalog products (see hero.tsx) rather than
        // breaking the homepage.
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

  const value = useMemo(
    () => ({
      heroProductIds: [
        settings.heroProduct1,
        settings.heroProduct2,
        settings.heroProduct3,
      ] as HeroProductIds,
      isLoading,
      setHeroProducts,
    }),
    [settings, isLoading, setHeroProducts]
  );

  return (
    <HomepageSettingsContext.Provider value={value}>
      {children}
    </HomepageSettingsContext.Provider>
  );
}

export function useHomepageSettings() {
  const ctx = useContext(HomepageSettingsContext);
  if (!ctx) {
    throw new Error(
      "useHomepageSettings must be used within a HomepageSettingsProvider"
    );
  }
  return ctx;
}
