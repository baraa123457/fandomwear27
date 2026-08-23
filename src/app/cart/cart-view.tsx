"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Tag, X, CheckCircle2 } from "lucide-react";
import { useState, useMemo } from "react";

import { useCart } from "@/context/cart-context";
import { useCatalog } from "@/context/catalog-context";
import { ProductVisual } from "@/components/shared/product-visual";
import { Button } from "@/components/ui/button";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/context/toast-context";

import { ProductCard } from "@/components/shared/product-card";

const FREE_SHIPPING_THRESHOLD = 75;

export default function CartPage() {
  const {
    lines,
    subtotal,
    discount,
    total,
    coupon,
    removeItem,
    setQuantity,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const [couponInput, setCouponInput] = useState("");
  const { toast } = useToast();
  const { getUniverse, getProductBySlug, products } = useCatalog();


  const trendingSuggestions = useMemo(() => {
    return products.slice(0, 4);
  }, [products]);

  const remaining = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    const { ok, message } = await applyCoupon(couponInput);
    if (ok) {
      toast({ variant: "success", title: "Coupon applied", description: couponInput.toUpperCase() });
      setCouponInput("");
    } else {
      toast({ variant: "error", title: message, description: couponInput.toUpperCase() });
    }
  };

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-surface/30 px-6 py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-cyan/10 text-accent-cyan shadow-xl">
            <ShoppingBag className="h-10 w-10 animate-bounce" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold text-ink">Your cart is empty</h1>
          <p className="mt-2 text-sm text-ink-dim leading-relaxed">
            Looks like you haven&apos;t added any designs to your bag yet. Explore our latest oversized drops!
          </p>
          <Button asChild variant="accent" size="lg" className="mt-7">
            <Link href="/shop">Start Shopping</Link>
          </Button>
        </div>

        {/* You Might Like Suggestions */}
        {trendingSuggestions.length > 0 && (
          <div className="mt-20 border-t border-line pt-12">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-accent-cyan">Curated for you</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-ink">You might like these</h2>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/shop">View all designs</Link>
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4">
              {trendingSuggestions.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <Breadcrumbs items={[{ label: "Cart" }]} />
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink">
        Your cart · {lines.reduce((n, l) => n + l.quantity, 0)} items
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="rounded-2xl border border-line">
            <div className="h-1.5 w-full overflow-hidden rounded-t-2xl bg-surface-2">
              <div
                className="h-full bg-accent-cyan transition-all duration-500"
                style={{ width: `${Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)}%` }}
              />
            </div>
            <p className="border-b border-line px-5 py-3 text-xs text-ink-faint">
              {remaining === 0 ? (
                <span className="text-accent-cyan">You&apos;ve unlocked free shipping</span>
              ) : (
                <>
                  <span className="text-ink-dim">{formatPrice(remaining)}</span> away from free shipping
                </>
              )}
            </p>

            <ul className="divide-y divide-line">
              {lines.map((line) => {
                const universe = getUniverse(line.universe)!;
                const product = getProductBySlug(line.slug);
                const image = line.image ?? product?.image;
                return (
                  <li key={`${line.productId}-${line.size}-${line.color}`} className="flex gap-4 p-5">
                    <ProductVisual
                      image={image}
                      color={universe.color}
                      icon={line.artIcon}
                      label={line.name}
                      className="h-28 w-22 shrink-0"
                    />
                    <div className="flex flex-1 flex-col">

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: universe.color }}>
                            {universe.label}
                          </p>
                          <Link href={`/product/${line.slug}`} className="font-medium text-ink hover:underline underline-offset-4">
                            {line.name}
                          </Link>
                          <p className="mt-0.5 text-xs text-ink-faint">
                            {line.size} · {line.color}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(line.productId, line.size, line.color)}
                          aria-label={`Remove ${line.name} from cart`}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5 hover:text-accent-red"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="flex items-center gap-1 rounded-full border border-line">
                          <button
                            aria-label="Decrease quantity"
                            onClick={() =>
                              setQuantity(line.productId, line.size, line.color, line.quantity - 1)
                            }
                            className="flex h-9 w-9 items-center justify-center text-ink-dim hover:text-ink"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium text-ink">
                            {line.quantity}
                          </span>
                          <button
                            aria-label="Increase quantity"
                            onClick={() =>
                              setQuantity(line.productId, line.size, line.color, line.quantity + 1)
                            }
                            className="flex h-9 w-9 items-center justify-center text-ink-dim hover:text-ink"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="font-mono text-sm font-semibold text-ink">
                          {formatPrice(line.price * line.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <Link href="/shop" className="mt-5 inline-block text-sm text-ink-dim underline underline-offset-4 hover:text-ink">
            ← Continue shopping
          </Link>
        </div>

        <aside className="h-fit rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-lg font-bold text-ink">Order summary</h2>

          {coupon ? (
            <div className="mt-4 flex items-center justify-between rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-4 py-2.5">
              <span className="flex items-center gap-2 text-xs font-medium text-accent-cyan">
                <CheckCircle2 className="h-3.5 w-3.5" /> {coupon.code} applied
              </span>
              <button onClick={removeCoupon} className="text-xs text-ink-faint hover:text-ink">
                Remove
              </button>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-full border border-line bg-void px-4 py-2.5">
              <Tag className="h-3.5 w-3.5 text-ink-faint" />
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyCoupon())}
                placeholder="Discount code"
                className="flex-1 bg-transparent text-xs text-ink placeholder:text-ink-faint focus:outline-none"
              />
              <button onClick={handleApplyCoupon} className="text-xs font-semibold text-accent-cyan hover:text-accent-cyan/80">
                Apply
              </button>
            </div>
          )}
          {!coupon && (
            <p className="mt-1.5 text-[11px] text-ink-faint">
              Try <span className="font-mono text-ink-dim">WELCOME10</span>,{" "}
              <span className="font-mono text-ink-dim">FREESHIP</span>, or{" "}
              <span className="font-mono text-ink-dim">ANIME20</span>
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-ink-dim">
              <span>Subtotal</span>
              <span className="font-mono text-ink">{formatPrice(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-accent-cyan">
                <span>Discount</span>
                <span className="font-mono">−{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink-dim">
              <span>Shipping</span>
              <span className="font-mono text-ink">{remaining === 0 ? "Free" : "Calculated at checkout"}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-ink">
              <span>Total</span>
              <span className="font-mono">{formatPrice(total)}</span>
            </div>
          </div>

          <Button asChild size="lg" variant="accent" className="mt-6 w-full">
            <Link href="/checkout">Checkout · {formatPrice(total)}</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
