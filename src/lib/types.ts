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
  /** Optional single product video (data URL or storage URL). Never
   *  required. */
  video?: string | null;
  createdAt: string;
}
