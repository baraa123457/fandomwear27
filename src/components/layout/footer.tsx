"use client";

import Link from "next/link";
import { Camera, AtSign, PlaySquare, MessageCircle } from "lucide-react";
import { useCatalog } from "@/context/catalog-context";

const columns = [
  {
    title: "Shop",
    links: [
      { label: "All products", href: "/shop" },
      { label: "New arrivals", href: "/shop?sort=new" },
      { label: "Best sellers", href: "/shop?sort=best" },
    ],
  },
  {
    title: "Orders & Support",
    links: [
      { label: "Track order", href: "/account/orders" },
      { label: "Contact us", href: "/help/contact" },
    ],
  },
  {
    title: "About Us",
    links: [
      { label: "About FandomWear", href: "/about" },
      { label: "Our Story & Quality", href: "/about#story" },
    ],
  },
];

export function Footer() {
  const { universes } = useCatalog();
  return (
    <footer className="border-t border-line bg-void">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          <div className="col-span-2">
            <Link href="/" className="font-display text-lg font-extrabold tracking-tight text-ink">
              FANDOM<span className="text-accent-purple">WEAR</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-ink-faint">
              Premium oversized tees inspired by the worlds you already live in.
              Original graphics, heavyweight cotton, made to last past the hype cycle.
            </p>
            <div className="mt-6 flex items-center gap-2">
              {[Camera, AtSign, PlaySquare, MessageCircle].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-dim transition-colors hover:border-ink hover:text-ink"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-ink-faint transition-colors hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="col-span-2 md:col-span-1">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink">
              Universes
            </h4>
            <ul className="mt-4 flex flex-col space-y-2">
              {universes.slice(0, 5).map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/shop?universe=${u.id}`}
                    className="text-sm text-ink-faint transition-colors hover:text-ink"
                  >
                    {u.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-line pt-8 text-xs text-ink-faint sm:flex-row">
          <p>© {new Date().getFullYear()} FandomWear. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-ink transition-colors">
              About Us
            </Link>
            <Link href="/help/contact" className="hover:text-ink transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
