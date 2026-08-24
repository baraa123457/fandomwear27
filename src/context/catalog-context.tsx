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
import { getErrorMessage } from "@/lib/utils";

import { createClient } from "@/lib/supabase/client";

import {
  fetchUniverses,
  insertUniverse,
  deleteUniverse,
} from "@/lib/supabase/queries/universes";

import {
  fetchProducts,
  fetchProductSalesCounts,
  insertProduct,
  updateProductRow,
  deleteProductRow,
  upsertProducts,
} from "@/lib/supabase/queries/products";

import {
  fetchCategories,
  insertCategory,
  deleteCategory,
} from "@/lib/supabase/queries/categories";

import { deleteProductMediaMany } from "@/lib/supabase/storage/product-media";

// Seed categories: used ONLY as a cold-start fallback when Supabase is
// unreachable. Never used to override a successful Supabase response.
const seedCategories = Array.from(
  new Set(seedProducts.map((p) => p.category))
);

interface CatalogContextValue {
  products: Product[];
  universes: UniverseInfo[];
  categories: string[];

  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<void>;
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

  /**
   * Real units-sold-per-product, keyed by product id (from the
   * `product_sales_counts` view — see migration 20260816000015). A
   * missing key means 0 sales, not "unknown". Exposed directly (not just
   * via getBestSellers) so other sorts/UI that want real sales data —
   * e.g. the shop page's "Best selling" sort — can use the same numbers
   * instead of falling back to the static `bestseller` tag.
   */
  salesCounts: Record<string, number>;
  /** Re-fetches salesCounts from Supabase. Call after an order is placed
   *  or an order's status changes, so Best Sellers reflects it without
   *  requiring a full page reload or any polling. */
  refreshSalesCounts: () => Promise<void>;

  /** Deduct product stock in memory immediately upon purchase */
  deductStock: (items: { productId: string; quantity: number }[]) => void;
  /** Restore product stock in memory upon order cancellation */
  restoreStock: (items: { productId: string; quantity: number }[]) => void;

  /** Whether products and universes are currently loading from Supabase on cold start */
  isLoading: boolean;
  /**
   * Re-fetches products (including `stock`) from Supabase. Call after an
   * order is placed or cancelled/reinstated, so every stock display
   * (product cards, product page, admin) reflects the real database
   * value instead of the number that was current when the page loaded.
   */
  refreshProducts: () => Promise<void>;
}


const CatalogContext = createContext<CatalogContextValue | null>(null);

const PRODUCTS_CACHE_KEY = "fandomwear:products-cache";
const UNIVERSES_CACHE_KEY = "fandomwear:universes-cache";

function getInitialProducts(): Product[] {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(PRODUCTS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore storage errors */
    }
  }
  return [];
}

function getInitialUniverses(): UniverseInfo[] {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(UNIVERSES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore storage errors */
    }
  }
  return [];
}


