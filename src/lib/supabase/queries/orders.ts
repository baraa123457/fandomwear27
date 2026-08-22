import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CartLine } from "@/context/cart-context";

type Client = SupabaseClient<Database>;
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
export type AdminOrderStatus = Database["public"]["Enums"]["admin_order_status"];

export interface OrderShippingAddress {
  fullName: string;
  line1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

/** Matches the shape orders-context.tsx's `Order` has always had. */
export interface OrderWithItems {
  id: string;
  date: string;
  email: string;
  items: CartLine[];
  subtotal: number;
  discount?: number;
  couponCode?: string;
  shipping: number;
  tax: number;
  total: number;
  status: AdminOrderStatus;
  paymentMethod?: "card" | "cod";
  shippingAddress: OrderShippingAddress;
}

function itemRowToCartLine(row: OrderItemRow): CartLine {
  return {
    productId: row.product_id,
    slug: row.slug,
    name: row.name,
    price: Number(row.price),
    size: row.size,
    color: row.color,
    universe: row.universe as CartLine["universe"],
    artIcon: row.art_icon,
    quantity: row.quantity,
  };
}

function rowToOrder(
  row: OrderRow,
  itemRows: OrderItemRow[]
): OrderWithItems {
  const addr = (row.shipping_address ?? {}) as Partial<OrderShippingAddress>;

  return {
    id: row.id,
    date: row.order_date,
    email: row.email,
    items: itemRows.map(itemRowToCartLine),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    couponCode: row.coupon_code ?? undefined,
    shipping: Number(row.shipping_cost),
    tax: Number(row.tax),
    total: Number(row.total),
    status: row.status,
    paymentMethod:
      (row.payment_method as "card" | "cod" | null) ?? undefined,
    shippingAddress: {
      fullName: addr.fullName ?? row.customer,
      line1: addr.line1 ?? "",
      city: addr.city ?? "",
      state: addr.state ?? "",
      zip: addr.zip ?? "",
      country: addr.country ?? "",
    },
  };
}

/** A signed-in customer's own order history. */
export async function fetchOrdersForUser(
  client: Client,
  userId: string
): Promise<OrderWithItems[]> {
  const { data, error } = await client
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", userId)
    .order("order_date", { ascending: false });

  if (error) {
    console.error("[orders] Failed to fetch user orders:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  return (data ?? []).map((row) =>
    rowToOrder(row, row.order_items ?? [])
  );
}

/** Every order, for the admin orders page. */
export async function fetchAllOrdersAdmin(
  client: Client
): Promise<OrderWithItems[]> {
  const { data, error } = await client
    .from("orders")
    .select("*, order_items(*)")
    .order("order_date", { ascending: false });

  if (error) {
    console.error("[orders] Failed to fetch admin orders:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  return (data ?? []).map((row) =>
    rowToOrder(row, row.order_items ?? [])
  );
}

/** A single order (with items), for the admin order-details page. */
export async function fetchOrderByIdAdmin(
  client: Client,
  id: string
): Promise<OrderWithItems | null> {
  const { data, error } = await client
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[orders] Failed to fetch admin order:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  if (!data) return null;
  return rowToOrder(data, data.order_items ?? []);
}

/** Every order placed under a given email, for the admin customer-details page. */
export async function fetchOrdersByEmailAdmin(
  client: Client,
  email: string
): Promise<OrderWithItems[]> {
  const { data, error } = await client
    .from("orders")
    .select("*, order_items(*)")
    .eq("email", email)
    .order("order_date", { ascending: false });

  if (error) {
    console.error("[orders] Failed to fetch orders for email:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }

  return (data ?? []).map((row) => rowToOrder(row, row.order_items ?? []));
}

export async function updateOrderStatusAdmin(
  client: Client,
  id: string,
  status: AdminOrderStatus
): Promise<void> {
  const { error } = await client
    .from("orders")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("[orders] Failed to update order status:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw error;
  }
}

export interface CreateOrderInput {
  items: {
    productId: string;
    size: string;
    color: string;
    quantity: number;
  }[];
  email: string;
  fullName: string;
  line1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  paymentMethod: "card" | "cod";
  couponCode?: string;
}

/**
 * Sole write path for orders.
 *
 * Calls the server-side create_order() PostgreSQL function.
 * The function re-prices products and validates coupons server-side.
 */
export async function createOrder(
  client: Client,
  input: CreateOrderInput
): Promise<OrderRow> {
  const { data, error } = await client.rpc("create_order", {
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
    })),
    p_email: input.email,
    p_full_name: input.fullName,
    p_line1: input.line1,
    p_city: input.city,
    p_state: input.state,
    p_zip: input.zip,
    p_country: input.country,
    p_payment_method: input.paymentMethod,
    p_coupon_code: input.couponCode ?? undefined,
  });

  if (error) {
    console.error("[Supabase create_order error]", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      error,
    });

    throw new Error(
      error.message ||
        error.details ||
        error.hint ||
        "Failed to create order"
    );
  }

  if (!data) {
    console.error("[Supabase create_order] No data returned");

    throw new Error(
      "Order was not created: Supabase returned no data."
    );
  }

  return data;
}