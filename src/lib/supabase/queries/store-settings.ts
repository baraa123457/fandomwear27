import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export interface StoreSettings {
  storeName: string;
  storeEmail: string;
  contactPhone: string;
  whatsappPhone: string;
  contactAddress: string;
  /** Always "EGP" — display-only. The application enforces EGP at runtime. */
  currency: string;
  shippingFlatRate: number;
  shippingFreeThreshold: number;
  taxRate: number;
  paymentCodEnabled: boolean;
  paymentCardEnabled: boolean;
}

const STORAGE_KEY = "fandomwear:store-settings";

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "FandomWear",
  storeEmail: "hello@fandomwear.com",
  contactPhone: "+20 100 000 0000",
  whatsappPhone: "+20 100 000 0000",
  contactAddress: "",
  currency: "EGP",
  shippingFlatRate: 50.0,
  shippingFreeThreshold: 500.0,
  taxRate: 0.0,
  paymentCodEnabled: true,
  paymentCardEnabled: true,
};


function rowToSettings(
  row: Database["public"]["Tables"]["store_settings"]["Row"]
): StoreSettings {
  const custom = row as Record<string, unknown>;
  return {
    storeName: row.store_name,
    storeEmail: row.store_email,
    contactPhone: row.contact_phone,
    whatsappPhone: custom.whatsapp_phone ? String(custom.whatsapp_phone) : row.contact_phone || "+20 100 000 0000",
    contactAddress: row.contact_address,
    currency: row.currency,
    shippingFlatRate: Number(row.shipping_flat_rate),
    shippingFreeThreshold: Number(row.shipping_free_threshold),
    taxRate: Number(row.tax_rate),
    paymentCodEnabled: row.payment_cod_enabled,
    paymentCardEnabled: row.payment_card_enabled,
  };
}

/**
 * Reads the single store_settings row (id = 1, seeded by migration
 * 20260822000021). Public read (RLS). Fallback to local storage if the
 * table does not exist in Supabase.
 */
export async function fetchStoreSettings(client: Client): Promise<StoreSettings> {
  try {
    const { data, error } = await client
      .from("store_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      if (
        error.code === "PGRST205" ||
        error.code === "PGRST204" ||
        error.message?.includes("schema cache") ||
        error.message?.includes("store_settings")
      ) {
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        }
        return DEFAULT_SETTINGS;
      }
      throw error;
    }
    if (!data) return DEFAULT_SETTINGS;
    return rowToSettings(data);
  } catch {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
    return DEFAULT_SETTINGS;
  }
}

/**
 * Updates store settings fields. Writes to Supabase store_settings,
 * with fallback to local storage if the table does not exist.
 */
export async function updateStoreSettings(
  client: Client,
  patch: Partial<StoreSettings>
): Promise<void> {
  const rowPatch: Database["public"]["Tables"]["store_settings"]["Update"] = {};

  if (patch.storeName !== undefined) rowPatch.store_name = patch.storeName;
  if (patch.storeEmail !== undefined) rowPatch.store_email = patch.storeEmail;
  if (patch.contactPhone !== undefined) rowPatch.contact_phone = patch.contactPhone;
  if (patch.whatsappPhone !== undefined) (rowPatch as Record<string, unknown>).whatsapp_phone = patch.whatsappPhone;
  if (patch.contactAddress !== undefined) rowPatch.contact_address = patch.contactAddress;
  // currency is display-only — never written back from the UI
  if (patch.shippingFlatRate !== undefined) rowPatch.shipping_flat_rate = patch.shippingFlatRate;
  if (patch.shippingFreeThreshold !== undefined)
    rowPatch.shipping_free_threshold = patch.shippingFreeThreshold;
  if (patch.taxRate !== undefined) rowPatch.tax_rate = patch.taxRate;
  if (patch.paymentCodEnabled !== undefined)
    rowPatch.payment_cod_enabled = patch.paymentCodEnabled;
  if (patch.paymentCardEnabled !== undefined)
    rowPatch.payment_card_enabled = patch.paymentCardEnabled;

  if (Object.keys(rowPatch).length === 0) return;

  try {
    const { error } = await client
      .from("store_settings")
      .update(rowPatch)
      .eq("id", 1);

    if (error) {
      if (
        error.code === "PGRST205" ||
        error.code === "PGRST204" ||
        error.message?.includes("schema cache") ||
        error.message?.includes("store_settings") ||
        error.message?.includes("whatsapp_phone")
      ) {
        const sanitized = { ...rowPatch };
        delete (sanitized as Record<string, unknown>).whatsapp_phone;
        await client.from("store_settings").update(sanitized).eq("id", 1);
        if (typeof window !== "undefined") {
          const current = localStorage.getItem(STORAGE_KEY);
          const parsed = current ? JSON.parse(current) : DEFAULT_SETTINGS;
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, ...patch }));
        }
        return;
      }
      throw error;
    }
  } catch (err) {
    if (typeof window !== "undefined") {
      const current = localStorage.getItem(STORAGE_KEY);
      const parsed = current ? JSON.parse(current) : DEFAULT_SETTINGS;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, ...patch }));
      return;
    }
    throw err;
  }
}

export { DEFAULT_SETTINGS };

