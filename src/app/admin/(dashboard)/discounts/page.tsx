"use client";

import { useEffect, useState, FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/status-badge";
import { Dropdown } from "@/components/shared/dropdown";
import { useToast } from "@/context/toast-context";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  fetchAdminCoupons,
  insertCoupon,
  setCouponActive,
  deleteCoupon,
  type AdminCoupon,
} from "@/lib/supabase/queries/coupons";

const emptyDraft: { code: string; type: "percentage" | "fixed"; value: number; maxUses: number; expires: string } = {
  code: "",
  type: "percentage",
  value: 10,
  maxUses: 100,
  expires: "",
};

export default function AdminDiscountsPage() {
  const { toast } = useToast();
  const [codes, setCodes] = useState<AdminCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const rows = await fetchAdminCoupons(supabase);
        if (!cancelled) setCodes(rows);
      } catch (err) {
        console.error("[admin] Failed to load discount codes:", err);
        if (!cancelled) toast({ variant: "error", title: "Failed to load discount codes" });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const supabase = createClient();
      const created = await insertCoupon(supabase, {
        code: draft.code.toUpperCase(),
        type: draft.type,
        value: draft.value,
        maxUses: draft.maxUses,
        expires: draft.expires || "2026-12-31",
      });
      setCodes((prev) => [created, ...prev]);
      toast({ variant: "success", title: "Discount code created", description: created.code });
      setDraft(emptyDraft);
      setDialogOpen(false);
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't create discount code",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id: string) => {
    const target = codes.find((c) => c.id === id);
    if (!target) return;
    const nextActive = !target.active;
    setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, active: nextActive } : c)));
    try {
      const supabase = createClient();
      await setCouponActive(supabase, id, nextActive);
    } catch (err) {
      console.error("[admin] Failed to update discount code:", err);
      setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, active: !nextActive } : c)));
      toast({ variant: "error", title: "Couldn't update discount code" });
    }
  };

  const handleDelete = async (id: string) => {
    const removed = codes.find((c) => c.id === id);
    setCodes((prev) => prev.filter((c) => c.id !== id));
    try {
      const supabase = createClient();
      await deleteCoupon(supabase, id);
      toast({ variant: "info", title: "Discount code removed" });
    } catch (err) {
      console.error("[admin] Failed to delete discount code:", err);
      if (removed) setCodes((prev) => [removed, ...prev]);
      toast({ variant: "error", title: "Couldn't remove discount code" });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Discount codes</h1>
          <p className="mt-1 text-sm text-ink-faint">{isLoading ? "Loading…" : `${codes.length} codes`}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="accent" size="sm">
              <Plus className="h-4 w-4" /> New code
            </Button>
          </DialogTrigger>
          <DialogContent title="New discount code">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <label>
                <span className="text-xs font-medium text-ink-dim">Code</span>
                <input
                  required
                  value={draft.code}
                  onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                  placeholder="SUMMER25"
                  className="mt-1.5 h-11 w-full rounded-xl border border-line bg-void px-4 text-sm uppercase text-ink focus:border-accent-cyan focus:outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-3.5">
                <label>
                  <span className="text-xs font-medium text-ink-dim">Type</span>
                  <Dropdown
                    className="mt-1.5"
                    fullWidth
                    ariaLabel="Discount type"
                    value={draft.type}
                    options={[
                      { value: "percentage", label: "Percentage" },
                      { value: "fixed", label: "Fixed amount" },
                    ]}
                    onChange={(type) => setDraft((d) => ({ ...d, type }))}
                  />
                </label>
                <label>
                  <span className="text-xs font-medium text-ink-dim">Value</span>
                  <input
                    required
                    type="number"
                    min={0}
                    value={draft.value}
                    onChange={(e) => setDraft((d) => ({ ...d, value: Number(e.target.value) }))}
                    className="mt-1.5 h-11 w-full rounded-xl border border-line bg-void px-4 text-sm text-ink focus:border-accent-cyan focus:outline-none"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <label>
                  <span className="text-xs font-medium text-ink-dim">Max uses</span>
                  <input
                    required
                    type="number"
                    min={1}
                    value={draft.maxUses}
                    onChange={(e) => setDraft((d) => ({ ...d, maxUses: Number(e.target.value) }))}
                    className="mt-1.5 h-11 w-full rounded-xl border border-line bg-void px-4 text-sm text-ink focus:border-accent-cyan focus:outline-none"
                  />
                </label>
                <label>
                  <span className="text-xs font-medium text-ink-dim">Expires</span>
                  <input
                    type="date"
                    value={draft.expires}
                    onChange={(e) => setDraft((d) => ({ ...d, expires: e.target.value }))}
                    className="mt-1.5 h-11 w-full rounded-xl border border-line bg-void px-4 text-sm text-ink focus:border-accent-cyan focus:outline-none"
                  />
                </label>
              </div>
              <Button type="submit" variant="accent" size="md" className="mt-2" disabled={submitting}>
                {submitting ? "Creating…" : "Create code"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-xs uppercase tracking-wider text-ink-faint">
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Discount</th>
              <th className="px-4 py-3 font-medium">Usage</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3 font-mono font-semibold text-ink">{c.code}</td>
                <td className="px-4 py-3 text-ink-dim">
                  {c.type === "percentage" ? `${c.value}%` : `$${c.value.toFixed(2)}`} off
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          c.maxUses !== null && c.uses / c.maxUses > 0.9 ? "bg-accent-red" : "bg-accent-cyan"
                        )}
                        style={{
                          width: `${c.maxUses !== null ? Math.min((c.uses / c.maxUses) * 100, 100) : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-ink-faint">
                      {c.uses}
                      {c.maxUses !== null ? `/${c.maxUses}` : ""}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-dim">
                  {new Date(c.expires).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(c.id)}>
                    <StatusBadge status={c.active ? "active" : "inactive"} />
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(c.id)}
                    aria-label={`Delete ${c.code}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5 hover:text-accent-red"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
