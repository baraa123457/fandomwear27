import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export interface HomepageSettings {
  heroProduct1: string | null;
  heroProduct2: string | null;
  heroProduct3: string | null;
}

/**
 * Reads the single homepage_settings row (id = 1, seeded by migration
 * 20260816000017). Public read (RLS), so this works for signed-out
 * storefront visitors as well as the admin dashboard.
 */
export async function fetchHomepageSettings(
  client: Client
): Promise<HomepageSettings> {
  const { data, error } = await client
    .from("homepage_settings")
    .select("hero_product_1, hero_product_2, hero_product_3")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error;

  return {
    heroProduct1: data?.hero_product_1 ?? null,
    heroProduct2: data?.hero_product_2 ?? null,
    heroProduct3: data?.hero_product_3 ?? null,
  };
}

/**
 * Updates the Hero product picks. RLS restricts this to admins (see
 * migration 20260816000017) — a non-admin caller gets an empty/blocked
 * update, surfaced as a Supabase error here.
 */
export async function updateHomepageSettings(
  client: Client,
  patch: Partial<HomepageSettings>
): Promise<void> {
  const rowPatch: Database["public"]["Tables"]["homepage_settings"]["Update"] =
    {};

  if (patch.heroProduct1 !== undefined) rowPatch.hero_product_1 = patch.heroProduct1;
  if (patch.heroProduct2 !== undefined) rowPatch.hero_product_2 = patch.heroProduct2;
  if (patch.heroProduct3 !== undefined) rowPatch.hero_product_3 = patch.heroProduct3;

  const { error } = await client
    .from("homepage_settings")
    .update(rowPatch)
    .eq("id", 1);

  if (error) throw error;
}
