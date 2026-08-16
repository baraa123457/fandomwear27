"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { products as seedProducts } from "@/lib/data/products";
import { universes as seedUniverses, resolveUniverse } from "@/lib/data/universes";
import { Product, UniverseInfo } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { fetchUniverses, insertUniverse, deleteUniverse } from "@/lib/supabase/queries/universes";
import {
  fetchProducts,
  insertProduct,
  updateProductRow,
  deleteProductRow,
  upsertProducts,
} from "@/lib/supabase/queries/products";

const CATEGORIES_KEY = "fandomwear:catalog-categories";

function clearStorage(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

const seedCategories = Array.from(new Set(seedProducts.map((p) => p.category)));

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (quota, private mode, etc) — app still works for this session */
  }
}

interface CatalogContextValue {
  products: Product[];
  universes: UniverseInfo[];
  categories: string[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addUniverse: (universe: UniverseInfo) => void;
  removeUniverse: (id: string) => void;
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  importProducts: (products: Product[]) => void;
  resetToSeed: () => void;
  getUniverse: (id: string) => UniverseInfo;
  getProductBySlug: (slug: string) => Product | undefined;
  getNewArrivals: (limit?: number) => Product[];
  getBestSellers: (limit?: number) => Product[];
  getFeatured: (limit?: number) => Product[];
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  // Products and universes now both live in Supabase (see PHASE 4). Static
  // seed constants are kept only as offline/error fallbacks.
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [universes, setUniverses] = useState<UniverseInfo[]>(seedUniverses);
  const [categories, setCategories] = useState<string[]>(seedCategories);

  // Kept in sync so the async mutators below can roll back to the exact
  // pre-mutation list on a failed Supabase write, without needing the state
  // itself in their dependency arrays.
  const productsRef = useRef(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const universesRef = useRef(universes);
  useEffect(() => {
    universesRef.current = universes;
  }, [universes]);

  // Hydrate categories from localStorage once on mount (client only, avoids
  // SSR mismatch). Categories are still an admin-managed local list, not
  // (yet) backed by their own table — out of scope for this phase.
  useEffect(() => {
    setCategories(loadFromStorage(CATEGORIES_KEY, seedCategories));
  }, []);

  // Load products from Supabase once on mount. Falls back to the bundled
  // seed list (already set as initial state above) if the fetch fails, so
  // local dev without a configured/linked Supabase project still works.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const rows = await fetchProducts(supabase);
        if (!cancelled && rows.length > 0) {
          setProducts(rows);
        }
      } catch (err) {
        console.warn("[catalog] Falling back to seed products — Supabase fetch failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load universes from Supabase once on mount. Falls back to the bundled
  // seed list (already set as initial state above) if the fetch fails, so
  // local dev without a configured/linked Supabase project still works.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const rows = await fetchUniverses(supabase);
        if (!cancelled && rows.length > 0) {
          setUniverses(rows);
        }
      } catch (err) {
        console.warn("[catalog] Falling back to seed universes — Supabase fetch failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Optimistically update local state, then persist to Supabase; roll back
  // to the pre-mutation list if the write fails. The public signature stays
  // synchronous (fire-and-forget) so existing callers don't need to change.
  const addProduct = useCallback((product: Product) => {
    setProducts((prev) => [product, ...prev]);
    (async () => {
      try {
        const supabase = createClient();
        await insertProduct(supabase, product);
      } catch (err) {
        console.error("[catalog] Failed to save product to Supabase, rolling back:", err);
        setProducts(productsRef.current.filter((p) => p.id !== product.id));
      }
    })();
  }, []);

  const updateProduct = useCallback((id: string, patch: Partial<Product>) => {
    const prevList = productsRef.current;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    (async () => {
      try {
        const supabase = createClient();
        await updateProductRow(supabase, id, patch);
      } catch (err) {
        console.error("[catalog] Failed to update product in Supabase, rolling back:", err);
        setProducts(prevList);
      }
    })();
  }, []);

  const deleteProduct = useCallback((id: string) => {
    const prevList = productsRef.current;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    (async () => {
      try {
        const supabase = createClient();
        await deleteProductRow(supabase, id);
      } catch (err) {
        console.error("[catalog] Failed to delete product from Supabase, rolling back:", err);
        setProducts(prevList);
      }
    })();
  }, []);

  // Optimistically update local state, then persist to Supabase; roll back
  // to the pre-mutation list if the write fails. The public signature stays
  // synchronous (fire-and-forget) so existing callers don't need to change.
  const addUniverse = useCallback((universe: UniverseInfo) => {
    setUniverses((prev) => [...prev, universe]);
    (async () => {
      try {
        const supabase = createClient();
        await insertUniverse(supabase, universe);
      } catch (err) {
        console.error("[catalog] Failed to save universe to Supabase, rolling back:", err);
        setUniverses(universesRef.current.filter((u) => u.id !== universe.id));
      }
    })();
  }, []);

  const removeUniverse = useCallback((id: string) => {
    const prevList = universesRef.current;
    setUniverses((prev) => prev.filter((u) => u.id !== id));
    (async () => {
      try {
        const supabase = createClient();
        await deleteUniverse(supabase, id);
      } catch (err) {
        console.error("[catalog] Failed to delete universe from Supabase, rolling back:", err);
        setUniverses(prevList);
      }
    })();
  }, []);

  const addCategory = useCallback((category: string) => {
    setCategories((prev) => {
      const next = [...prev, category];
      saveToStorage(CATEGORIES_KEY, next);
      return next;
    });
  }, []);

  const removeCategory = useCallback((category: string) => {
    setCategories((prev) => {
      const next = prev.filter((c) => c !== category);
      saveToStorage(CATEGORIES_KEY, next);
      return next;
    });
  }, []);

  const importProducts = useCallback((incoming: Product[]) => {
    const prevList = productsRef.current;
    setProducts((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      for (const product of incoming) {
        byId.set(product.id, { ...byId.get(product.id), ...product });
      }
      return Array.from(byId.values());
    });
    (async () => {
      try {
        const supabase = createClient();
        await upsertProducts(supabase, incoming);
      } catch (err) {
        console.error("[catalog] Failed to import products to Supabase, rolling back:", err);
        setProducts(prevList);
      }
    })();
  }, []);

  const resetToSeed = useCallback(() => {
    clearStorage(CATEGORIES_KEY);
    setCategories(seedCategories);
    // Products and universes are no longer per-browser localStorage copies —
    // "reset to seed" now means re-fetching the canonical lists from
    // Supabase (which supabase/seed.sql populates with these exact same
    // seed values), discarding any unsaved local optimistic state.
    (async () => {
      try {
        const supabase = createClient();
        const rows = await fetchProducts(supabase);
        setProducts(rows.length > 0 ? rows : seedProducts);
      } catch (err) {
        console.warn("[catalog] resetToSeed: falling back to bundled seed products:", err);
        setProducts(seedProducts);
      }
    })();
    (async () => {
      try {
        const supabase = createClient();
        const rows = await fetchUniverses(supabase);
        setUniverses(rows.length > 0 ? rows : seedUniverses);
      } catch (err) {
        console.warn("[catalog] resetToSeed: falling back to bundled seed universes:", err);
        setUniverses(seedUniverses);
      }
    })();
  }, []);

  const getUniverse = useCallback((id: string) => resolveUniverse(universes, id), [universes]);

  const getProductBySlug = useCallback(
    (slug: string) => products.find((p) => p.slug === slug),
    [products]
  );

  const getNewArrivals = useCallback(
    (limit = 8) =>
      [...products].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, limit),
    [products]
  );

  const getBestSellers = useCallback(
    (limit = 8) => products.filter((p) => p.tags.includes("bestseller")).slice(0, limit),
    [products]
  );

  const getFeatured = useCallback(
    (limit = 8) => [...products].sort((a, b) => b.rating - a.rating).slice(0, limit),
    [products]
  );

  const value = useMemo<CatalogContextValue>(
    () => ({
      products,
      universes,
      categories,
      addProduct,
      updateProduct,
      deleteProduct,
      addUniverse,
      removeUniverse,
      addCategory,
      removeCategory,
      importProducts,
      resetToSeed,
      getUniverse,
      getProductBySlug,
      getNewArrivals,
      getBestSellers,
      getFeatured,
    }),
    [
      products,
      universes,
      categories,
      addProduct,
      updateProduct,
      deleteProduct,
      addUniverse,
      removeUniverse,
      addCategory,
      removeCategory,
      importProducts,
      resetToSeed,
      getUniverse,
      getProductBySlug,
      getNewArrivals,
      getBestSellers,
      getFeatured,
    ]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