export function CatalogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
   * IMPORTANT:
   *
   * Supabase is the source of truth for products and universes.
   *
   * We start with cached data (or seed data on very first visit) so the
   * UI renders instantly without any flickering or flash of wrong items.
   *
   * Once Supabase responds, its fresh data updates state and local cache.
   */

  const [products, setProducts] = useState<Product[]>(getInitialProducts);

  const [universes, setUniverses] = useState<UniverseInfo[]>(getInitialUniverses);

  const [categories, setCategories] =
    useState<string[]>(seedCategories);

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return getInitialProducts().length === 0;
  });

  // Real units-sold-per-product (see fetchProductSalesCounts). Starts
  // empty rather than seeded with fake numbers — until this loads,
  // getBestSellers() correctly reports "no sales data yet" instead of
  // fabricating a ranking.
  const [salesCounts, setSalesCounts] = useState<Record<string, number>>({});

  /*
   * Keep refs synchronized with the latest state.
   *
   * These are used for rollback when a Supabase mutation fails.
   */

  const productsRef = useRef<Product[]>(products);

  useEffect(() => {
    productsRef.current = products;
    if (products.length > 0) {
      try {
        localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
      } catch {
        /* ignore storage quota errors */
      }
    }
  }, [products]);


  const universesRef = useRef<UniverseInfo[]>(universes);

  useEffect(() => {
    universesRef.current = universes;
  }, [universes]);


  /*
   * Load categories from Supabase (migration 20260822000020).
   *
   * Falls back to seed categories if Supabase is unreachable so the
   * shop filter panel never renders empty. An empty Supabase result IS
   * valid (admin deleted everything) — we only use the seed when the
   * query itself fails (network error, auth error, etc.).
   */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const rows = await fetchCategories(supabase);

        if (!cancelled) {
          setCategories(rows.length > 0 ? rows : seedCategories);
        }
      } catch (err) {
        console.warn(
          "[catalog] Supabase categories fetch failed. Using seed categories as fallback:",
          err
        );

        if (!cancelled) {
          setCategories(seedCategories);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Load products from Supabase.
   *
   * IMPORTANT:
   * An empty Supabase result is valid.
   *
   * We therefore DO NOT keep the seed products when Supabase
   * successfully returns zero rows.
   *
   * This prevents deleted database products from coming back.
   */

  const loadProducts = useCallback(async () => {
    try {
      const supabase = createClient();
      const rows = await fetchProducts(supabase);
      setProducts(rows);
      try {
        localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(rows));
      } catch {
        /* storage full or unavailable */
      }
    } catch (err) {
      console.warn("[catalog] Supabase products fetch failed:", err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();

        const rows = await fetchProducts(supabase);

        if (!cancelled) {
          setProducts(rows);
          setIsLoading(false);
          try {
            localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(rows));
          } catch {
            /* storage full or unavailable */
          }
        }
      } catch (err) {
        console.warn("[catalog] Supabase products fetch failed:", err);
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Load universes from Supabase.
   *
   * IMPORTANT:
   * We DO NOT fall back to seedUniverses when Supabase
   * successfully returns an empty list.
   *
   * Therefore, if you deleted potter/anime/gaming/etc.
   * from Supabase, they stay deleted.
   */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();

        const rows = await fetchUniverses(supabase);

        if (!cancelled) {
          setUniverses(rows);
          try {
            localStorage.setItem(UNIVERSES_CACHE_KEY, JSON.stringify(rows));
          } catch {
            /* storage full or unavailable */
          }
        }
      } catch (err) {
        console.warn("[catalog] Supabase universes fetch failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);



  /*
   * Load real sales counts from Supabase (see migration
   * 20260816000015_product_sales_counts.sql). A failure here shouldn't
   * break the storefront — it just means Best Sellers temporarily shows
   * no ranking (getBestSellers falls back sensibly, see below) rather
   * than fabricated data.
   */

  const loadSalesCounts = useCallback(async () => {
    try {
      const supabase = createClient();
      const counts = await fetchProductSalesCounts(supabase);
      setSalesCounts(counts);
    } catch (err) {
      console.warn(
        "[catalog] Failed to load product sales counts:",
        err
      );
    }
  }, []);

  useEffect(() => {
    loadSalesCounts();
  }, [loadSalesCounts]);

  /*
   * ADD PRODUCT
   */

  const addProduct = useCallback(async (product: Product) => {
    /*
     * Optimistic UI update.
     */

    setProducts((prev) => [product, ...prev]);

    /*
     * Save to Supabase.
     */

    try {
      const supabase = createClient();

      await insertProduct(
        supabase,
        product
      );
    } catch (err) {
      console.error(
        "[catalog] Failed to save product to Supabase. Rolling back:",
        getErrorMessage(err),
        err
      );

      /*
       * Restore previous state.
       *
       * We remove only the product that failed.
       */

      setProducts((prev) =>
        prev.filter(
          (p) => p.id !== product.id
        )
      );

      /*
       * Rethrow so the caller (e.g. the admin form) knows the save
       * failed and can show an accurate error state instead of a
       * false "saved" confirmation.
       */
      throw err;
    }
  }, []);

  /*
   * UPDATE PRODUCT
   */

  const updateProduct = useCallback(
    async (
      id: string,
      patch: Partial<Product>
    ) => {
      const previousProducts =
        productsRef.current;

      /*
       * Optimistic update.
       */

      setProducts((prev) =>
        prev.map((product) =>
          product.id === id
            ? {
                ...product,
                ...patch,
              }
            : product
        )
      );

      /*
       * Persist update.
       */

      try {
        const supabase = createClient();

        await updateProductRow(
          supabase,
          id,
          patch
        );
      } catch (err) {
        console.error(
          "[catalog] Failed to update product in Supabase. Rolling back:",
          getErrorMessage(err),
          err
        );

        setProducts(previousProducts);

        /*
         * Rethrow so the caller (e.g. the admin form) knows the save
         * failed and can show an accurate error state instead of a
         * false "saved" confirmation.
         */
        throw err;
      }
    },
    []
  );

  /*
   * DELETE PRODUCT
   */

  const deleteProduct = useCallback(
    (id: string) => {
      const previousProducts =
        productsRef.current;
      const deletedProduct = previousProducts.find((p) => p.id === id);

      /*
       * Optimistic delete.
       */

      setProducts((prev) =>
        prev.filter(
          (product) =>
            product.id !== id
        )
      );

      /*
       * Delete from Supabase.
       */

      (async () => {
        try {
          const supabase = createClient();

          await deleteProductRow(
            supabase,
            id
          );

          // Only clean up Storage once the row is actually gone — same
          // "database write first, media cleanup second" ordering used by
          // add/update, so a failed delete never leaves the catalog
          // pointing at media that's already been removed.
          if (deletedProduct) {
            const mediaUrls = [
              ...(deletedProduct.images && deletedProduct.images.length > 0
                ? deletedProduct.images
                : deletedProduct.image
                  ? [deletedProduct.image]
                  : []),
              deletedProduct.video,
            ];
            void deleteProductMediaMany(supabase, mediaUrls);
          }
        } catch (err) {
          console.error(
            "[catalog] Failed to delete product from Supabase. Rolling back:",
            getErrorMessage(err),
            err
          );

          setProducts(previousProducts);
        }
      })();
    },
    []
  );

  /*
   * ADD UNIVERSE
   */

  const addUniverse = useCallback(
    (universe: UniverseInfo) => {
      /*
       * Optimistic update.
       */

      setUniverses((prev) => [
        ...prev,
        universe,
      ]);

      /*
       * Save to Supabase.
       */

      (async () => {
        try {
          const supabase = createClient();

          await insertUniverse(
            supabase,
            universe
          );
        } catch (err) {
          console.error(
            "[catalog] Failed to save universe to Supabase. Rolling back:",
            err
          );

          setUniverses((prev) =>
            prev.filter(
              (u) => u.id !== universe.id
            )
          );
        }
      })();
    },
    []
  );

  /*
   * REMOVE UNIVERSE
   */

  const removeUniverse = useCallback(
    (id: string) => {
      const previousUniverses =
        universesRef.current;

      /*
       * Optimistic delete.
       */

      setUniverses((prev) =>
        prev.filter(
          (universe) =>
            universe.id !== id
        )
      );

      /*
       * Delete from Supabase.
       */

      (async () => {
        try {
          const supabase = createClient();

          await deleteUniverse(
            supabase,
            id
          );
        } catch (err) {
          console.error(
            "[catalog] Failed to delete universe from Supabase. Rolling back:",
            err
          );

          setUniverses(previousUniverses);
        }
      })();
    },
    []
  );

  /*
   * ADD CATEGORY
   */

  const addCategory = useCallback(
    (category: string) => {
      const normalized = category.trim();
      if (!normalized) return;

      // Optimistic update — prevent duplicates client-side.
      setCategories((prev) => {
        if (prev.some((c) => c.toLowerCase() === normalized.toLowerCase())) {
          return prev;
        }
        return [...prev, normalized].sort();
      });

      // Persist to Supabase (admin-only, RLS enforced).
      (async () => {
        try {
          const supabase = createClient();
          await insertCategory(supabase, normalized);
        } catch (err) {
          console.error("[catalog] Failed to save category to Supabase. Rolling back:", err);
          // Roll back the optimistic add.
          setCategories((prev) => prev.filter((c) => c !== normalized));
        }
      })();
    },
    []
  );

  /*
   * REMOVE CATEGORY
   */

  const removeCategory = useCallback(
    (category: string) => {
      const previousCategories = [...([] as string[])];

      // Optimistic delete.
      setCategories((prev) => {
        previousCategories.push(...prev);
        return prev.filter((c) => c !== category);
      });

      // Persist to Supabase (admin-only, RLS enforced).
      (async () => {
        try {
          const supabase = createClient();
          await deleteCategory(supabase, category);
        } catch (err) {
          console.error("[catalog] Failed to delete category from Supabase. Rolling back:", err);
          setCategories(previousCategories);
        }
      })();
    },
    []
  );

  /*
   * IMPORT PRODUCTS
   */

  const importProducts = useCallback(
    (incoming: Product[]) => {
      const previousProducts =
        productsRef.current;

      /*
       * Optimistically merge products.
       */

      setProducts((prev) => {
        const byId = new Map(
          prev.map((p) => [
            p.id,
            p,
          ])
        );

        for (const product of incoming) {
          byId.set(
            product.id,
            {
              ...byId.get(product.id),
              ...product,
            }
          );
        }

        return Array.from(
          byId.values()
        );
      });

      /*
       * Persist to Supabase.
       */

      (async () => {
        try {
          const supabase =
            createClient();

          await upsertProducts(
            supabase,
            incoming
          );
        } catch (err) {
          console.error(
            "[catalog] Failed to import products to Supabase. Rolling back:",
            err
          );

          setProducts(
            previousProducts
          );
        }
      })();
    },
    []
  );

  /*
   * RESET TO SEED
   *
   * Re-fetches products and universes from Supabase. Categories are now
   * stored in Supabase (migration 20260822000020) and are not reset here —
   * the admin manages them explicitly via the Content Management page.
   * It DOES NOT recreate deleted Supabase universes.
   */

  const resetToSeed = useCallback(() => {
    (async () => {
      try {
        const supabase =
          createClient();

        const rows =
          await fetchProducts(
            supabase
          );

        setProducts(rows);
      } catch (err) {
        console.warn(
          "[catalog] resetToSeed products fetch failed. Using seed products:",
          err
        );

        setProducts(
          seedProducts
        );
      }
    })();

    (async () => {
      try {
        const supabase =
          createClient();

        const rows =
          await fetchUniverses(
            supabase
          );

        setUniverses(rows);
      } catch (err) {
        console.warn(
          "[catalog] resetToSeed universes fetch failed. Using seed universes:",
          err
        );

        setUniverses(
          seedUniverses
        );
      }
    })();
  }, []);

  /*
   * GET UNIVERSE
   */

  const getUniverse = useCallback(
    (id: string) =>
      resolveUniverse(
        universes,
        id
      ),
    [universes]
  );

  /*
   * GET PRODUCT BY SLUG
   */

  const getProductBySlug =
    useCallback(
      (slug: string) =>
        products.find(
          (product) =>
            product.slug === slug
        ),
      [products]
    );

  /*
   * NEW ARRIVALS
   */

  const getNewArrivals =
    useCallback(
      (limit = 8) =>
        [...products]
          .sort(
            (a, b) =>
              +new Date(
                b.createdAt
              ) -
              +new Date(
                a.createdAt
              )
          )
          .slice(0, limit),
      [products]
    );

  /*
   * BEST SELLERS
   */

  /*
   * BEST SELLERS
   *
   * Calculated from real sales (salesCounts, sourced from the
   * product_sales_counts view — see fetchProductSalesCounts/migration
   * 20260816000015), NOT from the static `bestseller` tag. That tag is
   * still used elsewhere (product-card.tsx badge, shop-utils.ts "best"
   * sort as a legacy fallback) but is no longer this function's source
   * of truth.
   *
   * Only products with at least one real, non-cancelled sale are
   * included — a product nobody has bought yet is never shown as a
   * "Best Seller" just to pad the list out to `limit`. If nothing has
   * sold yet, this returns an empty array (the homepage section simply
   * renders fewer/zero cards, which is a sensible existing fallback —
   * no fabricated ranking is introduced here to compensate).
   */
  const getBestSellers =
    useCallback(
      (limit = 8) =>
        products
          .filter((product) => (salesCounts[product.id] ?? 0) > 0)
          .sort(
            (a, b) => (salesCounts[b.id] ?? 0) - (salesCounts[a.id] ?? 0)
          )
          .slice(0, limit),
      [products, salesCounts]
    );

  /*
   * FEATURED
   *
   * Manually curated by the admin (Products page "Featured" toggle,
   * migration 20260816000018), not derived from rating. A product with
   * `featured` unset (only possible from the seed fallback array) is
   * treated as not featured — if nothing has been marked yet, this
   * returns an empty array rather than fabricating a ranking.
   */

  const getFeatured =
    useCallback(
      (limit = 8) =>
        products
          .filter((product) => product.featured === true)
          .slice(0, limit),
      [products]
    );

  const deductStock = useCallback((items: { productId: string; quantity: number }[]) => {
    setProducts((prev) =>
      prev.map((p) => {
        const item = items.find((i) => i.productId === p.id);
        if (!item) return p;
        return {
          ...p,
          stock: Math.max(0, p.stock - item.quantity),
        };
      })
    );
  }, []);

  const restoreStock = useCallback((items: { productId: string; quantity: number }[]) => {
    setProducts((prev) =>
      prev.map((p) => {
        const item = items.find((i) => i.productId === p.id);
        if (!item) return p;
        return {
          ...p,
          stock: p.stock + item.quantity,
        };
      })
    );
  }, []);

  /*
   * CONTEXT VALUE
   */

  const value =
    useMemo<CatalogContextValue>(
      () => ({
        products,
        universes,
        categories,

        addProduct,
        updateProduct,
        deleteProduct,
        deductStock,
        restoreStock,

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

        salesCounts,
        isLoading,
        refreshSalesCounts: loadSalesCounts,
        refreshProducts: loadProducts,
      }),
      [
        products,
        universes,
        categories,
        isLoading,

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

        salesCounts,
        loadSalesCounts,
        loadProducts,
        deductStock,
        restoreStock,
      ]
    );

  return (
    <CatalogContext.Provider
      value={value}
    >
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx =
    useContext(
      CatalogContext
    );

  if (!ctx) {
    throw new Error(
      "useCatalog must be used within CatalogProvider"
    );
  }

  return ctx;
}