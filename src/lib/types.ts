export type Universe = string;

export interface UniverseInfo {
  id: Universe;
  label: string;
  tagline: string;
  /** Tailwind-safe hex used for glow/accent theming, unique per universe */
  color: string;
  /** lucide-react icon name, resolved in the component layer */
  icon: string;
  productCount: number;
}

export type Size = "S" | "M" | "L" | "XL" | "XXL";

export interface ProductVariant {
  id?: string;
  size: Size;
  color: string;
  stock: number;
  sku?: string;
  price?: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  universe: Universe;
  category: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  material: string;
  sizes: Size[];
  colors: { name: string; hex: string }[];
  rating: number;
  reviewCount: number;
  stock: number;
  tags: Array<"new" | "bestseller" | "sale" | "limited">;
  artIcon: string;
  /** Optional uploaded product photo (data URL). When present, this takes
   *  priority over the generated `artIcon` artwork everywhere the product
   *  is displayed. Kept in sync with `images[0]` for backward compatibility
   *  with display components that only know about a single photo. */
  image?: string;
  /** Up to 3 uploaded product photos (data URLs or storage URLs), ordered
   *  [main/front, second, third]. `images[0]` is always mirrored to
   *  `image`. */
  images?: string[];
  /** Dedicated photos per color variant, mapping color name to array of image URLs e.g. { "Red": ["url1", "url2"] } */
  colorImages?: Record<string, string[]>;
  /** Specific variant combinations (Color x Size) with individual stock and optional SKU/price */
  variants?: ProductVariant[];
  /** Optional single product video (data URL or storage URL). Never
   *  required. */
  video?: string | null;
  createdAt: string;
  /** Last-modified timestamp (DB-managed via a trigger). Optional because
   *  the seed fallback array predates this field. */
  updatedAt?: string;
  /** Active = shown on the storefront. Draft/Archived = admin-only.
   *  Undefined (only possible on the seed fallback array) is treated as
   *  "active" everywhere it's read. */
  status?: "active" | "draft" | "archived";
  /** Optional admin-facing stock-keeping unit, distinct from `id`. */
  sku?: string;
  /** Per-product low-stock threshold. Undefined falls back to the
   *  dashboard-wide default (see lib/admin/dashboard-metrics.ts). */
  lowStockThreshold?: number;
  /** Manually curated by the admin — powers the homepage Featured
   *  Products section. Undefined is treated as false. */
  featured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  /** Cost of goods sold (COGS) / cost price per unit in EGP */
  costPrice?: number;
}


