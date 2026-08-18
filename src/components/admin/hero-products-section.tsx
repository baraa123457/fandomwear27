"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Dropdown } from "@/components/shared/dropdown";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/context/catalog-context";
import {
  useHomepageSettings,
  type HeroProductIds,
} from "@/context/homepage-settings-context";
import { useToast } from "@/context/toast-context";
import { formatPrice, getErrorMessage } from "@/lib/utils";

const NONE = "";

const SLOT_LABELS = ["Hero Product 1", "Hero Product 2", "Hero Product 3"] as const;

/**
 * Lets the admin pick exactly which 3 products show as the floating
 * shirts in the homepage Hero (src/components/home/hero.tsx). Entirely
 * separate from Best Sellers — this writes to homepage_settings
 * (migration 20260816000017), not product_sales_counts, and the Hero
 * never falls back to a sales-ranked list.
 */
export function HeroProductsSection() {
  const { products } = useCatalog();
  const { heroProductIds, isLoading, setHeroProducts } = useHomepageSettings();
  const { toast } = useToast();

  const [draft, setDraft] = useState<HeroProductIds>(heroProductIds);
  const [saving, setSaving] = useState(false);

  // Keep the draft in sync whenever the saved settings (re)load — e.g.
  // on first load, or if another admin session has since changed it.
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
      toast({
        variant: "error",
        title: "Couldn't save Hero products",
        description: getErrorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
        Homepage Hero Products
      </h2>
      <p className="mt-1 text-xs text-ink-faint">
        Choose the 3 products shown as the floating shirts on the homepage Hero. This is
        independent of Best Sellers — pick them manually here.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SLOT_LABELS.map((label, i) => {
          const index = i as 0 | 1 | 2;
          const currentId = draft[index];
          const current = currentId ? products.find((p) => p.id === currentId) : undefined;
          return (
            <div key={label}>
              <span className="text-xs font-medium text-ink-dim">{label}</span>
              <Dropdown
                className="mt-1.5"
                fullWidth
                ariaLabel={label}
                value={currentId ?? NONE}
                options={options}
                onChange={(value) => setSlot(index, value)}
              />
              <p className="mt-1.5 truncate text-[11px] text-ink-faint">
                {isLoading
                  ? "Loading…"
                  : current
                    ? `Currently: ${current.name}`
                    : "Currently: not set (fallback product shown)"}
              </p>
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
