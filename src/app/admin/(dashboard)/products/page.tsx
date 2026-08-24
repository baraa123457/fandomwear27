"use client";

import { useCallback, useEffect, useMemo, useRef, useState, FormEvent, ChangeEvent } from "react";
import {
  Copy,
  Download,
  Film,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  Upload,
  X,
  Layers,
  Check,
} from "lucide-react";
import { Product, ProductVariant, Size, UniverseInfo } from "@/lib/types";
import { useCatalog } from "@/context/catalog-context";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ManageOptionsList } from "@/components/admin/manage-options-list";
import { ProductVisual } from "@/components/shared/product-visual";
import { Dropdown } from "@/components/shared/dropdown";
import { Skeleton } from "@/components/shared/skeletons";
import { useToast } from "@/context/toast-context";
import { formatPrice, cn, getErrorMessage } from "@/lib/utils";
import { downloadCSV, parseCSV, productsToCSV, rowsToProducts } from "@/lib/csv";
import { createClient } from "@/lib/supabase/client";
import {
  fetchAllProductsAdmin,
  insertProduct,
  countProductOrderItems,
  upsertProducts,
} from "@/lib/supabase/queries/products";
import {
  uploadProductColorImage,
  uploadProductColorVideo,
  deleteProductMediaMany,
} from "@/lib/supabase/storage/product-media";



const FALLBACK_PALETTE = ["#7C5CFF", "#22D3EE", "#FF3B4E", "#22C55E", "#F59E0B", "#EC4899", "#38BDF8", "#A855F7"];

const PREDEFINED_COLORS: Product["colors"] = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Gray", hex: "#808080" },
  { name: "Red", hex: "#EF4444" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Green", hex: "#22C55E" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Orange", hex: "#F97316" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Brown", hex: "#92400E" },
  { name: "Beige", hex: "#D4B483" },
  { name: "Navy", hex: "#1E3A8A" },
];

const ALL_TAGS: Product["tags"] = ["new", "bestseller", "sale", "limited"];

const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function normalizeHex(hex: string): string {
  const trimmed = hex.trim();
  if (trimmed.length === 4) {
    return (
      "#" +
      trimmed
        .slice(1)
        .split("")
        .map((c) => c + c)
        .join("")
    ).toUpperCase();
  }
  return trimmed.toUpperCase();
}

function slugify(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uniqueSlug(name: string, existing: Product[], excludeId?: string): string {
  const root = slugify(name) || `product-${Date.now()}`;
  const taken = new Set(existing.filter((p) => p.id !== excludeId).map((p) => p.slug));
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}

const ALL_SIZES: Size[] = ["S", "M", "L", "XL", "XXL"];
const ALL_STATUSES: NonNullable<Product["status"]>[] = ["active", "draft", "archived"];

type MediaSlot =
  | { kind: "empty" }
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; previewUrl: string };


function generateVariants(
  colors: Product["colors"],
  sizes: Size[],
  existing: ProductVariant[] = [],
  baseSku = "",
  defaultStock = 10
): ProductVariant[] {
  const result: ProductVariant[] = [];
  for (const color of colors) {
    for (const size of sizes) {
      const match = existing.find((v) => v.color === color.name && v.size === size);
      if (match) {
        result.push(match);
      } else {
        const sku = baseSku ? `${baseSku}-${slugify(color.name)}-${size}`.toUpperCase() : undefined;
        result.push({
          color: color.name,
          size,
          stock: defaultStock,
          sku,
        });
      }
    }
  }
  return result;
}

interface Draft {
  name: string;
  description: string;
  material: string;
  price: number;
  compareAtPrice: string; // "" = none
  sku: string;
  stock: number;
  lowStockThreshold: number;
  category: string;
  universe: string;
  tags: Product["tags"];
  sizes: Size[];
  colors: Product["colors"];
  mainColor: string;
  colorImages: Record<string, MediaSlot[]>;
  colorVideos: Record<string, MediaSlot>;
  variants: ProductVariant[];
  featured: boolean;
  status: NonNullable<Product["status"]>;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  costPrice: string;
}

const emptyDraft: Draft = {
  name: "",
  description: "",
  material: "",
  category: "Oversized Tee",
  universe: "",
  price: 34.99,
  compareAtPrice: "",
  costPrice: "",
  sku: "",
  stock: 50,
  lowStockThreshold: 10,
  tags: [],
  mainColor: "",
  colorImages: {},
  colorVideos: {},
  variants: [],
  sizes: [...ALL_SIZES],
  colors: [],
  featured: false,
  status: "active",
  slug: "",
  seoTitle: "",
  seoDescription: "",
};




function slotPreviewSrc(slot: MediaSlot): string | undefined {
  if (slot.kind === "existing") return slot.url;
  if (slot.kind === "new") return slot.previewUrl;
  return undefined;
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

const DEFAULT_ART_ICON = "Shirt";

type DeleteTarget = { product: Product; orderCount: number | null };

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-line bg-void px-4 text-sm text-ink focus:border-accent-cyan focus:outline-none";

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5 border-t border-line pt-5 first:border-0 first:pt-0">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint">{title}</h3>
      {children}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-ink-faint">{label}</span>
      {children}
    </div>
  );
}

