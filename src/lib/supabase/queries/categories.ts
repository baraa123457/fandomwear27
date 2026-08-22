import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

const STORAGE_KEY = "fandomwear:catalog-categories";

/**
 * Fetch all category names from the `categories` table (migration
 * 20260822000020), ordered alphabetically. Public read (RLS).
 * Falls back to local storage if the table is not created in Supabase yet.
 */
export async function fetchCategories(client: Client): Promise<string[]> {
  try {
    const { data, error } = await client
      .from("categories")
      .select("name")
      .order("name", { ascending: true });

    if (error) {
      if (
        error.code === "PGRST205" ||
        error.message?.includes("schema cache") ||
        error.message?.includes("categories")
      ) {
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) return JSON.parse(raw);
        }
        return [];
      }
      throw error;
    }
    return (data ?? []).map((row) => row.name);
  } catch {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
    return [];
  }
}

/**
 * Insert a new category. Admin-only (RLS enforced). No-ops if the
 * category already exists (unique primary key).
 */
export async function insertCategory(
  client: Client,
  name: string
): Promise<void> {
  try {
    const { error } = await client
      .from("categories")
      .insert({ name: name.trim() });

    if (error && error.code !== "23505") {
      if (
        error.code === "PGRST205" ||
        error.message?.includes("schema cache") ||
        error.message?.includes("categories")
      ) {
        if (typeof window !== "undefined") {
          const current = localStorage.getItem(STORAGE_KEY);
          const list: string[] = current ? JSON.parse(current) : [];
          if (!list.includes(name.trim())) {
            list.push(name.trim());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
          }
        }
        return;
      }
      throw error;
    }
  } catch (err) {
    if (typeof window !== "undefined") {
      const current = localStorage.getItem(STORAGE_KEY);
      const list: string[] = current ? JSON.parse(current) : [];
      if (!list.includes(name.trim())) {
        list.push(name.trim());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
      return;
    }
    throw err;
  }
}

/**
 * Delete a category by name. Admin-only (RLS enforced).
 */
export async function deleteCategory(
  client: Client,
  name: string
): Promise<void> {
  try {
    const { error } = await client
      .from("categories")
      .delete()
      .eq("name", name);

    if (error) {
      if (
        error.code === "PGRST205" ||
        error.message?.includes("schema cache") ||
        error.message?.includes("categories")
      ) {
        if (typeof window !== "undefined") {
          const current = localStorage.getItem(STORAGE_KEY);
          const list: string[] = current ? JSON.parse(current) : [];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list.filter((c) => c !== name)));
        }
        return;
      }
      throw error;
    }
  } catch (err) {
    if (typeof window !== "undefined") {
      const current = localStorage.getItem(STORAGE_KEY);
      const list: string[] = current ? JSON.parse(current) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.filter((c) => c !== name)));
      return;
    }
    throw err;
  }
}
