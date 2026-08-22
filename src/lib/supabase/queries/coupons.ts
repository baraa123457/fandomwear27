import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { DiscountCode } from "@/lib/data/coupons";

type Client = SupabaseClient<Database>;
type CouponRow = Database["public"]["Tables"]["coupons"]["Row"];

export type AdminCouponStatus = "active" | "inactive" | "expired" | "exhausted";

export interface AdminCoupon {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  uses: number;
  maxUses: number | null;
  remainingUses: number | null;
  minimumOrder: number;
  active: boolean;
  expires: string;
  status: AdminCouponStatus;
}

function couponStatus(row: Pick<CouponRow, "active" | "expires" | "max_uses" | "uses">): AdminCouponStatus {
  if (!row.active) return "inactive";
  if (new Date(row.expires).getTime() < Date.now()) return "expired";
  if (row.max_uses !== null && row.uses >= row.max_uses) return "exhausted";
  return "active";
}

function rowToAdminCoupon(row: CouponRow): AdminCoupon {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: Number(row.value),
    uses: row.uses,
    maxUses: row.max_uses,
    remainingUses: row.max_uses === null ? null : Math.max(row.max_uses - row.uses, 0),
    minimumOrder: Number(row.minimum_order),
    active: row.active,
    expires: row.expires,
    status: couponStatus(row),
  };
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
  draft: {
    code: string;
    type: "percentage" | "fixed";
    value: number;
    maxUses: number | null;
    minimumOrder: number;
    expires: string;
  }
): Promise<AdminCoupon> {
  const { data, error } = await client
    .from("coupons")
    .insert({
      code: draft.code,
      type: draft.type,
      value: draft.value,
      max_uses: draft.maxUses,
      minimum_order: draft.minimumOrder,
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

export interface CouponValidation {
  valid: boolean;
  coupon: DiscountCode | null;
  discountAmount: number;
  remainingUses: number | null;
  message: string;
}

/**
 * The only coupon-eligibility check the storefront makes — everything
 * (exists, active, not expired, under its usage cap, subtotal meets
 * minimum_order) is decided by the `validate_coupon` Postgres function,
 * not re-implemented here. `create_order` independently re-runs the
 * same rules at order time and is the actual source of truth; this call
 * is only a preview so the cart/checkout UI can show an accurate
 * "applied" or rejection message before the shopper places the order.
 */
export async function validateCouponRpc(
  client: Client,
  code: string,
  subtotal: number
): Promise<CouponValidation> {
  const trimmed = code.trim();
  if (!trimmed) {
    return { valid: false, coupon: null, discountAmount: 0, remainingUses: null, message: "Enter a code" };
  }

  const { data, error } = await client.rpc("validate_coupon", {
    p_code: trimmed,
    p_subtotal: subtotal,
  });
  if (error) throw error;

  const result = data?.[0];
  if (!result) {
    return { valid: false, coupon: null, discountAmount: 0, remainingUses: null, message: "Code not found" };
  }

  if (!result.valid || !result.code || !result.type || result.value === null) {
    return {
      valid: false,
      coupon: null,
      discountAmount: 0,
      remainingUses: result.remaining_uses,
      message: result.message,
    };
  }

  return {
    valid: true,
    coupon: {
      code: result.code,
      type: result.type,
      value: Number(result.value),
      active: true,
      expires: result.expires ?? "",
      minimumOrder: Number(result.minimum_order ?? 0),
    },
    discountAmount: Number(result.discount_amount),
    remainingUses: result.remaining_uses,
    message: result.message,
  };
}
