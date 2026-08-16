import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { DiscountCode } from "@/lib/data/coupons";

type Client = SupabaseClient<Database>;
type CouponRow = Database["public"]["Tables"]["coupons"]["Row"];

export interface AdminCoupon {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  uses: number;
  maxUses: number | null;
  active: boolean;
  expires: string;
}

function rowToCoupon(row: CouponRow): DiscountCode {
  return {
    code: row.code,
    type: row.type,
    value: Number(row.value),
    active: row.active,
    expires: row.expires,
  };
}

function rowToAdminCoupon(row: CouponRow): AdminCoupon {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: Number(row.value),
    uses: row.uses,
    maxUses: row.max_uses,
    active: row.active,
    expires: row.expires,
  };
}

/**
 * Looks a code up the same way the old client-side `validateCoupon` did
 * (active + not expired). This is a UX preview only — `create_order` is the
 * source of truth and re-validates (and re-applies) the coupon server-side,
 * so a code that passes here but is exhausted between then and checkout is
 * still handled safely.
 */
export async function fetchCoupon(client: Client, code: string): Promise<DiscountCode | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const { data, error } = await client
    .from("coupons")
    .select("*")
    .ilike("code", trimmed)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  if (!data.active) return null;
  if (new Date(data.expires).getTime() < Date.now()) return null;
  if (data.max_uses !== null && data.uses >= data.max_uses) return null;
  return rowToCoupon(data);
}

/** All discount codes, for the admin discounts page. */
export async function fetchAdminCoupons(client: Client): Promise<AdminCoupon[]> {
  const { data, error } = await client
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToAdminCoupon);
}

export async function insertCoupon(
  client: Client,
  draft: { code: string; type: "percentage" | "fixed"; value: number; maxUses: number; expires: string }
): Promise<AdminCoupon> {
  const { data, error } = await client
    .from("coupons")
    .insert({
      code: draft.code,
      type: draft.type,
      value: draft.value,
      max_uses: draft.maxUses,
      expires: draft.expires,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToAdminCoupon(data);
}

export async function setCouponActive(client: Client, id: string, active: boolean): Promise<void> {
  const { error } = await client.from("coupons").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deleteCoupon(client: Client, id: string): Promise<void> {
  const { error } = await client.from("coupons").delete().eq("id", id);
  if (error) throw error;
}
