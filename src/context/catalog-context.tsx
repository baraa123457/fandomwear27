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

import { deleteProductMediaMany } from "@/lib/supabase/storage/product-media";

const CATEGORIES_KEY = "fandomwear:catalog-categories";

function clearStorage(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

const seedCategories = Array.from(
  new Set(seedProducts.map((p) => p.category))
);

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
    /* storage unavailable */
  }
}

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
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

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
   * We start with the seed data only so the UI has something to render
   * while Supabase is loading or temporarily unavailable.
   *
   * Once Supabase responds, its data replaces the seed data.
   */

  const [products, setProducts] = useState<Product[]>(seedProducts);

  const [universes, setUniverses] = useState<UniverseInfo[]>([]);

  const [categories, setCategories] =
    useState<string[]>(seedCategories);

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

  const productsRef = useRef<Product[]>(seedProducts);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const universesRef = useRef<UniverseInfo[]>([]);

  useEffect(() => {
    universesRef.current = universes;
  }, [universes]);

  /*
   * Categories are still stored locally for now.
   */

  useEffect(() => {
    setCategories(
      loadFromStorage(
        CATEGORIES_KEY,
        seedCategories
      )
    );
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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();

        const rows = await fetchProducts(supabase);

        if (!cancelled) {
          setProducts(rows);
        }
      } catch (err) {
        console.warn(
          "[catalog] Supabase products fetch failed. Using seed products as fallback:",
          err
        );

        if (!cancelled) {
          setProducts(seedProducts);
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
        }
      } catch (err) {
        console.warn(
          "[catalog] Supabase universes fetch failed. Using seed universes as fallback:",
          err
        );

        if (!cancelled) {
          setUniverses(seedUniverses);
        }
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
      const normalized =
        category.trim();

      if (!normalized) return;

      setCategories((prev) => {
        /*
         * Prevent duplicates.
         */

        if (
          prev.some(
            (c) =>
              c.toLowerCase() ===
              normalized.toLowerCase()
          )
        ) {
          return prev;
        }

        const next = [
          ...prev,
          normalized,
        ];

        saveToStorage(
          CATEGORIES_KEY,
          next
        );

        return next;
      });
    },
    []
  );

  /*
   * REMOVE CATEGORY
   */

  const removeCategory = useCallback(
    (category: string) => {
      setCategories((prev) => {
        const next = prev.filter(
          (c) => c !== category
        );

        saveToStorage(
          CATEGORIES_KEY,
          next
        );

        return next;
      });
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
   * This function now means:
   *
   * - reset categories to local seed categories
   * - re-fetch products from Supabase
   * - re-fetch universes from Supabase
   *
   * It DOES NOT recreate deleted Supabase universes.
   */

  const resetToSeed = useCallback(() => {
    clearStorage(CATEGORIES_KEY);

    setCategories(
      seedCategories
    );

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
   */

  const getFeatured =
    useCallback(
      (limit = 8) =>
        [...products]
          .sort(
            (a, b) =>
              b.rating - a.rating
          )
          .slice(0, limit),
      [products]
    );

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
        refreshSalesCounts: loadSalesCounts,
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

        salesCounts,
        loadSalesCounts,
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