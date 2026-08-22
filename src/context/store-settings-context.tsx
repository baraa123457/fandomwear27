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
  fetchStoreSettings,
  updateStoreSettings,
  DEFAULT_SETTINGS,
  type StoreSettings,
} from "@/lib/supabase/queries/store-settings";

interface StoreSettingsContextValue {
  settings: StoreSettings;
  isLoading: boolean;
  /** Admin-only write (RLS enforced). Optimistic update + rollback on failure. */
  updateSettings: (patch: Partial<StoreSettings>) => Promise<void>;
}

const StoreSettingsContext = createContext<StoreSettingsContextValue | null>(null);

export function StoreSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const result = await fetchStoreSettings(supabase);
        if (!cancelled) setSettings(result);
      } catch (err) {
        console.warn("[store-settings] Failed to load:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(
    async (patch: Partial<StoreSettings>) => {
      const previous = settings;
      // Optimistic update.
      setSettings((prev) => ({ ...prev, ...patch }));
      try {
        const supabase = createClient();
        await updateStoreSettings(supabase, patch);
      } catch (err) {
        // Roll back.
        setSettings(previous);
        throw err;
      }
    },
    [settings]
  );

  const value = useMemo(
    () => ({ settings, isLoading, updateSettings: update }),
    [settings, isLoading, update]
  );

  return (
    <StoreSettingsContext.Provider value={value}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  const ctx = useContext(StoreSettingsContext);
  if (!ctx)
    throw new Error("useStoreSettings must be used within StoreSettingsProvider");
  return ctx;
}

export type { StoreSettings };
