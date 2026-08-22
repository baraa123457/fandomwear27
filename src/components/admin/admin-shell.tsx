"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tag,
  Boxes,
  Layers,
  BarChart3,
  Settings,
  ChevronsLeft,
  Lock,
  Bell,
  Search,
} from "lucide-react";
import { useAdminAuth } from "@/context/admin-auth-context";
import { AdminHeader } from "@/components/admin/admin-header";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  /** No page exists at this route yet — shown, but not clickable. */
  comingSoon?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Home",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/inventory", label: "Inventory", icon: Boxes },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/content", label: "Content Management", icon: Layers },
    ],
  },
  {
    label: "Orders",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
      { href: "/admin/customers", label: "Customers", icon: Users },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/admin/discounts", label: "Discounts", icon: Tag },
    ],
  },
  {
    label: "Admin Tools",
    items: [
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
      { href: "/admin/search", label: "Global Search", icon: Search },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/admin/settings", label: "Store Settings", icon: Settings },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, isLoading } = useAdminAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAdmin) router.replace("/admin/login");
  }, [isLoading, isAdmin, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isLoading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-void">
      <div
        className={cn(
          "mx-auto grid max-w-[1500px] grid-cols-1 transition-[grid-template-columns] duration-200",
          collapsed ? "lg:grid-cols-[76px_1fr]" : "lg:grid-cols-[240px_1fr]"
        )}
      >
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 -translate-x-full border-r border-line bg-void px-4 py-6 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:px-3",
            mobileOpen && "translate-x-0",
            collapsed && "lg:w-[76px]"
          )}
        >
          <div className="mb-6 flex items-center justify-between px-2">
            <Link href="/" className={cn("font-display text-sm font-bold tracking-wider text-ink", collapsed && "lg:hidden")}>
              FANDOMWEAR
            </Link>
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink lg:flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronsLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
            </button>
          </div>

          <nav className="flex flex-col gap-5 overflow-y-auto pb-6" style={{ maxHeight: "calc(100vh - 96px)" }}>
            {navGroups.map((group) => (
              <div key={group.label}>
                <p
                  className={cn(
                    "px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-ink-faint/70",
                    collapsed && "lg:hidden"
                  )}
                >
                  {group.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href) && !item.comingSoon;
                    const Icon = item.icon;

                    if (item.comingSoon) {
                      return (
                        <span
                          key={item.label}
                          title={`${item.label} — coming soon`}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-faint/50",
                            collapsed && "lg:justify-center"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
                          <Lock className={cn("ml-auto h-3 w-3 shrink-0", collapsed && "lg:hidden")} />
                        </span>
                      );
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                          collapsed && "lg:justify-center",
                          active ? "bg-accent-purple/15 text-accent-purple" : "text-ink-dim hover:bg-ink/5 hover:text-ink"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {mobileOpen && (
          <button
            aria-label="Close sidebar"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          />
        )}

        <div className="min-w-0">
          <AdminHeader onToggleSidebar={() => setMobileOpen((o) => !o)} />
          <main className="px-5 py-8 sm:px-8 sm:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
