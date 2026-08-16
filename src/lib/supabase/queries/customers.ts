import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;
type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  orders: number;
  totalSpent: number;
  joined: string;
}

function rowToCustomer(row: CustomerRow): AdminCustomer {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    orders: row.orders,
    totalSpent: Number(row.total_spent),
    joined: row.joined,
  };
}

/**
 * Admin-only read (see migration 010's "Admins can read customers" policy).
 * Rows are written exclusively by create_order() — there is no client
 * insert/update path, so this is read-only here too.
 */
export async function fetchAdminCustomers(client: Client): Promise<AdminCustomer[]> {
  const { data, error } = await client
    .from("customers")
    .select("*")
    .order("joined", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToCustomer);
}
