"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Package, Truck, ArrowRight, ShoppingBag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";


function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || searchParams.get("id") || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

  // Estimated delivery date: 3-4 business days from now
  const estDate = new Date();
  estDate.setDate(estDate.getDate() + 4);
  const formattedDate = estDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-20 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 shadow-2xl shadow-emerald-500/20">
        <CheckCircle2 className="h-10 w-10 animate-bounce" />
      </div>

      <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/20 px-3.5 py-1 text-xs font-semibold text-emerald-400">
        <Sparkles className="h-3.5 w-3.5" /> Order Placed Successfully
      </span>

      <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
        Thank You for Your Order!
      </h1>
      <p className="mt-3 text-base text-ink-dim sm:text-lg">
        We&apos;ve received your order and our workshop is preparing your oversized pieces.
      </p>

      {/* Order Info Card */}
      <div className="mt-10 rounded-3xl border border-line bg-surface p-6 sm:p-8 text-left shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-ink-faint">Order Reference</span>
            <p className="mt-1 font-mono text-xl font-bold text-accent-cyan">{orderId}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-raised/60 px-4 py-2 text-xs">
            <span className="text-ink-faint">Payment Method:</span>{" "}
            <strong className="text-ink">Cash on Delivery (COD) / Card</strong>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-purple/15 text-accent-purple">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-ink">Estimated Delivery</p>
              <p className="mt-0.5 font-mono text-sm text-accent">{formattedDate}</p>
              <p className="mt-1 text-[11px] text-ink-faint">Delivered by courier across Egypt (2–4 business days)</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-cyan/15 text-accent-cyan">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-ink">Tracking & Updates</p>
              <p className="mt-0.5 text-xs text-ink-dim">SMS and WhatsApp confirmation updates will be sent as your package moves.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Button asChild size="lg" variant="accent" className="gap-2">
          <Link href="/account/orders">
            <Package className="h-4 w-4" /> Track My Orders
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="gap-2">
          <Link href="/shop">
            <ShoppingBag className="h-4 w-4" /> Continue Shopping <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-ink-faint">Loading order summary...</div>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
