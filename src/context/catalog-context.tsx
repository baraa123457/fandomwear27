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

import {
  fetchUniverses,
  insertUniverse,
  deleteUniverse,
} from "@/lib/supabase/queries/universes";

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

export function CatalogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
   * Supabase is the source of truth.
   *
   * Seed data is only used if Supabase cannot be reached.
   */
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [universes, setUniverses] = useState<UniverseInfo[]>(seedUniverses);
  const [categories, setCategories] = useState<string[]>(seedCategories);

  const productsRef = useRef(products);
  const universesRef = useRef(universes);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    universesRef.current = universes;
  }, [universes]);

  /*
   * Categories are still stored locally for now.
   */
  useEffect(() => {
    setCategories(
      loadFromStorage(CATEGORIES_KEY, seedCategories)
    );
  }, []);

  /*
   * Load products from Supabase.
   *
   * IMPORTANT:
   * We intentionally DO NOT check rows.length > 0.
   *
   * If Supabase returns [] that means the table is empty,
   * and the UI must also become empty.
   */
  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      try {
        const supabase = createClient();
        const rows = await fetchProducts(supabase);

        if (!cancelled) {
          setProducts(rows);
          productsRef.current = rows;
        }
      } catch (err) {
        console.error(
          "[catalog] Failed to load products from Supabase:",
          err
        );

        /*
         * Only keep the seed data if Supabase itself failed.
         */
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Load universes from Supabase.
   *
   * Same rule as products:
   * an empty array is a valid result.
   */
  useEffect(() => {
    let cancelled = false;

    const loadUniverses = async () => {
      try {
        const supabase = createClient();
        const rows = await fetchUniverses(supabase);

        if (!cancelled) {
          setUniverses(rows);
          universesRef.current = rows;
        }
      } catch (err) {
        console.error(
          "[catalog] Failed to load universes from Supabase:",
          err
        );
      }
    };

    loadUniverses();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ADD PRODUCT
   */
  const addProduct = useCallback((product: Product) => {
    const previousProducts = productsRef.current;

    /*
     * Optimistic UI update.
     */
    setProducts((prev) => [product, ...prev]);

    /*
     * Persist to Supabase.
     */
    (async () => {
      try {
        const supabase = createClient();

        const savedProduct = await insertProduct(
          supabase,
          product
        );

        /*
         * Make sure local state uses the actual saved row.
         */
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? savedProduct : p
          )
        );
      } catch (err) {
        console.error(
          "[catalog] Failed to save product to Supabase:",
          err
        );

        /*
         * Roll back only if the insert failed.
         */
        setProducts(previousProducts);
      }
    })();
  }, []);

  /*
   * UPDATE PRODUCT
   */
  const updateProduct = useCallback(
    (id: string, patch: Partial<Product>) => {
      const previousProducts = productsRef.current;

      /*
       * Optimistic update.
       */
      setProducts((prev) =>
        prev.map((product) =>
          product.id === id
            ? { ...product, ...patch }
            : product
        )
      );

      (async () => {
        try {
          const supabase = createClient();

          const updatedProduct = await updateProductRow(
            supabase,
            id,
            patch
          );

          /*
           * Replace optimistic version with database version.
           */
          setProducts((prev) =>
            prev.map((product) =>
              product.id === id
                ? updatedProduct
                : product
            )
          );
        } catch (err) {
          console.error(
            "[catalog] Failed to update product in Supabase:",
            err
          );

          /*
           * Roll back only when Supabase update fails.
           */
          setProducts(previousProducts);
        }
      })();
    },
    []
  );

  /*
   * DELETE PRODUCT
   */
  const deleteProduct = useCallback((id: string) => {
    const previousProducts = productsRef.current;

    /*
     * Remove immediately from UI.
     */
    setProducts((prev) =>
      prev.filter((product) => product.id !== id)
    );

    (async () => {
      try {
        const supabase = createClient();

        await deleteProductRow(supabase, id);

        /*
         * DELETE SUCCEEDED.
         *
         * Do not restore the product.
         *
         * The database is now the source of truth.
         */
        console.log(
          `[catalog] Product ${id} deleted successfully`
        );

        /*
         * Re-fetch products so UI exactly matches Supabase.
         */
        const rows = await fetchProducts(supabase);

        setProducts(rows);
        productsRef.current = rows;
      } catch (err) {
        console.error(
          "[catalog] Failed to delete product from Supabase:",
          err
        );

        /*
         * DELETE FAILED.
         *
         * Restore previous list because the database
         * still contains the product.
         */
        setProducts(previousProducts);
      }
    })();
  }, []);

  /*
   * ADD UNIVERSE
   */
  const addUniverse = useCallback(
    (universe: UniverseInfo) => {
      const previousUniverses = universesRef.current;

      setUniverses((prev) => [...prev, universe]);

      (async () => {
        try {
          const supabase = createClient();

          const savedUniverse = await insertUniverse(
            supabase,
            universe
          );

          setUniverses((prev) =>
            prev.map((u) =>
              u.id === universe.id
                ? savedUniverse
                : u
            )
          );
        } catch (err) {
          console.error(
            "[catalog] Failed to save universe to Supabase:",
            err
          );

          setUniverses(previousUniverses);
        }
      })();
    },
    []
  );

  /*
   * DELETE UNIVERSE
   */
  const removeUniverse = useCallback((id: string) => {
    const previousUniverses = universesRef.current;

    setUniverses((prev) =>
      prev.filter((universe) => universe.id !== id)
    );

    (async () => {
      try {
        const supabase = createClient();

        await deleteUniverse(supabase, id);

        const rows = await fetchUniverses(supabase);

        setUniverses(rows);
        universesRef.current = rows;
      } catch (err) {
        console.error(
          "[catalog] Failed to delete universe from Supabase:",
          err
        );

        setUniverses(previousUniverses);
      }
    })();
  }, []);

  /*
   * ADD CATEGORY
   *
   * Categories remain localStorage-based in this phase.
   */
  const addCategory = useCallback((category: string) => {
    setCategories((prev) => {
      const next = [...prev, category];

      saveToStorage(
        CATEGORIES_KEY,
        next
      );

      return next;
    });
  }, []);

  /*
   * DELETE CATEGORY
   */
  const removeCategory = useCallback((category: string) => {
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
  }, []);

  /*
   * IMPORT PRODUCTS
   */
  const importProducts = useCallback(
    (incoming: Product[]) => {
      const previousProducts = productsRef.current;

      setProducts((prev) => {
        const byId = new Map(
          prev.map((product) => [
            product.id,
            product,
          ])
        );

        for (const product of incoming) {
          byId.set(product.id, {
            ...byId.get(product.id),
            ...product,
          });
        }

        return Array.from(byId.values());
      });

      (async () => {
        try {
          const supabase = createClient();

          await upsertProducts(
            supabase,
            incoming
          );

          /*
           * Re-fetch after import so database remains
           * the source of truth.
           */
          const rows = await fetchProducts(
            supabase
          );

          setProducts(rows);
          productsRef.current = rows;
        } catch (err) {
          console.error(
            "[catalog] Failed to import products to Supabase:",
            err
          );

          setProducts(previousProducts);
        }
      })();
    },
    []
  );

  /*
   * RESET
   *
   * This does NOT recreate seed data in Supabase.
   * It simply reloads the current database contents.
   */
  const resetToSeed = useCallback(() => {
    clearStorage(CATEGORIES_KEY);

    setCategories(seedCategories);

    (async () => {
      try {
        const supabase = createClient();

        const productRows =
          await fetchProducts(supabase);

        setProducts(productRows);
        productsRef.current = productRows;

        const universeRows =
          await fetchUniverses(supabase);

        setUniverses(universeRows);
        universesRef.current = universeRows;
      } catch (err) {
        console.error(
          "[catalog] Failed to reload catalog from Supabase:",
          err
        );
      }
    })();
  }, []);

  /*
   * GET UNIVERSE
   */
  const getUniverse = useCallback(
    (id: string) =>
      resolveUniverse(universes, id),
    [universes]
  );

  /*
   * GET PRODUCT BY SLUG
   */
  const getProductBySlug = useCallback(
    (slug: string) =>
      products.find(
        (product) => product.slug === slug
      ),
    [products]
  );

  /*
   * NEW ARRIVALS
   */
  const getNewArrivals = useCallback(
    (limit = 8) =>
      [...products]
        .sort(
          (a, b) =>
            +new Date(b.createdAt) -
            +new Date(a.createdAt)
        )
        .slice(0, limit),
    [products]
  );

  /*
   * BEST SELLERS
   */
  const getBestSellers = useCallback(
    (limit = 8) =>
      products
        .filter((product) =>
          product.tags.includes("bestseller")
        )
        .slice(0, limit),
    [products]
  );

  /*
   * FEATURED
   */
  const getFeatured = useCallback(
    (limit = 8) =>
      [...products]
        .sort(
          (a, b) => b.rating - a.rating
        )
        .slice(0, limit),
    [products]
  );

  /*
   * CONTEXT VALUE
   */
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

  return (
    <CatalogContext.Provider value={value}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);

  if (!ctx) {
    throw new Error(
      "useCatalog must be used within CatalogProvider"
    );
  }

  return ctx;
}