"use client";

import { useState } from "react";
import { Heart, Minus, Plus, ShieldCheck, Truck } from "lucide-react";
import { Product, Size } from "@/lib/types";
import { useCart } from "@/context/cart-context";
import { useWishlist } from "@/context/wishlist-context";
import { useToast } from "@/context/toast-context";
import { Button } from "@/components/ui/button";
import { SizeGuideDialog } from "@/components/product/size-guide-dialog";
import { formatPrice, cn } from "@/lib/utils";

export function PurchasePanel({ product }: { product: Product }) {
  const colors = product.colors ?? [];
  const sizes = product.sizes ?? [];

  const [size, setSize] = useState<Size>(
    sizes[Math.floor(sizes.length / 2)] ?? "M"
  );

  const [color, setColor] = useState(
    colors[0]?.name ?? "Black"
  );

  const [qty, setQty] = useState(1);

  const { addItem, open } = useCart();
  const { toggle, has } = useWishlist();
  const { toast } = useToast();

  const isWishlisted = has(product.id);

  const lowStock = product.stock > 0 && product.stock <= 15;
  const outOfStock = product.stock === 0;

  const handleAdd = () => {
    if (outOfStock) return;

    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        size,
        color,
        universe: product.universe,
        artIcon: product.artIcon,
        image: product.image,
      },
      qty
    );


    open();

    toast({
      variant: "success",
      title: "Added to cart",
      description: `${product.name} · ${size} · ${color}`,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-2xl font-bold text-ink">
          {formatPrice(product.price)}
        </span>

        {product.compareAtPrice && (
          <span className="font-mono text-base text-ink-faint line-through">
            {formatPrice(product.compareAtPrice)}
          </span>
        )}

        {product.compareAtPrice && product.compareAtPrice > product.price && (
          <span className="rounded-full bg-accent-red/15 px-2.5 py-1 text-[11px] font-bold text-accent-red">
            SAVE{" "}
            {Math.round(
              (1 - product.price / product.compareAtPrice) * 100
            )}
            %
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed text-ink-dim">
        {product.description}
      </p>

      {/* Color */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
          Color —{" "}
          <span className="font-normal normal-case text-ink-faint">
            {color}
          </span>
        </p>

        {colors.length > 0 ? (
          <div className="mt-2.5 flex gap-2.5">
            {colors.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.name)}
                aria-label={c.name}
                aria-pressed={color === c.name}
                className={cn(
                  "h-9 w-9 rounded-full border-2 transition-transform hover:scale-110",
                  color === c.name
                    ? "border-accent-cyan"
                    : "border-line"
                )}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-faint">
            Default color
          </p>
        )}
      </div>

      {/* Size */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
            Size
          </p>

          <SizeGuideDialog />
        </div>

        {sizes.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={cn(
                  "h-11 w-14 rounded-xl border text-sm font-semibold transition-colors",
                  size === s
                    ? "border-ink bg-ink text-void"
                    : "border-line text-ink-dim hover:border-ink hover:text-ink"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-faint">
            Standard size
          </p>
        )}
      </div>

      {/* Quantity + Add to cart */}
      <div className="flex items-center gap-3">
        <div className="flex h-13 items-center gap-1 rounded-full border border-line px-1">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-11 w-11 items-center justify-center text-ink-dim hover:text-ink"
          >
            <Minus className="h-4 w-4" />
          </button>

          <span className="w-6 text-center text-sm font-semibold text-ink">
            {qty}
          </span>

          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() =>
              setQty((q) => Math.min(product.stock, q + 1))
            }
            className="flex h-11 w-11 items-center justify-center text-ink-dim hover:text-ink"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <Button
          onClick={handleAdd}
          disabled={outOfStock}
          size="lg"
          variant="accent"
          className="flex-1"
        >
          {outOfStock ? "Out of stock" : "Add to cart"}
        </Button>

        <Button
          onClick={() => {
            toggle(product.id);

            toast({
              variant: "success",
              title: isWishlisted
                ? "Removed from wishlist"
                : "Added to wishlist",
              description: product.name,
            });
          }}
          size="icon"
          variant="outline"
          aria-label={
            isWishlisted
              ? "Remove from wishlist"
              : "Add to wishlist"
          }
          aria-pressed={isWishlisted}
          className="h-13 w-13 shrink-0"
        >
          <Heart
            className={cn(
              "h-4.5 w-4.5",
              isWishlisted &&
                "fill-accent-red text-accent-red"
            )}
          />
        </Button>
      </div>

      {/* Stock */}
      <p className="text-xs">
        {outOfStock ? (
          <span className="text-accent-red">
            Currently out of stock
          </span>
        ) : lowStock ? (
          <span className="text-accent-red">
            Only {product.stock} left in stock
          </span>
        ) : (
          <span className="text-accent-cyan">
            In stock, ready to ship
          </span>
        )}
      </p>

      {/* Shipping / Returns */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4 text-xs text-ink-dim">
        <div className="flex items-center gap-2.5">
          <Truck className="h-4 w-4 shrink-0 text-ink-faint" />
          Fast delivery in Egypt (2–4 business days) · Free over 1,000 EGP
        </div>

        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-ink-faint" />
          7-day easy returns & exchanges guaranteed
        </div>
      </div>

      {/* Social Sharing */}
      <div className="flex items-center justify-between border-t border-line/60 pt-4 text-xs">
        <span className="text-ink-faint font-medium">Share this design:</span>
        <div className="flex items-center gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `Check out the ${product.name} on FandomWear: ${typeof window !== "undefined" ? window.location.href : ""}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink-dim hover:border-emerald-500 hover:text-emerald-400 transition-colors"
          >
            WhatsApp
          </a>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                navigator.clipboard.writeText(window.location.href);
                toast({ variant: "success", title: "Link copied to clipboard!" });
              }
            }}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink-dim hover:border-accent-cyan hover:text-accent-cyan transition-colors"
          >
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}