export default function AdminProductsPage() {
  const { toast } = useToast();
  const {
    universes: universeOptions,
    categories: categoryOptions,
    addProduct: catalogAddProduct,
    updateProduct: catalogUpdateProduct,
    deleteProduct: catalogDeleteProduct,
    addUniverse,
    removeUniverse,
    addCategory,
    removeCategory,
    resetToSeed,
    getUniverse,
    refreshProducts: refreshStorefrontProducts,
  } = useCatalog();

  // Admin-only, all-statuses product list — deliberately independent of
  // useCatalog()'s `products`, which is the storefront's active-only list.
  // A draft/archived product must be manageable here without ever leaking
  // into the customer-facing catalog.
  const [products, setProducts] = useState<Product[]>([]);
  const [loadStatus, setLoadStatus] = useState<"loading" | "error" | "ready">("loading");

  const loadAdminProducts = useCallback(async () => {
    setLoadStatus("loading");
    try {
      const supabase = createClient();
      const rows = await fetchAllProductsAdmin(supabase);
      setProducts(rows);
      setLoadStatus("ready");
    } catch (err) {
      console.error("[admin products] Failed to load products:", getErrorMessage(err), err);
      setLoadStatus("error");
      toast({ variant: "error", title: "Failed to load products" });
    }
  }, [toast]);

  useEffect(() => {
    loadAdminProducts();
  }, [loadAdminProducts]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [universeFilter, setUniverseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customColorHex, setCustomColorHex] = useState("#7C5CFF");
  const [bulkStockInput, setBulkStockInput] = useState("20");
  const csvInputRef = useRef<HTMLInputElement>(null);

  const addUniverseOption = (label: string) => {

    const trimmed = label.trim();
    if (!trimmed) return;
    const id = slugify(trimmed) || `universe-${Date.now()}`;
    if (universeOptions.some((u) => u.id === id)) {
      toast({ variant: "error", title: "That universe already exists" });
      return;
    }
    const color = FALLBACK_PALETTE[universeOptions.length % FALLBACK_PALETTE.length];
    const newUniverse: UniverseInfo = { id, label: trimmed, tagline: "", color, icon: "Sparkles", productCount: 0 };
    addUniverse(newUniverse);
    toast({ variant: "success", title: "Universe added", description: trimmed });
  };

  const removeUniverseOption = (id: string) => {
    if (universeOptions.length <= 1) {
      toast({ variant: "error", title: "You need at least one universe" });
      return;
    }
    removeUniverse(id);
    const next = universeOptions.filter((u) => u.id !== id);
    if (draft.universe === id) setDraft((d) => ({ ...d, universe: next[0].id }));
    if (universeFilter === id) setUniverseFilter("all");
  };

  const addCategoryOption = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (categoryOptions.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast({ variant: "error", title: "That category already exists" });
      return;
    }
    addCategory(trimmed);
    toast({ variant: "success", title: "Category added", description: trimmed });
  };

  const removeCategoryOption = (label: string) => {
    if (categoryOptions.length <= 1) {
      toast({ variant: "error", title: "You need at least one category" });
      return;
    }
    removeCategory(label);
    const next = categoryOptions.filter((c) => c !== label);
    if (draft.category === label) setDraft((d) => ({ ...d, category: next[0] }));
    if (categoryFilter === label) setCategoryFilter("all");
  };

  /* ---------------------------------------------------------------- */

  /* Search + filters — every option here reflects real, currently-    */
  /* loaded data (universes/categories from the DB-backed catalog      */
  /* lists), never a hardcoded set of business categories.             */
  /* ---------------------------------------------------------------- */

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q) {
        const haystack = `${p.name} ${p.id} ${p.sku ?? ""} ${p.category} ${p.universe}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (universeFilter !== "all" && p.universe !== universeFilter) return false;
      if (statusFilter !== "all" && (p.status ?? "active") !== statusFilter) return false;
      if (stockFilter !== "all") {
        const threshold = p.lowStockThreshold ?? 10;
        const bucket = p.stock === 0 ? "out" : p.stock <= threshold ? "low" : "in";
        if (bucket !== stockFilter) return false;
      }
      const min = priceMin.trim() ? Number(priceMin) : null;
      const max = priceMax.trim() ? Number(priceMax) : null;
      if (min !== null && !Number.isNaN(min) && p.price < min) return false;
      if (max !== null && !Number.isNaN(max) && p.price > max) return false;
      return true;
    });
  }, [products, search, categoryFilter, universeFilter, statusFilter, stockFilter, priceMin, priceMax]);

  const activeFilterCount = [
    categoryFilter !== "all",
    universeFilter !== "all",
    statusFilter !== "all",
    stockFilter !== "all",
    priceMin.trim() !== "",
    priceMax.trim() !== "",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setCategoryFilter("all");
    setUniverseFilter("all");
    setStatusFilter("all");
    setStockFilter("all");
    setPriceMin("");
    setPriceMax("");
  };

  /* ---------------------------------------------------------------- */
  /* Form open/populate                                                */
  /* ---------------------------------------------------------------- */

  const openNew = () => {
    if (universeOptions.length === 0) {
      toast({ variant: "error", title: "No universes available", description: "Add a universe before creating a product." });
      return;
    }
    setEditingId(null);
    const initialColors = PREDEFINED_COLORS.slice(0, 2);
    const initialSizes = [...ALL_SIZES];
    const initialVariants = generateVariants(initialColors, initialSizes, [], "", 20);
    const initialColorImages: Record<string, MediaSlot[]> = {};
    initialColors.forEach((c) => {
      initialColorImages[c.name] = [];
    });

    setDraft({
      ...emptyDraft,
      universe: universeOptions[0].id,
      category: categoryOptions[0] ?? "Oversized Tee",
      colors: initialColors,
      mainColor: initialColors[0]?.name ?? "Black",
      sizes: initialSizes,
      variants: initialVariants,
      colorImages: initialColorImages,
      colorVideos: {},
      stock: initialVariants.reduce((s, v) => s + (v.stock || 0), 0),
    });
    setSlugTouched(false);
    setCustomColorHex("#7C5CFF");
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    const defaultColor = p.mainColor || p.colors?.[0]?.name || "";
    const colorImagesDraft: Record<string, MediaSlot[]> = {};
    const colorVideosDraft: Record<string, MediaSlot> = {};

    (p.colors ?? []).forEach((c) => {
      const matchingKey = Object.keys(p.colorImages ?? {}).find(
        (k) => k.trim().toLowerCase() === c.name.trim().toLowerCase()
      );
      const existingUrls = matchingKey ? p.colorImages?.[matchingKey] ?? [] : [];
      const sourceUrls =
        existingUrls.length > 0
          ? existingUrls
          : c.name === defaultColor && p.images && p.images.length > 0
            ? p.images
            : c.name === defaultColor && p.image
              ? [p.image]
              : [];

      colorImagesDraft[c.name] = sourceUrls.map((url) => ({ kind: "existing", url }));

      const matchingVideoKey = Object.keys(p.colorVideos ?? {}).find(
        (k) => k.trim().toLowerCase() === c.name.trim().toLowerCase()
      );
      const existingVideoUrl = matchingVideoKey ? p.colorVideos?.[matchingVideoKey] : undefined;

      if (existingVideoUrl) {
        colorVideosDraft[c.name] = { kind: "existing", url: existingVideoUrl };
      } else if (c.name === defaultColor && p.video) {
        colorVideosDraft[c.name] = { kind: "existing", url: p.video };
      }
    });


    const defaultVariantStock = Math.max(
      1,
      Math.floor((p.stock || 0) / Math.max(1, (p.colors?.length || 1) * (p.sizes?.length || 1)))
    );
    const variants = p.variants && p.variants.length > 0
      ? p.variants
      : generateVariants(p.colors ?? [], p.sizes ?? [], [], p.sku || p.slug, defaultVariantStock);

    setDraft({
      name: p.name,
      description: p.description ?? "",
      material: p.material ?? "",
      category: p.category,
      universe: p.universe,
      price: p.price,
      compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : "",
      costPrice: p.costPrice != null ? String(p.costPrice) : "",
      sku: p.sku ?? "",
      stock: variants.reduce((s, v) => s + (Number(v.stock) || 0), 0) || p.stock,
      lowStockThreshold: p.lowStockThreshold ?? 10,
      tags: p.tags ?? [],
      mainColor: defaultColor,
      colorImages: colorImagesDraft,
      colorVideos: colorVideosDraft,
      variants,
      sizes: p.sizes,
      colors: p.colors ?? [],
      featured: p.featured ?? false,
      status: p.status ?? "active",
      slug: p.slug,
      seoTitle: p.seoTitle ?? "",
      seoDescription: p.seoDescription ?? "",
    });

    setSlugTouched(true);
    setCustomColorHex("#7C5CFF");
    setDialogOpen(true);
  };

  const toggleSize = (size: Size) => {
    setDraft((d) => {
      const has = d.sizes.includes(size);
      if (has && d.sizes.length <= 1) {
        toast({ variant: "error", title: "At least one size is required" });
        return d;
      }
      const newSizes = has ? d.sizes.filter((s) => s !== size) : [...d.sizes, size];
      const newVariants = generateVariants(d.colors, newSizes, d.variants, d.sku || d.slug);
      const totalStock = newVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
      return { ...d, sizes: newSizes, variants: newVariants, stock: totalStock };
    });
  };

  const toggleTag = (tag: Product["tags"][number]) => {
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(tag) ? d.tags.filter((t) => t !== tag) : [...d.tags, tag],
    }));
  };

  const addColor = (hex: string, name: string) => {
    setDraft((d) => {
      if (d.colors.some((c) => c.hex.toUpperCase() === hex.toUpperCase())) {
        toast({ variant: "error", title: "That color is already added" });
        return d;
      }
      const newColors = [...d.colors, { name, hex }];
      const newVariants = generateVariants(newColors, d.sizes, d.variants, d.sku || d.slug);
      const totalStock = newVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
      const newColorImages = {
        ...d.colorImages,
        [name]: d.colorImages[name] ?? [],
      };
      const mainColor = d.mainColor || name;
      return { ...d, colors: newColors, mainColor, variants: newVariants, stock: totalStock, colorImages: newColorImages };
    });
  };

  const removeColor = (hex: string) => {
    setDraft((d) => {
      const target = d.colors.find((c) => c.hex.toUpperCase() === hex.toUpperCase());
      const newColors = d.colors.filter((c) => c.hex.toUpperCase() !== hex.toUpperCase());
      const newVariants = generateVariants(newColors, d.sizes, d.variants, d.sku || d.slug);
      const totalStock = newVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
      const newColorImages = { ...d.colorImages };
      const newColorVideos = { ...d.colorVideos };
      if (target) {
        delete newColorImages[target.name];
        delete newColorVideos[target.name];
      }
      const mainColor = d.mainColor === target?.name ? newColors[0]?.name ?? "" : d.mainColor;
      return {
        ...d,
        colors: newColors,
        mainColor,
        variants: newVariants,
        stock: totalStock,
        colorImages: newColorImages,
        colorVideos: newColorVideos,
      };
    });
  };

  const setMainColor = (colorName: string) => {
    setDraft((d) => ({ ...d, mainColor: colorName }));
  };

  const updateVariantStock = (color: string, size: Size, stock: number) => {
    setDraft((d) => {
      const newVariants = d.variants.map((v) =>
        v.color === color && v.size === size ? { ...v, stock: Math.max(0, stock) } : v
      );
      const totalStock = newVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
      return { ...d, variants: newVariants, stock: totalStock };
    });
  };

  const applyStockToAllVariants = (stock: number) => {
    setDraft((d) => {
      const validStock = Math.max(0, stock);
      const newVariants = d.variants.map((v) => ({ ...v, stock: validStock }));
      const totalStock = newVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
      return { ...d, variants: newVariants, stock: totalStock };
    });
  };

  const handleAddCustomColor = () => {
    if (!HEX_COLOR_PATTERN.test(customColorHex.trim())) {
      toast({ variant: "error", title: "Enter a valid hex color", description: "e.g. #7C5CFF" });
      return;
    }
    const hex = normalizeHex(customColorHex);
    addColor(hex, hex);
    setCustomColorHex(hex);
  };

  const handleAddColorPhoto = (colorName: string) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ variant: "error", title: "That's not an image file" });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ variant: "error", title: "Image too large", description: "Max 4MB." });
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setDraft((d) => {
      const current = d.colorImages[colorName] ?? [];
      return {
        ...d,
        colorImages: {
          ...d.colorImages,
          [colorName]: [...current, { kind: "new", file, previewUrl }],
        },
      };
    });
  };

  const removeColorPhoto = (colorName: string, index: number) => {
    setDraft((d) => {
      const current = d.colorImages[colorName] ?? [];
      const slot = current[index];
      if (slot?.kind === "new") URL.revokeObjectURL(slot.previewUrl);
      return {
        ...d,
        colorImages: {
          ...d.colorImages,
          [colorName]: current.filter((_, i) => i !== index),
        },
      };
    });
  };

  const handleColorVideoChange = (colorName: string) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast({ variant: "error", title: "That's not a video file" });
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast({ variant: "error", title: "Video too large", description: "Max 20MB." });
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setDraft((d) => {
      const prev = d.colorVideos[colorName];
      if (prev?.kind === "new") URL.revokeObjectURL(prev.previewUrl);
      return {
        ...d,
        colorVideos: {
          ...d.colorVideos,
          [colorName]: { kind: "new", file, previewUrl },
        },
      };
    });
  };

  const removeColorVideo = (colorName: string) => {
    setDraft((d) => {
      const prev = d.colorVideos[colorName];
      if (prev?.kind === "new") URL.revokeObjectURL(prev.previewUrl);
      const nextVideos = { ...d.colorVideos };
      delete nextVideos[colorName];
      return {
        ...d,
        colorVideos: nextVideos,
      };
    });
  };

  useEffect(() => {
    if (dialogOpen) return;
    Object.values(draft.colorImages).forEach((slots) => {
      slots.forEach((slot) => {
        if (slot.kind === "new") URL.revokeObjectURL(slot.previewUrl);
      });
    });
    Object.values(draft.colorVideos).forEach((slot) => {
      if (slot?.kind === "new") URL.revokeObjectURL(slot.previewUrl);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen]);



  /* ---------------------------------------------------------------- */
  /* CRUD — direct Supabase calls (this page owns the all-statuses     */
  /* list), with the storefront's active-only catalog resynced         */
  /* afterward via refreshStorefrontProducts().                        */
  /* ---------------------------------------------------------------- */

  const persistAdd = async (product: Product) => {
    setProducts((prev) => [product, ...prev]);
    try {
      if (product.status === "active") {
        await catalogAddProduct(product);
      } else {
        const supabase = createClient();
        await insertProduct(supabase, product);
      }
      void refreshStorefrontProducts();
    } catch (err) {
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      throw err;
    }
  };

  const persistUpdate = async (id: string, patch: Partial<Product>) => {
    const previous = products;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    try {
      await catalogUpdateProduct(id, patch);
      void refreshStorefrontProducts();
    } catch (err) {
      setProducts(previous);
      throw err;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      toast({ variant: "error", title: "Product name is required" });
      return;
    }
    if (!universeOptions.some((u) => u.id === draft.universe)) {
      toast({ variant: "error", title: "Please select a valid universe." });
      return;
    }
    if (draft.colors.length === 0) {
      toast({ variant: "error", title: "Select at least one color" });
      return;
    }
    const compareAtPrice = draft.compareAtPrice.trim() ? Number(draft.compareAtPrice) : undefined;
    if (compareAtPrice !== undefined && (Number.isNaN(compareAtPrice) || compareAtPrice < 0)) {
      toast({ variant: "error", title: "Compare-at price must be a valid number" });
      return;
    }
    const costPrice = draft.costPrice.trim() ? Number(draft.costPrice) : undefined;
    if (costPrice !== undefined && (Number.isNaN(costPrice) || costPrice < 0)) {
      toast({ variant: "error", title: "Cost price must be a valid number" });
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const productId = editingId ?? `p${Date.now()}`;
    const finalSlug =
      slugTouched && draft.slug.trim()
        ? uniqueSlug(draft.slug, products, editingId ?? undefined)
        : uniqueSlug(draft.name, products, editingId ?? undefined);

    const uploadedThisAttempt: string[] = [];

    try {
      // Upload color-specific photos and videos for each color variant
      const finalColorImages: Record<string, string[]> = {};
      const finalColorVideos: Record<string, string> = {};

      for (const color of draft.colors) {
        const slots = draft.colorImages[color.name] ?? [];
        const colorUrls: string[] = [];
        for (let i = 0; i < slots.length; i++) {
          const slot = slots[i];
          if (slot?.kind === "new") {
            const url = await uploadProductColorImage(supabase, productId, color.name, i, slot.file);
            uploadedThisAttempt.push(url);
            colorUrls.push(url);
          } else if (slot?.kind === "existing") {
            colorUrls.push(slot.url);
          }
        }
        if (colorUrls.length > 0) {
          finalColorImages[color.name] = colorUrls;
        }

        // Color video
        const videoSlot = draft.colorVideos[color.name];
        if (videoSlot?.kind === "new") {
          const vUrl = await uploadProductColorVideo(supabase, productId, color.name, videoSlot.file);
          uploadedThisAttempt.push(vUrl);
          finalColorVideos[color.name] = vUrl;
        } else if (videoSlot?.kind === "existing") {
          finalColorVideos[color.name] = videoSlot.url;
        }
      }

      const primaryColor = draft.mainColor || draft.colors[0]?.name || "";
      const primaryImages =
        (primaryColor && finalColorImages[primaryColor]) ||
        Object.values(finalColorImages)[0] ||
        [];
      const primaryVideo =
        (primaryColor && finalColorVideos[primaryColor]) ||
        Object.values(finalColorVideos)[0] ||
        null;

      const existing = editingId ? products.find((p) => p.id === editingId) : undefined;
      const existingAllUrls: string[] = [];
      if (existing?.colorImages) {
        Object.values(existing.colorImages).forEach((urls) => existingAllUrls.push(...urls));
      }
      if (existing?.images) existingAllUrls.push(...existing.images);
      if (existing?.image) existingAllUrls.push(existing.image);
      if (existing?.video) existingAllUrls.push(existing.video);
      if (existing?.colorVideos) {
        Object.values(existing.colorVideos).forEach((vUrl) => existingAllUrls.push(vUrl));
      }

      const newAllUrls = new Set<string>();
      Object.values(finalColorImages).forEach((urls) => urls.forEach((u) => newAllUrls.add(u)));
      Object.values(finalColorVideos).forEach((u) => newAllUrls.add(u));
      primaryImages.forEach((u) => newAllUrls.add(u));
      if (primaryVideo) newAllUrls.add(primaryVideo);

      const staleUrls = existingAllUrls.filter((url) => url && !newAllUrls.has(url));

      const sharedPatch = {
        name: draft.name,
        slug: finalSlug,
        description: draft.description,
        material: draft.material,
        category: draft.category,
        universe: draft.universe,
        price: draft.price,
        compareAtPrice,
        costPrice,
        sku: draft.sku.trim() || undefined,
        stock: draft.stock,
        lowStockThreshold: draft.lowStockThreshold,
        tags: draft.tags,
        sizes: draft.sizes,
        colors: draft.colors,
        mainColor: primaryColor,
        colorImages: finalColorImages,
        colorVideos: finalColorVideos,
        images: primaryImages,
        image: primaryImages[0] ?? undefined,
        video: primaryVideo,
        variants: draft.variants,
        featured: draft.featured,
        status: draft.status,
        seoTitle: draft.seoTitle.trim() || undefined,
        seoDescription: draft.seoDescription.trim() || undefined,
      };

      if (editingId) {
        await persistUpdate(editingId, sharedPatch);
        toast({ variant: "success", title: "Product updated", description: draft.name });
      } else {
        const newProduct: Product = {
          id: productId,
          rating: 0,
          reviewCount: 0,
          artIcon: DEFAULT_ART_ICON,
          createdAt: new Date().toISOString(),
          ...sharedPatch,
        };
        await persistAdd(newProduct);
        toast({ variant: "success", title: "Product added", description: draft.name });
      }

      if (staleUrls.length > 0) {
        void deleteProductMediaMany(supabase, staleUrls);
      }


      setDialogOpen(false);
    } catch (err) {
      console.error("[admin products] Failed to save product:", getErrorMessage(err), err);
      if (uploadedThisAttempt.length > 0) {
        void deleteProductMediaMany(supabase, uploadedThisAttempt);
      }
      toast({
        variant: "error",
        title: editingId ? "Couldn't save changes" : "Couldn't add product",
        description: getErrorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Duplicate                                                         */
  /* ---------------------------------------------------------------- */

  const handleDuplicate = async (p: Product) => {
    const duplicate: Product = {
      ...p,
      id: `p${Date.now()}`,
      slug: uniqueSlug(`${p.name} copy`, products),
      name: `${p.name} (Copy)`,
      status: "draft",
      featured: false,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: undefined,
      // Photos aren't duplicated onto a second product record — they'd
      // point at the same Storage files, and deleting/replacing either
      // product's media would silently break the other's. The duplicate
      // starts fresh; the admin uploads its own photos.
      image: undefined,
      images: [],
      video: undefined,
    };
    try {
      await persistAdd(duplicate);
      toast({
        variant: "success",
        title: "Product duplicated",
        description: `${duplicate.name} — saved as a draft. Upload new photos before publishing.`,
      });
    } catch (err) {
      toast({ variant: "error", title: "Couldn't duplicate product", description: getErrorMessage(err) });
    }
  };

  /* ---------------------------------------------------------------- */
  /* Delete — checks real order_items dependencies first               */
  /* ---------------------------------------------------------------- */

  const requestDelete = async (p: Product) => {
    setDeleteTarget({ product: p, orderCount: null }); // null = still checking
    try {
      const supabase = createClient();
      const orderCount = await countProductOrderItems(supabase, p.id);
      setDeleteTarget({ product: p, orderCount });
    } catch (err) {
      setDeleteTarget(null);
      toast({ variant: "error", title: "Couldn't check order history", description: getErrorMessage(err) });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteTarget.orderCount === null || deleteTarget.orderCount > 0) return;
    const { product } = deleteTarget;
    const previous = products;
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    setDeleteTarget(null);
    try {
      catalogDeleteProduct(product.id);
      void refreshStorefrontProducts();
      toast({ variant: "info", title: "Product deleted", description: product.name });
    } catch (err) {
      setProducts(previous);
      toast({ variant: "error", title: "Couldn't delete product", description: getErrorMessage(err) });
    }
  };

  const archiveInsteadOfDelete = async () => {
    if (!deleteTarget) return;
    const { product } = deleteTarget;
    setDeleteTarget(null);
    try {
      await persistUpdate(product.id, { status: "archived" });
      toast({ variant: "success", title: "Product archived", description: `${product.name} is hidden from the storefront.` });
    } catch (err) {
      toast({ variant: "error", title: "Couldn't archive product", description: getErrorMessage(err) });
    }
  };

  /* ---------------------------------------------------------------- */
  /* Status quick-toggle + CSV + reset                                 */
  /* ---------------------------------------------------------------- */

  const handleStatusChange = async (p: Product, status: NonNullable<Product["status"]>) => {
    try {
      await persistUpdate(p.id, { status });
      toast({ variant: "success", title: "Status updated", description: `${p.name} → ${status}` });
    } catch (err) {
      toast({ variant: "error", title: "Couldn't update status", description: getErrorMessage(err) });
    }
  };

  const handleExportCSV = () => {
    if (products.length === 0) {
      toast({ variant: "error", title: "No products to export" });
      return;
    }
    downloadCSV(`fandomwear-products-${new Date().toISOString().slice(0, 10)}.csv`, productsToCSV(products));
    toast({ variant: "success", title: "Exported", description: `${products.length} products` });
  };

  const handleImportClick = () => csvInputRef.current?.click();

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (products.length === 0) {
      toast({
        variant: "error",
        title: "Add at least one product first",
        description: "Import needs an existing product as a template for missing fields.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const rows = parseCSV(text);
      const { products: imported, errors } = rowsToProducts(rows, products[0]);
      if (imported.length > 0) {
        (async () => {
          try {
            const supabase = createClient();
            const saved = await upsertProducts(supabase, imported);
            setProducts((prev) => {
              const byId = new Map(prev.map((p) => [p.id, p]));
              saved.forEach((p) => byId.set(p.id, p));
              return Array.from(byId.values());
            });
            void refreshStorefrontProducts();
            toast({ variant: "success", title: "Imported", description: `${imported.length} products` });
          } catch (err) {
            toast({ variant: "error", title: "Import failed", description: getErrorMessage(err) });
          }
        })();
      }
      if (errors.length > 0) {
        toast({ variant: "error", title: "Some rows were skipped", description: errors.slice(0, 3).join(" ") });
      }
    };
    reader.onerror = () => toast({ variant: "error", title: "Couldn't read that file" });
    reader.readAsText(file);
  };

  const confirmReset = async () => {
    await resetToSeed();
    await loadAdminProducts();
    setResetConfirmOpen(false);
    toast({ variant: "info", title: "Catalog reset", description: "Products, universes, and categories restored to defaults." });
  };

  const isLoading = loadStatus === "loading";
  const isError = loadStatus === "error";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Products</h1>
          <p className="mt-1 text-sm text-ink-faint">
            {isLoading ? "Loading…" : `${filtered.length} of ${products.length} products`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, SKU, category…"
              className="h-10 w-56 rounded-full border border-line bg-surface pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setFiltersOpen((o) => !o)}>
            <SlidersHorizontal className="h-4 w-4" /> Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} className="hidden" />
          <Button variant="outline" size="sm" onClick={handleImportClick}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setResetConfirmOpen(true)}>
            <RotateCcw className="h-4 w-4" /> Reset to defaults
          </Button>
          <Dialog open={optionsDialogOpen} onOpenChange={setOptionsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4" /> Universes & categories
              </Button>
            </DialogTrigger>
            <DialogContent title="Universes & categories">
              <p className="text-xs text-ink-faint">Changes here save immediately — no need to add a product.</p>
              <div className="mt-3.5 grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-xs font-medium text-ink-dim">Universes</span>
                  <ManageOptionsList
                    items={universeOptions.map((u) => ({ value: u.id, label: u.label, color: u.color }))}
                    onAdd={addUniverseOption}
                    onRemove={removeUniverseOption}
                    addPlaceholder="Add universe..."
                  />
                </div>
                <div>
                  <span className="text-xs font-medium text-ink-dim">Categories</span>
                  <ManageOptionsList
                    items={categoryOptions.map((c) => ({ value: c, label: c }))}
                    onAdd={addCategoryOption}
                    onRemove={removeCategoryOption}
                    addPlaceholder="Add category..."
                  />
                </div>
              </div>
              <Button type="button" variant="accent" size="md" className="mt-4" onClick={() => setOptionsDialogOpen(false)}>
                Done
              </Button>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="accent" size="sm" onClick={openNew}>
                <Plus className="h-4 w-4" /> Add product
              </Button>
            </DialogTrigger>
            <DialogContent title={editingId ? "Edit product" : "Add product"} className="max-w-2xl">
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <FormSection title="Basic information">
                  <label>
                    <span className="text-xs font-medium text-ink-dim">Product name</span>
                    <input
                      required
                      value={draft.name}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className="text-xs font-medium text-ink-dim">Description</span>
                    <textarea
                      value={draft.description}
                      onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                      rows={3}
                      className={cn(inputClass, "h-auto resize-y py-2.5")}
                    />
                  </label>
                  <label>
                    <span className="text-xs font-medium text-ink-dim">Material</span>
                    <input
                      value={draft.material}
                      onChange={(e) => setDraft((d) => ({ ...d, material: e.target.value }))}
                      placeholder="e.g. 260gsm ring-spun cotton"
                      className={inputClass}
                    />
                  </label>
                </FormSection>

                <FormSection title="Pricing">
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                    <label>
                      <span className="text-xs font-medium text-ink-dim">Price (EGP)</span>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min={0}
                        value={draft.price}
                        onChange={(e) => setDraft((d) => ({ ...d, price: Number(e.target.value) }))}
                        className={inputClass}
                      />
                    </label>
                    <label>
                      <span className="text-xs font-medium text-ink-dim">Compare-at price</span>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="Optional"
                        value={draft.compareAtPrice}
                        onChange={(e) => setDraft((d) => ({ ...d, compareAtPrice: e.target.value }))}
                        className={inputClass}
                      />
                    </label>
                    <label>
                      <span className="text-xs font-medium text-ink-dim">Cost per item / COGS</span>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="e.g. 15.00"
                        value={draft.costPrice}
                        onChange={(e) => setDraft((d) => ({ ...d, costPrice: e.target.value }))}
                        className={inputClass}
                      />
                    </label>
                  </div>
                  {draft.costPrice.trim() !== "" && !Number.isNaN(Number(draft.costPrice)) && draft.price > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface px-3 py-2 text-xs">
                      <span className="text-ink-faint">
                        Profit per item:{" "}
                        <strong className={cn(draft.price - Number(draft.costPrice) >= 0 ? "text-emerald-400" : "text-accent-red")}>
                          {formatPrice(draft.price - Number(draft.costPrice))}
                        </strong>
                      </span>
                      <span className="text-ink-faint">
                        Margin:{" "}
                        <strong className={cn(draft.price - Number(draft.costPrice) >= 0 ? "text-emerald-400" : "text-accent-red")}>
                          {Math.round(((draft.price - Number(draft.costPrice)) / draft.price) * 100)}%
                        </strong>
                      </span>
                    </div>
                  )}
                </FormSection>


                <FormSection title="Inventory">
                  <div className="grid grid-cols-3 gap-3.5">
                    <label>
                      <span className="text-xs font-medium text-ink-dim">SKU</span>
                      <input
                        value={draft.sku}
                        onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
                        placeholder="Optional"
                        className={inputClass}
                      />
                    </label>
                    <label>
                      <span className="text-xs font-medium text-ink-dim">Stock</span>
                      <input
                        required
                        type="number"
                        min={0}
                        value={draft.stock}
                        onChange={(e) => setDraft((d) => ({ ...d, stock: Number(e.target.value) }))}
                        className={inputClass}
                      />
                    </label>
                    <label>
                      <span className="text-xs font-medium text-ink-dim">Low-stock threshold</span>
                      <input
                        required
                        type="number"
                        min={0}
                        value={draft.lowStockThreshold}
                        onChange={(e) => setDraft((d) => ({ ...d, lowStockThreshold: Number(e.target.value) }))}
                        className={inputClass}
                      />
                    </label>
                  </div>
                </FormSection>

                <FormSection title="Organization">
                  <div className="grid grid-cols-2 gap-3.5">
                    <label>
                      <span className="text-xs font-medium text-ink-dim">Universe</span>
                      <Dropdown
                        className="mt-1.5"
                        fullWidth
                        ariaLabel="Universe"
                        value={draft.universe}
                        options={universeOptions.map((u) => ({ value: u.id, label: u.label }))}
                        onChange={(universe) => setDraft((d) => ({ ...d, universe }))}
                      />
                      <ManageOptionsList
                        items={universeOptions.map((u) => ({ value: u.id, label: u.label, color: u.color }))}
                        onAdd={addUniverseOption}
                        onRemove={removeUniverseOption}
                        addPlaceholder="Add universe..."
                      />
                    </label>
                    <label>
                      <span className="text-xs font-medium text-ink-dim">Category</span>
                      <Dropdown
                        className="mt-1.5"
                        fullWidth
                        ariaLabel="Category"
                        value={draft.category}
                        options={categoryOptions.map((c) => ({ value: c, label: c }))}
                        onChange={(category) => setDraft((d) => ({ ...d, category }))}
                      />
                      <ManageOptionsList
                        items={categoryOptions.map((c) => ({ value: c, label: c }))}
                        onAdd={addCategoryOption}
                        onRemove={removeCategoryOption}
                        addPlaceholder="Add category..."
                      />
                    </label>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-ink-dim">Tags</span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {ALL_TAGS.map((tag) => {
                        const active = draft.tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            aria-pressed={active}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                              active
                                ? "border-accent-purple bg-accent-purple/15 text-accent-purple"
                                : "border-line text-ink-faint hover:border-ink-faint hover:text-ink"
                            )}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </FormSection>

                <FormSection title="Variants & Inventory">

                  <div>
                    <span className="text-xs font-medium text-ink-dim">Sizes available to customers</span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {ALL_SIZES.map((s) => {
                        const active = draft.sizes.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => toggleSize(s)}
                            aria-pressed={active}
                            className={cn(
                              "h-10 w-14 rounded-xl border text-sm font-semibold transition-colors",
                              active
                                ? "border-accent-purple bg-accent-purple/15 text-accent-purple"
                                : "border-line text-ink-faint hover:border-ink-faint hover:text-ink"
                            )}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-medium text-ink-dim">Product colors</span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {PREDEFINED_COLORS.map((color) => {
                        const active = draft.colors.some((c) => c.hex.toUpperCase() === color.hex.toUpperCase());
                        return (
                          <button
                            key={color.hex}
                            type="button"
                            onClick={() => addColor(color.hex, color.name)}
                            aria-pressed={active}
                            title={color.name}
                            className={cn(
                              "flex h-9 items-center gap-2 rounded-full border pl-2 pr-3 text-xs font-medium transition-colors",
                              active
                                ? "border-accent-purple bg-accent-purple/15 text-accent-purple"
                                : "border-line text-ink-faint hover:border-ink-faint hover:text-ink"
                            )}
                          >
                            <span className="h-4 w-4 rounded-full border border-line/60" style={{ backgroundColor: color.hex }} />
                            {color.name}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium text-ink-faint">Custom color:</span>
                      <input
                        type="color"
                        value={HEX_COLOR_PATTERN.test(customColorHex.trim()) ? normalizeHex(customColorHex) : "#000000"}
                        onChange={(e) => setCustomColorHex(e.target.value.toUpperCase())}
                        aria-label="Custom color picker"
                        className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-void p-1"
                      />
                      <input
                        type="text"
                        value={customColorHex}
                        onChange={(e) => setCustomColorHex(e.target.value)}
                        placeholder="#7C5CFF"
                        maxLength={7}
                        className="h-10 w-28 rounded-xl border border-line bg-void px-3 text-sm font-mono uppercase text-ink focus:border-accent-cyan focus:outline-none"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={handleAddCustomColor}>
                        <Plus className="h-3.5 w-3.5" /> Add color
                      </Button>
                    </div>
                    {draft.colors.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {draft.colors.map((color) => (
                          <span
                            key={color.hex}
                            className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1.5 pr-2.5 font-mono text-xs text-ink-dim"
                          >
                            <span className="h-5 w-5 rounded-full border border-line/60" style={{ backgroundColor: color.hex }} />
                            {color.name}
                            <button
                              type="button"
                              onClick={() => removeColor(color.hex)}
                              aria-label={`Remove color ${color.hex}`}
                              className="text-ink-faint hover:text-accent-red"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-1.5 text-[11px] text-ink-faint">At least one color is required.</p>
                  </div>

                  {/* Shopify-Style Variants & Stock Matrix Table */}
                  {draft.variants.length > 0 && (
                    <div className="mt-2 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                            <Layers className="h-4 w-4 text-accent-purple" />
                            Shopify Variants Inventory Matrix ({draft.variants.length} combinations)
                          </span>
                          <p className="text-[11px] text-ink-faint mt-0.5">
                            Set stock quantities per color and size combination. Total stock will be calculated automatically.
                          </p>
                        </div>
                        <span className="rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-3 py-1 font-mono text-xs font-bold text-accent-cyan">
                          Total Stock: {draft.stock} units
                        </span>
                      </div>

                      {/* Quick Bulk Edit Bar */}
                      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface/70 p-2.5">
                        <span className="text-xs font-medium text-ink-dim">Set stock for all:</span>
                        <input
                          type="number"
                          min="0"
                          value={bulkStockInput}
                          onChange={(e) => setBulkStockInput(e.target.value)}
                          className="h-8 w-20 rounded-lg border border-line bg-void px-2 text-center font-mono text-xs text-ink focus:border-accent-cyan focus:outline-none"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyStockToAllVariants(Number(bulkStockInput) || 0)}
                        >
                          <Check className="h-3.5 w-3.5" /> Apply to all variants
                        </Button>
                      </div>

                      {/* Matrix Table */}
                      <div className="max-h-64 overflow-y-auto rounded-xl border border-line bg-void shadow-inner">
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 z-10 border-b border-line bg-surface font-semibold text-ink-dim">
                            <tr>
                              <th className="px-3.5 py-2.5">Variant</th>
                              <th className="px-3.5 py-2.5">SKU</th>
                              <th className="px-3.5 py-2.5 text-right w-36">Stock (Units)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line/40">
                            {draft.variants.map((v) => {
                              const colorObj = draft.colors.find((c) => c.name === v.color);
                              return (
                                <tr key={`${v.color}-${v.size}`} className="hover:bg-surface/50 transition-colors">
                                  <td className="px-3.5 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="h-3.5 w-3.5 rounded-full border border-line/60 shrink-0"
                                        style={{ backgroundColor: colorObj?.hex || "#ffffff" }}
                                      />
                                      <span className="font-medium text-ink">{v.color}</span>
                                      <span className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink-dim">
                                        {v.size}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-ink-faint">
                                    {v.sku || `${slugify(draft.name || "item")}-${slugify(v.color)}-${v.size}`.toUpperCase()}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right">
                                    <input
                                      type="number"
                                      min="0"
                                      value={v.stock}
                                      onChange={(e) => updateVariantStock(v.color, v.size, Number(e.target.value))}
                                      className="h-8 w-24 rounded-lg border border-line bg-surface px-2 text-center font-mono text-xs font-semibold text-ink focus:border-accent-cyan focus:outline-none"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </FormSection>

                <FormSection title="Media & Color Galleries (Shopify Style)">
                  {draft.colors.length > 0 ? (
                    <div className="space-y-4">
                      {draft.colors.map((color) => {
                        const photos = draft.colorImages[color.name] ?? [];
                        const isMain = draft.mainColor === color.name || (!draft.mainColor && draft.colors[0]?.name === color.name);
                        const videoSlot = draft.colorVideos[color.name];

                        return (
                          <div
                            key={color.hex}
                            className={cn(
                              "rounded-2xl border p-4 transition-all shadow-sm",
                              isMain
                                ? "border-accent-purple/50 bg-accent-purple/5 ring-1 ring-accent-purple/30"
                                : "border-line bg-surface"
                            )}
                          >
                            {/* Color Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="h-5 w-5 rounded-full border border-line/60 shadow-sm shrink-0"
                                  style={{ backgroundColor: color.hex }}
                                />
                                <div>
                                  <span className="text-sm font-bold text-ink">{color.name}</span>
                                  <span className="ml-2 font-mono text-[10px] text-ink-faint uppercase">
                                    {color.hex}
                                  </span>
                                </div>
                              </div>

                              {/* Main Color Toggle */}
                              <button
                                type="button"
                                onClick={() => setMainColor(color.name)}
                                className={cn(
                                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                                  isMain
                                    ? "border border-accent-yellow/40 bg-accent-yellow/15 text-accent-yellow shadow-xs"
                                    : "border border-line bg-void text-ink-faint hover:border-line-dim hover:text-ink"
                                )}
                              >
                                <Star
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    isMain ? "fill-accent-yellow text-accent-yellow" : "text-ink-faint"
                                  )}
                                />
                                {isMain ? "⭐ Main / Cover Color" : "Set as Main Color"}
                              </button>
                            </div>

                            {/* Dynamic Photos List */}
                            <div className="mt-3.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-ink-dim uppercase tracking-wider">
                                  Photos ({photos.length} uploaded)
                                </span>
                                {isMain && photos.length > 0 && (
                                  <span className="font-mono text-[10px] text-accent-purple font-medium">
                                    Photo #1 is storefront thumbnail
                                  </span>
                                )}
                              </div>

                              <div className="mt-2.5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {photos.map((slot, idx) => {
                                  const src = slotPreviewSrc(slot);
                                  return (
                                    <div
                                      key={idx}
                                      className="group relative aspect-square rounded-xl border border-line bg-void overflow-hidden flex items-center justify-center shadow-xs"
                                    >
                                      {src && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={src}
                                          alt={`${color.name} ${idx + 1}`}
                                          className="h-full w-full object-cover"
                                        />
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => removeColorPhoto(color.name, idx)}
                                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-void/90 text-ink-faint hover:text-accent-red hover:bg-void flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 shadow-md"
                                        title="Delete photo"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                      <span className="absolute bottom-1 left-1 rounded bg-void/80 px-1.5 py-0.5 font-mono text-[9px] text-ink-faint backdrop-blur-xs">
                                        #{idx + 1}
                                      </span>
                                    </div>
                                  );
                                })}

                                {/* Add Photo Button (Dynamic) */}
                                <label className="group aspect-square cursor-pointer rounded-xl border-2 border-dashed border-line bg-void/40 p-2 transition-all hover:border-accent-purple hover:bg-accent-purple/5 flex flex-col items-center justify-center gap-1.5 text-center">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink-dim transition-colors group-hover:bg-accent-purple/20 group-hover:text-accent-purple">
                                    <Plus className="h-4 w-4" />
                                  </div>
                                  <span className="text-[11px] font-medium text-ink-dim transition-colors group-hover:text-accent-purple">
                                    + Add photo
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAddColorPhoto(color.name)}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            </div>

                            {/* Video for this specific color */}
                            <div className="mt-4 pt-3.5 border-t border-line/60">
                              <span className="text-xs font-semibold text-ink-dim uppercase tracking-wider">
                                Video preview for {color.name} (Optional)
                              </span>
                              <div className="mt-2 flex items-center gap-3">
                                {videoSlot && videoSlot.kind !== "empty" ? (
                                  <div className="relative h-20 w-32 shrink-0 rounded-xl border border-line bg-void overflow-hidden shadow-xs">
                                    <video
                                      src={slotPreviewSrc(videoSlot)}
                                      controls
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-xl border border-dashed border-line text-ink-faint bg-void/40">
                                    <Film className="h-6 w-6" />
                                  </div>
                                )}
                                <div className="flex flex-col gap-2">
                                  <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-line bg-void px-3 py-1.5 text-xs font-semibold text-ink hover:border-line-dim transition-colors">
                                    <Upload className="h-3.5 w-3.5" />{" "}
                                    {videoSlot && videoSlot.kind !== "empty" ? "Replace video" : "Upload video"}
                                    <input
                                      type="file"
                                      accept="video/*"
                                      onChange={handleColorVideoChange(color.name)}
                                      className="hidden"
                                    />
                                  </label>
                                  {videoSlot && videoSlot.kind !== "empty" && (
                                    <button
                                      type="button"
                                      onClick={() => removeColorVideo(color.name)}
                                      className="flex items-center gap-1 text-xs text-ink-faint hover:text-accent-red transition-colors"
                                    >
                                      <X className="h-3 w-3" /> Remove video
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-faint">
                      Please select or add at least one color above to upload photos and videos.
                    </div>
                  )}
                </FormSection>


                <FormSection title="Store settings">
                  <div className="grid grid-cols-2 gap-3.5">
                    <label>
                      <span className="text-xs font-medium text-ink-dim">Status</span>
                      <Dropdown
                        className="mt-1.5"
                        fullWidth
                        ariaLabel="Status"
                        value={draft.status}
                        options={ALL_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                        onChange={(status) => setDraft((d) => ({ ...d, status: status as Draft["status"] }))}
                      />
                    </label>
                    <label className="flex flex-col justify-end">
                      <span className="text-xs font-medium text-ink-dim">Featured</span>
                      <button
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, featured: !d.featured }))}
                        aria-pressed={draft.featured}
                        className={cn(
                          "mt-1.5 flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors",
                          draft.featured
                            ? "border-accent-purple bg-accent-purple/15 text-accent-purple"
                            : "border-line text-ink-faint hover:border-ink-faint hover:text-ink"
                        )}
                      >
                        <Star className={cn("h-3.5 w-3.5", draft.featured && "fill-accent-purple")} />
                        {draft.featured ? "Featured on homepage" : "Not featured"}
                      </button>
                    </label>
                  </div>
                  <label>
                    <span className="text-xs font-medium text-ink-dim">Slug</span>
                    <input
                      value={draft.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setDraft((d) => ({ ...d, slug: e.target.value }));
                      }}
                      placeholder={slugify(draft.name) || "auto-generated-from-name"}
                      className={cn(inputClass, "font-mono")}
                    />
                    <p className="mt-1 text-[11px] text-ink-faint">Leave blank to auto-generate from the product name.</p>
                  </label>
                </FormSection>

                <FormSection title="SEO">
                  <label>
                    <span className="text-xs font-medium text-ink-dim">SEO title</span>
                    <input
                      value={draft.seoTitle}
                      onChange={(e) => setDraft((d) => ({ ...d, seoTitle: e.target.value }))}
                      placeholder={draft.name || "Optional"}
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className="text-xs font-medium text-ink-dim">SEO description</span>
                    <textarea
                      value={draft.seoDescription}
                      onChange={(e) => setDraft((d) => ({ ...d, seoDescription: e.target.value }))}
                      rows={2}
                      placeholder="Optional"
                      className={cn(inputClass, "h-auto resize-y py-2.5")}
                    />
                  </label>
                </FormSection>

                <Button type="submit" variant="accent" size="md" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Save changes" : "Add product"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filtersOpen && (
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4">
          <FilterField label="Category">
            <Dropdown
              ariaLabel="Filter by category"
              value={categoryFilter}
              options={[{ value: "all", label: "All categories" }, ...categoryOptions.map((c) => ({ value: c, label: c }))]}
              onChange={setCategoryFilter}
            />
          </FilterField>
          <FilterField label="Universe">
            <Dropdown
              ariaLabel="Filter by universe"
              value={universeFilter}
              options={[{ value: "all", label: "All universes" }, ...universeOptions.map((u) => ({ value: u.id, label: u.label }))]}
              onChange={setUniverseFilter}
            />
          </FilterField>
          <FilterField label="Status">
            <Dropdown
              ariaLabel="Filter by status"
              value={statusFilter}
              options={[
                { value: "all", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "draft", label: "Draft" },
                { value: "archived", label: "Archived" },
              ]}
              onChange={setStatusFilter}
            />
          </FilterField>
          <FilterField label="Stock">
            <Dropdown
              ariaLabel="Filter by stock status"
              value={stockFilter}
              options={[
                { value: "all", label: "Any stock level" },
                { value: "in", label: "In stock" },
                { value: "low", label: "Low stock" },
                { value: "out", label: "Out of stock" },
              ]}
              onChange={setStockFilter}
            />
          </FilterField>
          <FilterField label="Min price">
            <input
              type="number"
              min={0}
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="0"
              className="h-11 w-24 rounded-xl border border-line bg-void px-3 text-sm text-ink focus:border-accent-cyan focus:outline-none"
            />
          </FilterField>
          <FilterField label="Max price">
            <input
              type="number"
              min={0}
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="Any"
              className="h-11 w-24 rounded-xl border border-line bg-void px-3 text-sm text-ink focus:border-accent-cyan focus:outline-none"
            />
          </FilterField>
          {activeFilterCount > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> Clear filters
            </Button>
          )}
        </div>
      )}

      {isError && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-accent-red/30 bg-accent-red/5 p-6">
          <p className="text-sm text-ink">Couldn&apos;t load products from the database.</p>
          <Button variant="outline" size="sm" onClick={loadAdminProducts}>
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line p-12 text-center text-sm text-ink-faint">
          {products.length === 0 ? "No products yet — add your first one." : "No products match your search/filters."}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-xs uppercase tracking-wider text-ink-faint">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU / ID</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Universe</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Compare-at</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const universe = getUniverse(p.universe);
                const threshold = p.lowStockThreshold ?? 10;
                const status = p.status ?? "active";
                return (
                  <tr key={p.id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductVisual image={p.image} color={universe.color} icon={p.artIcon} className="h-10 w-10 shrink-0" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-medium text-ink">
                            {p.featured && <Star className="h-3 w-3 shrink-0 fill-accent-purple text-accent-purple" />}
                            {p.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-faint">{p.sku || p.id}</td>
                    <td className="px-4 py-3 text-ink-dim">{p.category}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-ink-dim">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: universe.color }} />
                        {universe.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-ink">{formatPrice(p.price)}</td>
                    <td className="px-4 py-3 font-mono text-ink-faint">{p.compareAtPrice ? formatPrice(p.compareAtPrice) : "—"}</td>
                    <td className={cn("px-4 py-3 font-mono", p.stock <= threshold && "text-amber-400")}>{p.stock}</td>
                    <td className="px-4 py-3">
                      <Dropdown
                        compact
                        ariaLabel={`Change status for ${p.name}`}
                        value={status}
                        options={[
                          { value: "active", label: "Active" },
                          { value: "draft", label: "Draft" },
                          { value: "archived", label: "Archived" },
                        ]}
                        onChange={(next) => handleStatusChange(p, next as NonNullable<Product["status"]>)}
                      />
                    </td>
                    <td className="px-4 py-3 text-ink-dim">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-accent-cyan text-accent-cyan" />
                        {Number(p.rating || 0).toFixed(1)}
                        <span className="text-ink-faint">({p.reviewCount ?? 0})</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-faint">
                      {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-faint">
                      {p.updatedAt
                        ? new Date(p.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5 hover:text-ink">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDuplicate(p)} aria-label={`Duplicate ${p.name}`} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5 hover:text-ink">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => requestDelete(p)} aria-label={`Delete ${p.name}`} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5 hover:text-accent-red">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent title="Delete product">
          {deleteTarget?.orderCount === null ? (
            <p className="text-sm text-ink-dim">Checking order history…</p>
          ) : deleteTarget && deleteTarget.orderCount > 0 ? (
            <>
              <p className="text-sm text-ink-dim">
                <span className="font-medium text-ink">{deleteTarget.product.name}</span> appears in{" "}
                <span className="font-medium text-ink">{deleteTarget.orderCount}</span> order line
                {deleteTarget.orderCount === 1 ? "" : "s"}. Deleting it would break that order history, so it can&apos;t be
                permanently deleted. Archive it instead to hide it from the storefront while keeping past orders intact.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="accent" size="sm" onClick={archiveInsteadOfDelete}>
                  Archive instead
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-dim">
                Delete <span className="font-medium text-ink">{deleteTarget?.product.name}</span>? This can&apos;t be undone.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-accent-red text-accent-red hover:bg-accent-red/10"
                  onClick={confirmDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent title="Reset to default catalog">
          <p className="text-sm text-ink-dim">
            This replaces all products, universes, and categories with the original seed data. Anything you&apos;ve added or
            changed will be lost. This can&apos;t be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setResetConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-accent-red text-accent-red hover:bg-accent-red/10"
              onClick={confirmReset}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
