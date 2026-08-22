"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Image as ImageIcon,
  Star,
  Clock,
  Trophy,
  Layers,
  Save,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Zap,
} from "lucide-react";

import { useCatalog } from "@/context/catalog-context";
import {
  useHomepageSettings,
  type HeroProductIds,
} from "@/context/homepage-settings-context";
import { useToast } from "@/context/toast-context";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/shared/dropdown";
import { ProductVisual } from "@/components/shared/product-visual";
import { ManageOptionsList } from "@/components/admin/manage-options-list";
import { formatPrice, cn, getErrorMessage } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { updateUniverse } from "@/lib/supabase/queries/universes";
import type { UniverseInfo } from "@/lib/types";
import { iconMap } from "@/lib/icon-map";

/* ------------------------------------------------------------------ */
/* Tab types                                                           */
/* ------------------------------------------------------------------ */

type Tab = "hero" | "featured" | "arrivals" | "bestsellers" | "collections";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "hero", label: "Hero", icon: ImageIcon },
  { id: "featured", label: "Featured", icon: Star },
  { id: "arrivals", label: "New Arrivals", icon: Clock },
  { id: "bestsellers", label: "Best Sellers", icon: Trophy },
  { id: "collections", label: "Collections", icon: Layers },
];

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<Tab>("hero");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Content Management</h1>
        <p className="mt-1 text-sm text-ink-faint">
          Control every dynamic homepage section from one place.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface-raised p-1 scrollbar-none">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-all",
                activeTab === t.id
                  ? "bg-accent text-void shadow"
                  : "text-ink-dim hover:text-ink"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "hero" && <HeroTab />}
        {activeTab === "featured" && <FeaturedTab />}
        {activeTab === "arrivals" && <NewArrivalsTab />}
        {activeTab === "bestsellers" && <BestSellersTab />}
        {activeTab === "collections" && <CollectionsTab />}
      </div>
    </div>
  );
}

/* ================================================================== */
/* HERO TAB                                                            */
/* ================================================================== */

const NONE = "";
const SLOT_LABELS = ["Hero Product 1", "Hero Product 2", "Hero Product 3"] as const;

