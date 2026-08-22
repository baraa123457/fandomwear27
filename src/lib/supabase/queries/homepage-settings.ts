import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export interface HomepageSettings {
  heroProduct1: string | null;
  heroProduct2: string | null;
  heroProduct3: string | null;
  bestsellerMode: "auto" | "custom";
  bestsellerProductIds: string[];
}

const STORAGE_KEY = "fandomwear:homepage-settings";

const DEFAULT_SETTINGS: HomepageSettings = {
  heroProduct1: null,
  heroProduct2: null,
  heroProduct3: null,
  bestsellerMode: "auto",
  bestsellerProductIds: [],
};

/**
 * Reads the single homepage_settings row (id = 1, seeded by migration
 * 20260816000017). Public read (RLS). Fallback to local storage if the
 * table has not been created on Supabase yet.
 */
export async function fetchHomepageSettings(
  client: Client
): Promise<HomepageSettings> {
  try {
    const { data, error } = await client
      .from("homepage_settings")
      .select("hero_product_1, hero_product_2, hero_product_3, bestseller_mode, bestseller_product_ids")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      if (
        error.code === "PGRST205" ||
        error.code === "PGRST204" ||
        error.message?.includes("schema cache") ||
        error.message?.includes("homepage_settings")
      ) {
        // Fallback query if columns are not yet in Supabase cache
        try {
          const fallbackRes = await client
            .from("homepage_settings")
            .select("hero_product_1, hero_product_2, hero_product_3")
            .eq("id", 1)
            .maybeSingle();
          if (fallbackRes.data) {
            const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
            const parsed = raw ? JSON.parse(raw) : {};
            return {
              heroProduct1: fallbackRes.data.hero_product_1 ?? null,
              heroProduct2: fallbackRes.data.hero_product_2 ?? null,
              heroProduct3: fallbackRes.data.hero_product_3 ?? null,
              bestsellerMode: parsed.bestsellerMode ?? "auto",
              bestsellerProductIds: parsed.bestsellerProductIds ?? [],
            };
          }
        } catch {
          /* pass to local storage fallback */
        }

        if (typeof window !== "undefined") {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        }
        return DEFAULT_SETTINGS;
      }
      throw error;
    }

    const localRaw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const localParsed = localRaw ? JSON.parse(localRaw) : {};

    return {
      heroProduct1: data?.hero_product_1 ?? null,
      heroProduct2: data?.hero_product_2 ?? null,
      heroProduct3: data?.hero_product_3 ?? null,
      bestsellerMode: (data?.bestseller_mode as "auto" | "custom") ?? localParsed.bestsellerMode ?? "auto",
      bestsellerProductIds: (data?.bestseller_product_ids as string[]) ?? localParsed.bestsellerProductIds ?? [],
    };
  } catch {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
    return DEFAULT_SETTINGS;
  }
}

/**
 * Updates homepage settings. Writes to Supabase homepage_settings,
 * with fallback to local storage if the table / column does not exist in Supabase.
 */
export async function updateHomepageSettings(
  client: Client,
  patch: Partial<HomepageSettings>
): Promise<void> {
  const rowPatch: Database["public"]["Tables"]["homepage_settings"]["Update"] = {};

  if (patch.heroProduct1 !== undefined) rowPatch.hero_product_1 = patch.heroProduct1;
  if (patch.heroProduct2 !== undefined) rowPatch.hero_product_2 = patch.heroProduct2;
  if (patch.heroProduct3 !== undefined) rowPatch.hero_product_3 = patch.heroProduct3;
  if (patch.bestsellerMode !== undefined) rowPatch.bestseller_mode = patch.bestsellerMode;
  if (patch.bestsellerProductIds !== undefined) rowPatch.bestseller_product_ids = patch.bestsellerProductIds;

  // Always write to local storage as immediate cache & fallback
  if (typeof window !== "undefined") {
    const current = localStorage.getItem(STORAGE_KEY);
    const parsed = current ? JSON.parse(current) : {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, ...patch }));
  }

  try {
    const { error } = await client
      .from("homepage_settings")
      .update(rowPatch)
      .eq("id", 1);

    if (error) {
      if (
        error.code === "PGRST205" ||
        error.code === "PGRST204" ||
        error.message?.includes("schema cache") ||
        error.message?.includes("column") ||
        error.message?.includes("homepage_settings")
      ) {
        // Fallback for hero-only columns if bestseller columns not yet applied in Supabase
        const safePatch: Database["public"]["Tables"]["homepage_settings"]["Update"] = {};
        if (patch.heroProduct1 !== undefined) safePatch.hero_product_1 = patch.heroProduct1;
        if (patch.heroProduct2 !== undefined) safePatch.hero_product_2 = patch.heroProduct2;
        if (patch.heroProduct3 !== undefined) safePatch.hero_product_3 = patch.heroProduct3;
        if (Object.keys(safePatch).length > 0) {
          await client.from("homepage_settings").update(safePatch).eq("id", 1);
        }
        return;
      }
      throw error;
    }
  } catch (err) {
    console.warn("[homepage-settings] Saved to local storage:", err);
  }
}
