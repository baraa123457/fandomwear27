"use client";

import { useEffect, useState } from "react";
import { Save, Store, Truck, CreditCard, Info } from "lucide-react";
import { useStoreSettings } from "@/context/store-settings-context";
import { useToast } from "@/context/toast-context";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/stat-card";
import { getErrorMessage, cn } from "@/lib/utils";
import type { StoreSettings } from "@/context/store-settings-context";

/* ------------------------------------------------------------------ */
/* Input helpers                                                        */
/* ------------------------------------------------------------------ */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-dim">{label}</label>
      {children}
      {hint && <p className="mt-0.5 text-[10px] text-ink-faint">{hint}</p>}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  readOnly = false,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      type={type}
      readOnly={readOnly}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      className={cn(
        "mt-1 w-full rounded-lg border border-line px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent",
        readOnly
          ? "cursor-not-allowed bg-surface-raised/50 text-ink-faint"
          : "bg-surface-raised"
      )}
    />
  );
}

function NumberInput({
  value,
  onChange,
  min = 0,
  step = 0.01,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      min={min}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="mt-1 w-full rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
    />
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={cn(
            "h-5 w-9 rounded-full transition-colors",
            checked ? "bg-accent" : "bg-line"
          )}
        />
        <div
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </div>
      <span className="text-xs text-ink">{label}</span>
    </label>
  );
}

/* ================================================================== */
/* Main page                                                           */
/* ================================================================== */

export default function AdminSettingsPage() {
  const { settings, isLoading, updateSettings } = useStoreSettings();
  const { toast } = useToast();

  const [draft, setDraft] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);

  // Keep draft in sync with loaded settings.
  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const patch = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(draft);
      toast({ variant: "success", title: "Store settings saved" });
    } catch (err) {
      toast({ variant: "error", title: "Failed to save settings", description: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 w-full animate-pulse rounded-2xl bg-surface-raised" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Store Settings</h1>
          <p className="mt-1 text-sm text-ink-faint">
            Configure your store details, shipping, taxes, and payment methods.
          </p>
        </div>
        <Button
          variant="accent"
          size="sm"
          disabled={!dirty || saving}
          onClick={handleSave}
        >
          <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {dirty && !saving && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-400">
          You have unsaved changes.
        </div>
      )}

      {/* Store Info */}
      <section className="rounded-2xl border border-line bg-surface p-6">
        <div className="mb-4 flex items-center gap-2">
          <Store className="h-4 w-4 text-accent" />
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
            Store Information
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Store Name">
            <TextInput
              value={draft.storeName}
              onChange={(v) => patch("storeName", v)}
              placeholder="FandomWear"
            />
          </Field>
          <Field label="Store Email">
            <TextInput
              type="email"
              value={draft.storeEmail}
              onChange={(v) => patch("storeEmail", v)}
              placeholder="hello@fandomwear.com"
            />
          </Field>
          <Field label="Contact Phone" hint="Shown on receipts and contact pages">
            <TextInput
              value={draft.contactPhone}
              onChange={(v) => patch("contactPhone", v)}
              placeholder="+20 100 000 0000"
            />
          </Field>
          <Field label="Contact Address" hint="Store or warehouse address">
            <TextInput
              value={draft.contactAddress}
              onChange={(v) => patch("contactAddress", v)}
              placeholder="Cairo, Egypt"
            />
          </Field>
        </div>
      </section>

      {/* Commerce Settings */}
      <section className="rounded-2xl border border-line bg-surface p-6">
        <div className="mb-4 flex items-center gap-2">
          <Truck className="h-4 w-4 text-accent" />
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
            Commerce
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Currency"
            hint="Application currency — EGP is enforced in all price displays. This field is display-only."
          >
            <TextInput value={draft.currency} readOnly />
          </Field>
          <Field label="Shipping Flat Rate (EGP)" hint="Applied when order total is below free threshold">
            <NumberInput
              value={draft.shippingFlatRate}
              onChange={(v) => patch("shippingFlatRate", v)}
            />
          </Field>
          <Field label="Free Shipping Threshold (EGP)" hint="Orders above this amount get free shipping">
            <NumberInput
              value={draft.shippingFreeThreshold}
              onChange={(v) => patch("shippingFreeThreshold", v)}
            />
          </Field>
          <Field label="Tax Rate" hint="Set to 0 to disable tax (e.g. 0 = 0%, 0.14 = 14%)">
            <NumberInput
              value={draft.taxRate}
              onChange={(v) => patch("taxRate", v)}
              step={0.01}
            />
          </Field>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-surface-raised px-4 py-3">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" />
            <p className="text-[11px] text-ink-dim">
              Shipping flat rate, free shipping threshold, and tax rate configured here are applied live across the store and at checkout.
            </p>
          </div>
        </div>
      </section>


      {/* Payment Methods */}
      <section className="rounded-2xl border border-line bg-surface p-6">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-accent" />
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
            Payment Methods
          </h2>
        </div>
        <div className="space-y-3">
          <Toggle
            checked={draft.paymentCodEnabled}
            onChange={(v) => patch("paymentCodEnabled", v)}
            label="Cash on Delivery (COD)"
          />
          <Toggle
            checked={draft.paymentCardEnabled}
            onChange={(v) => patch("paymentCardEnabled", v)}
            label="Card / Online Payment"
          />
        </div>
      </section>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Currency"
          value={settings.currency}
          icon={Store}
        />
        <StatCard
          label="Shipping Rate"
          value={`EGP ${settings.shippingFlatRate.toFixed(2)}`}
          icon={Truck}
        />
        <StatCard
          label="Free Shipping Above"
          value={`EGP ${settings.shippingFreeThreshold.toFixed(2)}`}
          icon={Truck}
        />
        <StatCard
          label="Tax Rate"
          value={`${(settings.taxRate * 100).toFixed(1)}%`}
          icon={CreditCard}
        />
      </div>
    </div>
  );
}
