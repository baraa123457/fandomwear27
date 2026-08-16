import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { UniverseInfo } from "@/lib/types";

type Client = SupabaseClient<Database>;
type UniverseRow = Database["public"]["Tables"]["universes"]["Row"];

function rowToUniverseInfo(row: UniverseRow): UniverseInfo {
  return {
    id: row.id,
    label: row.label,
    tagline: row.tagline,
    color: row.color,
    icon: row.icon,
    productCount: row.product_count,
  };
}

/** All universes, in the same shape the old `universes` array from
 * src/lib/data/universes.ts had. */
export async function fetchUniverses(client: Client): Promise<UniverseInfo[]> {
  const { data, error } = await client
    .from("universes")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(rowToUniverseInfo);
}

export async function insertUniverse(client: Client, universe: UniverseInfo): Promise<UniverseInfo> {
  const { data, error } = await client
    .from("universes")
    .insert({
      id: universe.id,
      label: universe.label,
      tagline: universe.tagline,
      color: universe.color,
      icon: universe.icon,
      product_count: universe.productCount,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToUniverseInfo(data);
}

export async function deleteUniverse(client: Client, id: string): Promise<void> {
  const { error } = await client.from("universes").delete().eq("id", id);
  if (error) throw error;
}
