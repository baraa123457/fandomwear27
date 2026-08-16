import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Egyptian Pound (EGP) is the project's single currency — every price
// display in the app should go through this function rather than
// formatting/prefixing a currency symbol locally. In the "en-US" locale
// ICU has no distinct EGP symbol, so `style: "currency"` already renders
// as "EGP 1,234.56" (code + thousands separators) out of the box.
export function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Extracts a human-readable message from an unknown thrown value.
 *
 * Supabase errors (PostgrestError, StorageError, AuthError, ...) are plain
 * objects with fields like `message` / `details` / `hint` / `code`, not
 * `Error` instances — logging or displaying them directly (or via a bare
 * `${err}` / `String(err)`) tends to produce useless output like `{}` or
 * `[object Object]`. This pulls out every useful field it can find instead.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name || "Unknown error";
  }

  if (typeof error === "object" && error !== null) {
    const e = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string | number;
    };

    const parts = [
      e.message,
      e.details,
      e.hint,
      e.code !== undefined ? `Code: ${e.code}` : undefined,
    ].filter((part): part is string => Boolean(part));

    if (parts.length > 0) return parts.join(" | ");

    // Genuinely empty/unhelpful error object — fall through to a generic
    // message rather than printing "{}".
    return "Something went wrong. Please try again.";
  }

  return String(error);
}
