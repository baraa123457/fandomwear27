export interface DiscountCode {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  active: boolean;
  expires: string;
  minimumOrder: number;
}

/**
 * Pure display math — given a coupon already validated by the
 * `validate_coupon` Postgres RPC (see lib/supabase/queries/coupons.ts),
 * recompute the discount amount as the cart's subtotal changes so the
 * UI stays live without re-hitting the database on every keystroke.
 * This is NOT coupon eligibility validation (active/expired/max_uses/
 * minimum_order) — that only ever happens server-side, in
 * `validate_coupon` (preview) and `create_order` (source of truth).
 */
export function computeDiscount(coupon: DiscountCode | null, subtotal: number): number {
  if (!coupon) return 0;
  if (subtotal < coupon.minimumOrder) return 0;
  const raw = coupon.type === "percentage" ? subtotal * (coupon.value / 100) : coupon.value;
  return Math.min(raw, subtotal);
}
