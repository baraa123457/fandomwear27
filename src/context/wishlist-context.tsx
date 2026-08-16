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
import { useAuth } from "@/context/auth-context";
import { createClient } from "@/lib/supabase/client";
import { fetchWishlistIds, addWishlistItem, removeWishlistItem } from "@/lib/supabase/queries/wishlist";

const STORAGE_KEY = "fandomwear:wishlist";

interface WishlistContextValue {
  ids: Set<string>;
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

/**
 * Signed-out visitors keep the original localStorage-only behavior.
 * Signed-in users get a Supabase-backed wishlist (see PHASE 4 — WISHLIST);
 * on sign-in, any local-only saves are merged into their account and the
 * browser copy is cleared so it can't silently resurface on sign-out.
 */
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const idsRef = useRef(ids);
  useEffect(() => {
    idsRef.current = ids;
  }, [ids]);

  const readLocal = useCallback((): Set<string> => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }, []);

  const writeLocal = useCallback((next: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      /* storage unavailable — wishlist still works in-memory */
    }
  }, []);

  // Signed-out: hydrate from localStorage only.
  useEffect(() => {
    if (user) return;
    setIds(readLocal());
  }, [user, readLocal]);

  // Signed-in: merge any local-only ids into Supabase, then take Supabase
  // as the source of truth and stop touching localStorage.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const local = readLocal();
        const remote = new Set(await fetchWishlistIds(supabase, user.id));
        const toMerge = [...local].filter((id) => !remote.has(id));
        for (const productId of toMerge) {
          try {
            await addWishlistItem(supabase, user.id, productId);
            remote.add(productId);
          } catch (err) {
            console.warn("[wishlist] Failed to merge local item:", productId, err);
          }
        }
        if (!cancelled) {
          setIds(remote);
          if (toMerge.length > 0) {
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {
              /* storage unavailable */
            }
          }
        }
      } catch (err) {
        console.warn("[wishlist] Falling back to local wishlist — Supabase fetch failed:", err);
        if (!cancelled) setIds(readLocal());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, readLocal]);

  const toggle = useCallback(
    (productId: string) => {
      const wasSaved = idsRef.current.has(productId);
      setIds((prev) => {
        const next = new Set(prev);
        if (next.has(productId)) next.delete(productId);
        else next.add(productId);
        if (!user) writeLocal(next);
        return next;
      });

      if (!user) return;
      (async () => {
        try {
          const supabase = createClient();
          if (wasSaved) {
            await removeWishlistItem(supabase, user.id, productId);
          } else {
            await addWishlistItem(supabase, user.id, productId);
          }
        } catch (err) {
          console.error("[wishlist] Failed to sync toggle, rolling back:", err);
          setIds((prev) => {
            const next = new Set(prev);
            if (wasSaved) next.add(productId);
            else next.delete(productId);
            return next;
          });
        }
      })();
    },
    [user, writeLocal]
  );

  const has = useCallback((productId: string) => ids.has(productId), [ids]);
  const count = useMemo(() => ids.size, [ids]);

  return (
    <WishlistContext.Provider value={{ ids, toggle, has, count }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
