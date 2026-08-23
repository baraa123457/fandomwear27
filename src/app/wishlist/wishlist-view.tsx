"use client";

import Link from "next/link";
import { Heart, ShoppingBag, Sparkles, ArrowRight } from "lucide-react";
import { useWishlist } from "@/context/wishlist-context";
import { useCart } from "@/context/cart-context";
import { useToast } from "@/context/toast-context";
import { useCatalog } from "@/context/catalog-context";
import { ProductCard } from "@/components/shared/product-card";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

export default function WishlistPage() {
  const { ids } = useWishlist();
  const { addItem, open } = useCart();
  const { toast } = useToast();
  const { products } = useCatalog();
  const items = products.filter((p) => ids.has(p.id));

  const addAllToCart = () => {
    items.forEach((p) => {
      addItem(
        {
          productId: p.id,
          slug: p.slug,
          name: p.name,
          price: p.price,
          size: p.sizes[Math.floor(p.sizes.length / 2)],
          color: p.colors[0]?.name ?? "Default",
          universe: p.universe,
          artIcon: p.artIcon,
          image: p.image,
        },
        1
      );
    });

    open();
    toast({ variant: "success", title: `Added ${items.length} items to cart` });
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <Breadcrumbs items={[{ label: "Wishlist" }]} />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Your Saved Wishlist</h1>
          <p className="mt-1.5 text-sm text-ink-faint">
            {items.length} saved {items.length === 1 ? "design" : "designs"} — synced across your browser sessions
          </p>
        </div>
        {items.length > 0 && (
          <Button onClick={addAllToCart} variant="accent" size="md" className="gap-2">
            <ShoppingBag className="h-4 w-4" /> Add all to cart
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-surface/30 px-6 py-28 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-red/10 text-accent-red shadow-xl">
            <Heart className="h-10 w-10 fill-accent-red animate-pulse" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold text-ink">Your wishlist is empty</h2>
          <p className="mt-2 max-w-sm text-sm text-ink-dim leading-relaxed">
            Save your favorite pieces here and come back whenever you&apos;re ready to order or compare.
          </p>
          <Button asChild variant="accent" size="lg" className="mt-7 gap-2">
            <Link href="/shop">
              <Sparkles className="h-4 w-4" /> Browse Collection <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