function HeroTab() {
  const { products, getUniverse } = useCatalog();
  const { heroProductIds, isLoading, setHeroProducts } = useHomepageSettings();
  const { toast } = useToast();

  const [draft, setDraft] = useState<HeroProductIds>(heroProductIds);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(heroProductIds);
  }, [heroProductIds]);

  const dirty = SLOT_LABELS.some((_, i) => draft[i] !== heroProductIds[i]);

  const options = [
    { value: NONE, label: "— Use fallback —" },
    ...products.map((p) => ({ value: p.id, label: `${p.name} (${formatPrice(p.price)})` })),
  ];

  const setSlot = (index: 0 | 1 | 2, productId: string) => {
    setDraft((prev) => {
      const next = [...prev] as HeroProductIds;
      next[index] = productId === NONE ? null : productId;
      return next;
    });
  };

  const handleSave = async () => {
    const chosen = draft.filter((id): id is string => Boolean(id));
    if (new Set(chosen).size !== chosen.length) {
      toast({
        variant: "error",
        title: "Pick 3 different products",
        description: "The same product is selected in more than one slot.",
      });
      return;
    }
    setSaving(true);
    try {
      await setHeroProducts(draft);
      toast({ variant: "success", title: "Homepage Hero updated" });
    } catch (err) {
      toast({ variant: "error", title: "Couldn't save Hero products", description: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
        Homepage Hero Products
      </h2>
      <p className="mt-1 text-xs text-ink-faint">
        The 3 products shown as floating shirts on the homepage. Uses real product photos when
        available. Independent of Best Sellers — always pick manually.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {SLOT_LABELS.map((label, i) => {
          const index = i as 0 | 1 | 2;
          const currentId = draft[index];
          const p = currentId ? products.find((x) => x.id === currentId) : undefined;
          const universe = p ? getUniverse(p.universe) : null;
          return (
            <div key={label} className="space-y-2">
              <span className="text-xs font-medium text-ink-dim">{label}</span>
              <Dropdown
                fullWidth
                ariaLabel={label}
                value={currentId ?? NONE}
                options={options}
                onChange={(value) => setSlot(index, value)}
              />
              {/* Product image preview */}
              {p && universe ? (
                <div className="relative aspect-square overflow-hidden rounded-xl border border-line">
                  <ProductVisual
                    image={p.image}
                    color={universe.color}
                    icon={p.artIcon}
                    label={p.name}
                    className="h-full w-full"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-void/70 px-2 py-1">
                    <p className="truncate text-[10px] font-medium text-white">{p.name}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-ink-faint">
                  {isLoading ? "Loading…" : "No product selected (fallback shown)"}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button type="button" variant="accent" size="sm" disabled={!dirty || saving} onClick={handleSave}>
          <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save selection"}
        </Button>
        {dirty && !saving && (
          <span className="text-[11px] text-ink-faint">You have unsaved changes.</span>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* FEATURED TAB                                                        */
/* ================================================================== */

function FeaturedTab() {
  const { products, updateProduct, getUniverse } = useCatalog();
  const { toast } = useToast();
  const [savingId, setSavingId] = useState<string | null>(null);

  const activeProducts = useMemo(() => products.filter((p) => p.status === "active"), [products]);
  const featuredCount = useMemo(() => activeProducts.filter((p) => p.featured).length, [activeProducts]);

  const toggle = async (id: string, current: boolean) => {
    setSavingId(id);
    try {
      await updateProduct(id, { featured: !current });
      toast({
        variant: "success",
        title: !current ? "Marked as featured" : "Removed from featured",
      });
    } catch (err) {
      toast({ variant: "error", title: "Failed to update", description: getErrorMessage(err) });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
            Featured Products
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            Featured products appear in the Featured section on the homepage. Toggle to add/remove.
          </p>
        </div>
        <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          {featuredCount} featured
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {activeProducts.map((p) => {
          const universe = getUniverse(p.universe);
          return (
            <div
              key={p.id}
              className={cn(
                "relative rounded-xl border p-3 transition-all",
                p.featured
                  ? "border-accent/50 bg-accent/5"
                  : "border-line bg-surface-raised"
              )}
            >
              <div className="relative aspect-square overflow-hidden rounded-lg">
                <ProductVisual
                  image={p.image}
                  color={universe.color}
                  icon={p.artIcon}
                  label={p.name}
                  className="h-full w-full"
                />
              </div>
              <p className="mt-2 truncate text-xs font-medium text-ink">{p.name}</p>
              <p className="truncate text-[10px] text-ink-faint">{formatPrice(p.price)}</p>
              <button
                onClick={() => toggle(p.id, p.featured ?? false)}
                disabled={savingId === p.id}
                className={cn(
                  "mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all",
                  p.featured
                    ? "bg-accent/10 text-accent hover:bg-accent/20"
                    : "bg-surface-raised text-ink-dim hover:bg-line/30 hover:text-ink"
                )}
              >
                {savingId === p.id ? (
                  "Saving…"
                ) : p.featured ? (
                  <><Check className="h-3 w-3" /> Featured</>
                ) : (
                  <><Plus className="h-3 w-3" /> Add to featured</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/* NEW ARRIVALS TAB                                                    */
/* ================================================================== */

function NewArrivalsTab() {
  const { getNewArrivals } = useCatalog();
  const newest = useMemo(() => getNewArrivals(8), [getNewArrivals]);

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
        New Arrivals
      </h2>
      <p className="mt-1 text-xs text-ink-faint">
        Automatically calculated from{" "}
        <code className="rounded bg-line/30 px-1 text-[10px]">products.created_at</code>. No
        manual configuration — newest products appear first.
      </p>

      <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
        <p className="text-xs text-emerald-400">
          ✓ Fully automatic — add a product in Admin → Products and it immediately appears here
          (sorted by creation date).
        </p>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-line">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-line bg-surface-raised">
              <th className="px-4 py-2.5 text-left font-medium text-ink-dim">#</th>
              <th className="px-4 py-2.5 text-left font-medium text-ink-dim">Product</th>
              <th className="px-4 py-2.5 text-left font-medium text-ink-dim">Category</th>
              <th className="px-4 py-2.5 text-right font-medium text-ink-dim">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {newest.map((p, idx) => (
              <tr key={p.id} className="hover:bg-surface-raised/50">
                <td className="px-4 py-2.5 text-ink-faint">{idx + 1}</td>
                <td className="px-4 py-2.5 font-medium text-ink">{p.name}</td>
                <td className="px-4 py-2.5 text-ink-dim">{p.category}</td>
                <td className="px-4 py-2.5 text-right text-ink-faint">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================== */
/* BEST SELLERS TAB                                                    */
/* ================================================================== */

function BestSellersTab() {
  const { products, salesCounts, getUniverse } = useCatalog();
  const { bestsellerMode, bestsellerProductIds, setBestsellerSettings } = useHomepageSettings();
  const { toast } = useToast();

  const [mode, setMode] = useState<"auto" | "custom">(bestsellerMode);
  const [selectedIds, setSelectedIds] = useState<string[]>(bestsellerProductIds);
  const [addProductId, setAddProductId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMode(bestsellerMode);
    setSelectedIds(bestsellerProductIds);
  }, [bestsellerMode, bestsellerProductIds]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const handleAddProduct = () => {
    if (!addProductId) return;
    if (selectedIds.includes(addProductId)) {
      toast({ variant: "error", title: "Product already added to Best Sellers" });
      return;
    }
    if (selectedIds.length >= 12) {
      toast({ variant: "error", title: "Maximum 12 products allowed in Best Sellers" });
      return;
    }
    setSelectedIds([...selectedIds, addProductId]);
    setAddProductId("");
  };

  const handleRemove = (id: string) => {
    setSelectedIds(selectedIds.filter((item) => item !== id));
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const next = [...selectedIds];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    setSelectedIds(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setBestsellerSettings(mode, selectedIds);
      toast({
        variant: "success",
        title: "Best Sellers updated",
        description:
          mode === "auto"
            ? "Rankings are now automatically computed from orders and sales."
            : `Saved ${selectedIds.length} custom curated Best Seller products.`,
      });
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't save Best Sellers",
        description: getErrorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  };

  // Products available to add
  const availableToAdd = products.filter((p) => !selectedIds.includes(p.id));

  // Auto ranked list for reference (only products with at least 1 sale)
  const autoRanked = useMemo(() => {
    return products
      .filter((p) => (salesCounts[p.id] ?? 0) > 0)
      .sort((a, b) => (salesCounts[b.id] ?? 0) - (salesCounts[a.id] ?? 0));
  }, [products, salesCounts]);


  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
              Best Sellers Configuration
            </h2>
            <p className="mt-1 text-xs text-ink-faint">
              Choose whether the homepage Best Sellers grid is ranked automatically by sales or curated manually.
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            variant="accent"
            className="gap-2 shrink-0"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Mode Selector */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("auto")}
            className={cn(
              "flex flex-col items-start rounded-xl border p-4 text-left transition-all",
              mode === "auto"
                ? "border-accent bg-accent/10 shadow-sm"
                : "border-line bg-surface-raised/40 hover:border-line-dim"
            )}
          >
            <div className="flex items-center gap-2">
              <Zap className={cn("h-4 w-4", mode === "auto" ? "text-accent" : "text-ink-faint")} />
              <span className="font-display text-sm font-bold text-ink">⚡ Automatic (Live Sales)</span>
            </div>
            <p className="mt-1.5 text-xs text-ink-dim">
              Automatically ranks products with real sales from orders first, with intelligent fallback to top-rated designs.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode("custom")}
            className={cn(
              "flex flex-col items-start rounded-xl border p-4 text-left transition-all",
              mode === "custom"
                ? "border-accent bg-accent/10 shadow-sm"
                : "border-line bg-surface-raised/40 hover:border-line-dim"
            )}
          >
            <div className="flex items-center gap-2">
              <Trophy className={cn("h-4 w-4", mode === "custom" ? "text-accent" : "text-ink-faint")} />
              <span className="font-display text-sm font-bold text-ink">🎯 Custom Selection</span>
            </div>
            <p className="mt-1.5 text-xs text-ink-dim">
              Handpick, reorder, and feature exact products you want to display as Best Sellers on the homepage.
            </p>
          </button>
        </div>

        {/* Custom Curation Editor */}
        {mode === "custom" ? (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={addProductId}
                onChange={(e) => setAddProductId(e.target.value)}
                className="h-10 flex-1 rounded-xl border border-line bg-void px-3 text-xs text-ink focus:border-accent-cyan focus:outline-none"
              >
                <option value="">Select a product to add to Best Sellers...</option>
                {availableToAdd.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatPrice(p.price)}) · {p.category}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                onClick={handleAddProduct}
                disabled={!addProductId}
                size="sm"
                variant="outline"
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add Product
              </Button>
            </div>

            {selectedIds.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line py-8 text-center text-xs text-ink-faint">
                No custom products selected yet. Select a product above to add it to the Best Sellers list.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-line">
                <ul className="divide-y divide-line">
                  {selectedIds.map((id, index) => {
                    const product = productMap.get(id);
                    if (!product) return null;
                    const universe = getUniverse(product.universe);
                    const productImage = product.images?.[0] ?? product.image;

                    return (
                      <li
                        key={id}
                        className="flex items-center justify-between gap-3 bg-surface p-3 transition-colors hover:bg-surface-raised/40"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 text-center font-mono text-xs font-semibold text-ink-faint">
                            #{index + 1}
                          </span>
                          <ProductVisual
                            image={productImage}
                            color={universe.color}
                            icon={product.artIcon}
                            label={product.name}
                            className="h-11 w-11 shrink-0 rounded-lg"
                          />
                          <div>
                            <p className="text-xs font-semibold text-ink">{product.name}</p>
                            <p className="text-[11px] text-ink-faint">
                              {universe.label} · {formatPrice(product.price)} · Sales: {salesCounts[product.id] ?? 0}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMove(index, "up")}
                            disabled={index === 0}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-faint hover:text-ink disabled:opacity-30"
                            title="Move Up"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(index, "down")}
                            disabled={index === selectedIds.length - 1}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-faint hover:text-ink disabled:opacity-30"
                            title="Move Down"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-accent-red hover:bg-accent-red/10"
                            title="Remove from Best Sellers"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* Live Automatic Ranking Preview */
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-ink-dim">
              <span className="font-semibold uppercase tracking-wider text-ink-faint">
                Live Sales & Popularity Ranking Preview (Top 8 shown on homepage)
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line bg-surface-raised">
                    <th className="px-4 py-2.5 text-left font-medium text-ink-dim">#</th>
                    <th className="px-4 py-2.5 text-left font-medium text-ink-dim">Product</th>
                    <th className="px-4 py-2.5 text-left font-medium text-ink-dim">Category</th>
                    <th className="px-4 py-2.5 text-left font-medium text-ink-dim">Rating</th>
                    <th className="px-4 py-2.5 text-right font-medium text-ink-dim">Units Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {autoRanked.slice(0, 8).map((p, idx) => (
                    <tr key={p.id} className="hover:bg-surface-raised/50">
                      <td className="px-4 py-2.5 text-ink-faint font-mono">#{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-ink">{p.name}</td>
                      <td className="px-4 py-2.5 text-ink-dim">{p.category}</td>
                      <td className="px-4 py-2.5 text-ink-dim">★ {p.rating.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-accent">
                        {salesCounts[p.id] ?? 0}
                      </td>
                    </tr>
                  ))}
                  {autoRanked.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-ink-faint">
                        No products have sales yet. Once orders are placed, best selling products will be ranked here automatically.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ================================================================== */
/* COLLECTIONS TAB (Universes + Categories)                           */
/* ================================================================== */

interface UniverseFormState {
  label: string;
  tagline: string;
  color: string;
  icon: string;
}

function CollectionsTab() {
  const { universes, addUniverse, removeUniverse, categories, addCategory, removeCategory } =
    useCatalog();
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UniverseFormState>({ label: "", tagline: "", color: "#7C5CFF", icon: "Sparkles" });
  const [saving, setSaving] = useState(false);

  const [newForm, setNewForm] = useState<UniverseFormState>({ label: "", tagline: "", color: "#7C5CFF", icon: "Sparkles" });
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const startEdit = (u: UniverseInfo) => {
    setEditingId(u.id);
    setEditForm({ label: u.label, tagline: u.tagline, color: u.color, icon: u.icon });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (u: UniverseInfo) => {
    if (!editForm.label.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await updateUniverse(supabase, u.id, {
        label: editForm.label.trim(),
        tagline: editForm.tagline.trim(),
        color: editForm.color,
        icon: editForm.icon,
      });
      // Reflect via re-fetch — catalog-context will pick it up on next
      // mount, or we can do a lightweight optimistic update if needed.
      toast({ variant: "success", title: `Universe "${editForm.label}" updated` });
      setEditingId(null);
    } catch (err) {
      toast({ variant: "error", title: "Failed to update", description: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: UniverseInfo) => {
    if (!confirm(`Delete universe "${u.label}"? This cannot be undone.`)) return;
    try {
      await removeUniverse(u.id);
      toast({ variant: "success", title: `Universe "${u.label}" deleted` });
    } catch (err) {
      toast({ variant: "error", title: "Failed to delete", description: getErrorMessage(err) });
    }
  };

  const handleAdd = async () => {
    if (!newForm.label.trim()) return;
    setAdding(true);
    const id = newForm.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    try {
      await addUniverse({
        id,
        label: newForm.label.trim(),
        tagline: newForm.tagline.trim(),
        color: newForm.color,
        icon: newForm.icon,
        productCount: 0,
      });
      toast({ variant: "success", title: `Universe "${newForm.label}" created` });
      setNewForm({ label: "", tagline: "", color: "#7C5CFF", icon: "Sparkles" });
      setShowAddForm(false);
    } catch (err) {
      toast({ variant: "error", title: "Failed to create universe", description: getErrorMessage(err) });
    } finally {
      setAdding(false);
    }
  };

  const iconOptions = Object.keys(iconMap).map((k) => ({ value: k, label: k }));

  return (
    <div className="space-y-6">
      {/* Universes */}
      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
              Universes (Collections)
            </h2>
            <p className="mt-1 text-xs text-ink-faint">
              Changes here reflect immediately in the homepage Collections section and shop filters.
            </p>
          </div>
          <Button size="sm" variant="accent" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-3.5 w-3.5" /> Add Universe
          </Button>
        </div>

        {showAddForm && (
          <UniverseForm
            form={newForm}
            setForm={setNewForm}
            iconOptions={iconOptions}
            onSave={handleAdd}
            onCancel={() => setShowAddForm(false)}
            saving={adding}
            label="Create Universe"
          />
        )}

        <div className="mt-5 space-y-2">
          {universes.map((u) => (
            <div key={u.id} className="rounded-xl border border-line bg-surface-raised p-3">
              {editingId === u.id ? (
                <UniverseForm
                  form={editForm}
                  setForm={setEditForm}
                  iconOptions={iconOptions}
                  onSave={() => saveEdit(u)}
                  onCancel={cancelEdit}
                  saving={saving}
                  label="Save"
                />
              ) : (
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 shrink-0 rounded-full"
                    style={{ backgroundColor: u.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{u.label}</p>
                    <p className="truncate text-xs text-ink-faint">{u.tagline || "—"}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => startEdit(u)}
                      className="rounded-lg p-1.5 text-ink-dim hover:bg-line/30 hover:text-ink"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      className="rounded-lg p-1.5 text-ink-dim hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
          Categories
        </h2>
        <p className="mt-1 text-xs text-ink-faint">
          Categories stored in Supabase. Used in shop filters and product management.
        </p>
        <div className="mt-4">
          <ManageOptionsList
            items={categories.map((c) => ({ value: c, label: c }))}
            onAdd={addCategory}
            onRemove={removeCategory}
            addPlaceholder="New category name…"
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Universe form sub-component                                         */
/* ------------------------------------------------------------------ */

interface UniverseFormProps {
  form: UniverseFormState;
  setForm: (f: UniverseFormState) => void;
  iconOptions: { value: string; label: string }[];
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  label: string;
}

function UniverseForm({ form, setForm, iconOptions, onSave, onCancel, saving, label }: UniverseFormProps) {
  return (
    <div className="mt-3 rounded-xl border border-line bg-surface p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-ink-dim">Label</label>
          <input
            className="mt-1 w-full rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="e.g. Marvel"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-ink-dim">Tagline</label>
          <input
            className="mt-1 w-full rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            placeholder="Short tagline…"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-ink-dim">Color</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="h-7 w-10 cursor-pointer rounded border border-line"
            />
            <span className="text-[10px] font-mono text-ink-faint">{form.color}</span>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-ink-dim">Icon</label>
          <Dropdown
            className="mt-1"
            fullWidth
            ariaLabel="Icon"
            value={form.icon}
            options={iconOptions}
            onChange={(v) => setForm({ ...form, icon: v })}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="accent" onClick={onSave} disabled={saving || !form.label.trim()}>
          <Check className="h-3.5 w-3.5" /> {saving ? "Saving…" : label}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
      </div>
    </div>
  );
}
