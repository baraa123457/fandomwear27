"use client";

import Link from "next/link";
import { Truck, RotateCcw, Clock, PackageCheck, ArrowRight } from "lucide-react";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Button } from "@/components/ui/button";

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-void pb-24">
      <div className="mx-auto max-w-5xl px-5 pt-8 sm:px-8">
        <Breadcrumbs
          items={[
            { label: "Help Center", href: "/help/contact" },
            { label: "Shipping & Returns" },
          ]}
        />

        {/* Hero Header */}
        <div className="mt-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1 text-xs font-semibold text-accent-cyan">
            <Truck className="h-3.5 w-3.5" /> Delivery & Returns Policy
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Fast Shipping & 7-Day Easy Returns
          </h1>
          <p className="mt-3 max-w-2xl text-base text-ink-dim sm:text-lg leading-relaxed">
            We deliver premium streetwear across all governorates in Egypt with reliable couriers, real-time tracking, and a hassle-free exchange guarantee.
          </p>
        </div>

        {/* 3 Main Highlight Cards */}
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-cyan/15 text-accent-cyan">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="mt-5 font-display text-lg font-bold text-ink">3–5 Business Days</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-dim">
              Standard delivery across Cairo, Giza, and Alexandria takes 2–3 days. Other governorates arrive within 3–5 business days.
            </p>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-purple/15 text-accent-purple">
              <Truck className="h-6 w-6" />
            </div>
            <h3 className="mt-5 font-display text-lg font-bold text-ink">Free Shipping Over 1,000 EGP</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-dim">
              Enjoy free doorstep delivery on all orders over 1,000 EGP. Flat delivery rate of 60 EGP applies to smaller orders.
            </p>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-red/15 text-accent-red">
              <RotateCcw className="h-6 w-6" />
            </div>
            <h3 className="mt-5 font-display text-lg font-bold text-ink">7-Day Easy Returns</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-dim">
              Need a different size or changed your mind? Exchange or return unworn items with tags within 7 days of receiving your order.
            </p>
          </div>
        </div>

        {/* Detailed Shipping Info */}
        <div className="mt-12 space-y-8">
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="flex items-center gap-3 font-display text-xl font-bold text-ink">
              <PackageCheck className="h-5 w-5 text-accent-cyan" /> Shipping Rates & Destinations
            </h2>
            <div className="mt-6 overflow-hidden rounded-xl border border-line">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line bg-surface-raised/60 text-ink-dim uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Destination</th>
                    <th className="py-3 px-4">Estimated Time</th>
                    <th className="py-3 px-4">Delivery Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  <tr className="hover:bg-surface-raised/40">
                    <td className="py-3 px-4 font-semibold text-ink">Cairo & Giza</td>
                    <td className="py-3 px-4 text-ink-dim">2 – 3 Business Days</td>
                    <td className="py-3 px-4 font-mono text-accent">50 EGP (Free &gt; 1000 EGP)</td>
                  </tr>
                  <tr className="hover:bg-surface-raised/40">
                    <td className="py-3 px-4 font-semibold text-ink">Alexandria & Delta</td>
                    <td className="py-3 px-4 text-ink-dim">3 – 4 Business Days</td>
                    <td className="py-3 px-4 font-mono text-accent">60 EGP (Free &gt; 1000 EGP)</td>
                  </tr>
                  <tr className="hover:bg-surface-raised/40">
                    <td className="py-3 px-4 font-semibold text-ink">Upper Egypt & Red Sea</td>
                    <td className="py-3 px-4 text-ink-dim">4 – 5 Business Days</td>
                    <td className="py-3 px-4 font-mono text-accent">75 EGP (Free &gt; 1000 EGP)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Return & Exchange Policy */}
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="flex items-center gap-3 font-display text-xl font-bold text-ink">
              <RotateCcw className="h-5 w-5 text-accent-red" /> How Returns & Exchanges Work
            </h2>
            <div className="mt-6 space-y-4 text-xs text-ink-dim leading-relaxed">
              <div className="flex gap-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-line/60 font-mono text-[11px] font-bold text-ink">1</span>
                <div>
                  <strong className="text-ink text-sm block">Condition of Items</strong>
                  Items must be unwashed, unworn, free from perfume or stains, with original tags and packaging intact.
                </div>
              </div>
              <div className="flex gap-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-line/60 font-mono text-[11px] font-bold text-ink">2</span>
                <div>
                  <strong className="text-ink text-sm block">Initiate a Request</strong>
                  Go to <Link href="/help/contact" className="text-accent-cyan underline">Contact Us</Link> or message us directly on WhatsApp with your Order ID and the reason for return/exchange.
                </div>
              </div>
              <div className="flex gap-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-line/60 font-mono text-[11px] font-bold text-ink">3</span>
                <div>
                  <strong className="text-ink text-sm block">Courier Pickup & Refund</strong>
                  Our courier will pick up the item within 2–4 days. Once inspected, refunds are issued via Instapay, Vodafone Cash, or original payment method within 48 hours.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-line bg-surface-raised/40 p-6 sm:flex-row sm:p-8">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">Have a question about your shipment?</h3>
            <p className="mt-1 text-xs text-ink-dim">
              Track your live order status in your account or message our support team.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/account/orders">Track Order</Link>
            </Button>
            <Button asChild variant="accent">
              <Link href="/help/contact">
                Contact Support <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
