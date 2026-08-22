"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Menu,
  Search,
  Bell,
  ExternalLink,
  User,
  LogOut,
  AlertTriangle,
  PackageCheck,
} from "lucide-react";
import { useCatalog } from "@/context/catalog-context";
import { useAuth } from "@/context/auth-context";
import { useAdminAuth } from "@/context/admin-auth-context";
import { cn, formatPrice } from "@/lib/utils";

const LOW_STOCK_THRESHOLD = 10;

const ROUTE_TITLES: { match: (path: string) => boolean; title: string }[] = [
  { match: (p) => p === "/admin", title: "Dashboard" },
  { match: (p) => p.startsWith("/admin/products"), title: "Products" },
  { match: (p) => p.startsWith("/admin/inventory"), title: "Inventory" },
  { match: (p) => p.startsWith("/admin/content"), title: "Content Management" },
  { match: (p) => p.startsWith("/admin/orders"), title: "Orders" },
  { match: (p) => p.startsWith("/admin/customers"), title: "Customers" },
  { match: (p) => p.startsWith("/admin/discounts"), title: "Discounts" },
  { match: (p) => p.startsWith("/admin/notifications"), title: "Notifications" },
  { match: (p) => p.startsWith("/admin/search"), title: "Global Search" },
  { match: (p) => p.startsWith("/admin/analytics"), title: "Analytics" },
  { match: (p) => p.startsWith("/admin/settings"), title: "Store Settings" },
];

function pageTitleFor(pathname: string): string {
  return ROUTE_TITLES.find((r) => r.match(pathname))?.title ?? "Admin";
}

export function AdminHeader({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { products } = useCatalog();
  const { user } = useAuth();
  const { logout } = useAdminAuth();

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointer = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, []);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.universe.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
      .slice(0, 6);
  }, [products, query]);

  // Notifications are derived straight from live product stock — no
  // fabricated alert feed. (Recent-order alerts would need the orders
  // table too; kept to low-stock here to avoid an extra fetch on every
  // admin page just for the bell icon.)
  const lowStockAlerts = useMemo(
    () => products.filter((p) => p.stock <= LOW_STOCK_THRESHOLD).sort((a, b) => a.stock - b.stock).slice(0, 8),
    [products]
  );

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-void/90 px-5 backdrop-blur-xl sm:px-8">
      <button
        onClick={onToggleSidebar}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-ink/5 hover:text-ink lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
        {pageTitleFor(pathname)}
      </h2>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <div ref={searchRef} className="relative">
          <div className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 sm:flex">
            <Search className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search products…"
              className="w-40 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none lg:w-56"
              aria-label="Search products"
            />
          </div>
          <button
            onClick={() => setSearchOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-ink/5 hover:text-ink sm:hidden"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {searchOpen && (query.trim() || searchResults.length > 0) && (
            <div className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-line bg-surface/95 p-1.5 shadow-2xl backdrop-blur-xl sm:left-0">
              {searchResults.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-ink-faint">
                  {query.trim() ? "No matching products" : "Type to search products"}
                </p>
              ) : (
                searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery("");
                      router.push("/admin/products");
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink-dim transition-colors hover:bg-ink/5 hover:text-ink"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 text-xs text-ink-faint">{formatPrice(p.price)}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-ink/5 hover:text-ink"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {lowStockAlerts.length > 0 && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent-red" />
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 z-40 w-80 rounded-2xl border border-line bg-surface/95 p-1.5 shadow-2xl backdrop-blur-xl">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Stock alerts
              </p>
              {lowStockAlerts.length === 0 ? (
                <p className="flex items-center gap-2 px-3 py-4 text-sm text-ink-faint">
                  <PackageCheck className="h-4 w-4" /> All stock levels look healthy.
                </p>
              ) : (
                <ul className="max-h-72 overflow-y-auto">
                  {lowStockAlerts.map((p) => (
                    <li key={p.id}>
                      <Link
                        href="/admin/inventory"
                        onClick={() => setNotifOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-ink/5"
                      >
                        <AlertTriangle className={cn("h-4 w-4 shrink-0", p.stock === 0 ? "text-accent-red" : "text-amber-400")} />
                        <span className="min-w-0 flex-1 truncate text-ink-dim">{p.name}</span>
                        <span className="shrink-0 text-xs font-semibold text-ink-faint">
                          {p.stock === 0 ? "Out" : `${p.stock} left`}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <Link
          href="/"
          className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-medium text-ink-dim transition-colors hover:border-ink hover:text-ink md:flex"
        >
          <ExternalLink className="h-3.5 w-3.5" /> View store
        </Link>

        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-purple/15 text-accent-purple transition-colors hover:bg-accent-purple/25"
            aria-label="Admin profile"
          >
            <User className="h-4 w-4" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-12 z-40 w-56 rounded-2xl border border-line bg-surface/95 p-1.5 shadow-2xl backdrop-blur-xl">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium text-ink">{user?.name || "Admin"}</p>
                <p className="truncate text-xs text-ink-faint">{user?.email}</p>
              </div>
              <div className="my-1 h-px bg-line" />
              <button
                onClick={async () => {
                  setProfileOpen(false);
                  await logout();
                  router.push("/admin/login");
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-faint transition-colors hover:bg-ink/5 hover:text-accent-red"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
