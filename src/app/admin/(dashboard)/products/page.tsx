"use client";

import { useMemo, useRef, useState, useEffect, FormEvent, ChangeEvent } from "react";
import { Download, Film, Pencil, Plus, RotateCcw, Save, Search, Trash2, Upload, X } from "lucide-react";
import { Product, Size, UniverseInfo } from "@/lib/types";
import { useCatalog } from "@/context/catalog-context";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/status-badge";
import { ManageOptionsList } from "@/components/admin/manage-options-list";
import { ProductVisual } from "@/components/shared/product-visual";
import { Dropdown } from "@/components/shared/dropdown";
import { useToast } from "@/context/toast-context";
import { formatPrice, cn, getErrorMessage } from "@/lib/utils";
import { downloadCSV, parseCSV, productsToCSV, rowsToProducts } from "@/lib/csv";
import { createClient } from "@/lib/supabase/client";
import {
  uploadProductImage,
  uploadProductVideo,
  deleteProductMediaMany,
} from "@/lib/supabase/storage/product-media";

const FALLBACK_PALETTE = ["#7C5CFF", "#22D3EE", "#FF3B4E", "#22C55E", "#F59E0B", "#EC4899", "#38BDF8", "#A855F7"];

// Common clothing colors offered as one-click shortcuts in the "Product
// colors" section below. Purely a convenience — the admin can still add
// any custom color via the native color picker (see handleAddCustomColor).
const PREDEFINED_COLORS: Product["colors"] = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Gray", hex: "#808080" },
  { name: "Red", hex: "#EF4444" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Green", hex: "#22C55E" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Orange", hex: "#F97316" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Brown", hex: "#92400E" },
  { name: "Beige", hex: "#D4B483" },
  { name: "Navy", hex: "#1E3A8A" },
];

const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

// Expands shorthand (#abc) to full 6-digit form and uppercases for
// consistent storage/dedupe — matches the format already used throughout
// the seed data and storefront (e.g. "#7C5CFF").
function normalizeHex(hex: string): string {
  const trimmed = hex.trim();
  if (trimmed.length === 4) {
    return (
      "#" +
      trimmed
        .slice(1)
        .split("")
        .map((c) => c + c)
        .join("")
    ).toUpperCase();
  }
  return trimmed.toUpperCase();
}

function slugify(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uniqueSlug(name: string, existing: Product[]): string {
  const root = slugify(name) || `product-${Date.now()}`;
  const taken = new Set(existing.map((p) => p.slug));
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}

const ALL_SIZES: Size[] = ["S", "M", "L", "XL", "XXL"];

const IMAGE_SLOT_LABELS = ["Image 1 — Main/front", "Image 2", "Image 3"] as const;

// Each image slot is either empty, holding whatever the product already
// had saved in Storage ("existing"), or holding a newly-picked file that
// hasn't been uploaded yet ("new" — previewed locally via an object URL,
// uploaded only on submit). This is what lets replace/remove correctly
// leave the old Storage object alone until the database write actually
// succeeds (see handleSubmit).
type MediaSlot =
  | { kind: "empty" }
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; previewUrl: string };

type ImageSlots = [MediaSlot, MediaSlot, MediaSlot];

type Draft = Pick<Product, "name" | "category" | "universe" | "price" | "stock" | "artIcon" | "sizes" | "colors"> & {
  images: ImageSlots;
  video: MediaSlot;
};

// `universe` is intentionally left blank here — there's no universe that's
// safe to hard-code (Supabase is the source of truth and its universe list
// can change at any time). openNew() fills in a real default from the
// currently-loaded universeOptions before opening the dialog; if none are
// loaded, it shows an error instead of opening with a blank/fake universe.
const emptyDraft: Draft = {
  name: "",
  category: "Oversized Tee",
  universe: "",
  price: 34.99,
  stock: 50,
  artIcon: "Gamepad2",
  images: [{ kind: "empty" }, { kind: "empty" }, { kind: "empty" }],
  video: { kind: "empty" },
  sizes: [...ALL_SIZES],
  colors: [],
};

function slotPreviewSrc(slot: MediaSlot): string | undefined {
  if (slot.kind === "existing") return slot.url;
  if (slot.kind === "new") return slot.previewUrl;
  return undefined;
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB — client-side cap before upload
const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20MB — matches the Storage bucket's file_size_limit


export default function AdminProductsPage() {
  const { toast } = useToast();
  const {
    products: list,
    universes: universeOptions,
    categories: categoryOptions,
    addProduct,
    updateProduct,
    deleteProduct,
    addUniverse,
    removeUniverse,
    addCategory,
    removeCategory,
    importProducts,
    resetToSeed,
    getUniverse,
  } = useCatalog();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [customColorHex, setCustomColorHex] = useState("#7C5CFF");
  const imageInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ] as const;
  const videoInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const addUniverseOption = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const id = slugify(trimmed) || `universe-${Date.now()}`;
    if (universeOptions.some((u) => u.id === id)) {
      toast({ variant: "error", title: "That universe already exists" });
      return;
    }
    const color = FALLBACK_PALETTE[universeOptions.length % FALLBACK_PALETTE.length];
    const newUniverse: UniverseInfo = {
      id,
      label: trimmed,
      tagline: "",
      color,
      icon: "Sparkles",
      productCount: 0,
    };
    addUniverse(newUniverse);
    toast({ variant: "success", title: "Universe added", description: trimmed });
  };

  const removeUniverseOption = (id: string) => {
    if (universeOptions.length <= 1) {
      toast({ variant: "error", title: "You need at least one universe" });
      return;
    }
    removeUniverse(id);
    const next = universeOptions.filter((u) => u.id !== id);
    if (draft.universe === id) setDraft((d) => ({ ...d, universe: next[0].id }));
  };

  const addCategoryOption = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (categoryOptions.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast({ variant: "error", title: "That category already exists" });
      return;
    }
    addCategory(trimmed);
    toast({ variant: "success", title: "Category added", description: trimmed });
  };

  const removeCategoryOption = (label: string) => {
    if (categoryOptions.length <= 1) {
      toast({ variant: "error", title: "You need at least one category" });
      return;
    }
    removeCategory(label);
    const next = categoryOptions.filter((c) => c !== label);
    if (draft.category === label) setDraft((d) => ({ ...d, category: next[0] }));
  };

  const resolveUniverseColor = (id: string) => getUniverse(id).color;

  const filtered = useMemo(
    () => list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [list, search]
  );

  const openNew = () => {
    // Default universe comes from whatever's currently loaded from
    // Supabase (universeOptions), never a hard-coded id — that list can
    // legitimately be empty (still loading, or every universe deleted).
    if (universeOptions.length === 0) {
      toast({
        variant: "error",
        title: "No universes available",
        description: "Add a universe before creating a product.",
      });
      return;
    }
    setEditingId(null);
    setDraft({ ...emptyDraft, universe: universeOptions[0].id });
    setCustomColorHex("#7C5CFF");
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    // Prefer the new `images` array; fall back to the legacy single
    // `image` field for products saved before this phase so their photo
    // still shows up as Image 1 when editing.
    const existingImages = p.images && p.images.length > 0 ? p.images : p.image ? [p.image] : [];
    const slots: ImageSlots = [0, 1, 2].map((i): MediaSlot =>
      existingImages[i] ? { kind: "existing", url: existingImages[i] } : { kind: "empty" }
    ) as ImageSlots;
    setDraft({
      name: p.name,
      category: p.category,
      universe: p.universe,
      price: p.price,
      stock: p.stock,
      artIcon: p.artIcon,
      images: slots,
      video: p.video ? { kind: "existing", url: p.video } : { kind: "empty" },
      sizes: p.sizes,
      colors: p.colors ?? [],
    });
    setCustomColorHex("#7C5CFF");
    setDialogOpen(true);
  };

  const toggleSize = (size: Size) => {
    setDraft((d) => {
      const has = d.sizes.includes(size);
      if (has && d.sizes.length <= 1) {
        toast({ variant: "error", title: "At least one size is required" });
        return d;
      }
      return { ...d, sizes: has ? d.sizes.filter((s) => s !== size) : [...d.sizes, size] };
    });
  };

  // Adds a color (predefined or custom) to the draft, guarding against
  // duplicates by hex value (case-insensitive — hex is always stored
  // normalized/uppercased, but this stays defensive either way).
  const addColor = (hex: string, name: string) => {
    setDraft((d) => {
      if (d.colors.some((c) => c.hex.toUpperCase() === hex.toUpperCase())) {
        toast({ variant: "error", title: "That color is already added" });
        return d;
      }
      return { ...d, colors: [...d.colors, { name, hex }] };
    });
  };

  const removeColor = (hex: string) => {
    setDraft((d) => ({
      ...d,
      colors: d.colors.filter((c) => c.hex.toUpperCase() !== hex.toUpperCase()),
    }));
  };

  const handleAddCustomColor = () => {
    if (!HEX_COLOR_PATTERN.test(customColorHex.trim())) {
      toast({
        variant: "error",
        title: "Enter a valid hex color",
        description: "e.g. #7C5CFF",
      });
      return;
    }
    const hex = normalizeHex(customColorHex);
    // Custom colors picked via the color input don't have a friendly name
    // like the predefined palette does — the hex value itself doubles as
    // the name so it still fits Product["colors"]' { name, hex } shape.
    addColor(hex, hex);
    setCustomColorHex(hex);
  };

  const handleImageChange = (index: 0 | 1 | 2) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ variant: "error", title: "That's not an image file" });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ variant: "error", title: "Image too large", description: "Max 4MB." });
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setDraft((d) => {
      const prevSlot = d.images[index];
      if (prevSlot.kind === "new") URL.revokeObjectURL(prevSlot.previewUrl);
      const images = [...d.images] as ImageSlots;
      images[index] = { kind: "new", file, previewUrl };
      return { ...d, images };
    });
  };

  const removeImage = (index: 0 | 1 | 2) => {
    setDraft((d) => {
      const prevSlot = d.images[index];
      if (prevSlot.kind === "new") URL.revokeObjectURL(prevSlot.previewUrl);
      const images = [...d.images] as ImageSlots;
      images[index] = { kind: "empty" };
      return { ...d, images };
    });
  };

  const handleVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast({ variant: "error", title: "That's not a video file" });
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast({ variant: "error", title: "Video too large", description: "Max 20MB." });
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setDraft((d) => {
      if (d.video.kind === "new") URL.revokeObjectURL(d.video.previewUrl);
      return { ...d, video: { kind: "new", file, previewUrl } };
    });
  };

  const removeVideo = () => {
    setDraft((d) => {
      if (d.video.kind === "new") URL.revokeObjectURL(d.video.previewUrl);
      return { ...d, video: { kind: "empty" } };
    });
  };

  // Object URLs created for local previews are only ever needed while this
  // dialog is open — release them once it closes so we don't leak memory
  // across repeated add/edit sessions. Existing (already-uploaded) media
  // uses real Storage URLs, never object URLs, so this only ever touches
  // locally-picked-but-not-yet-saved files.
  useEffect(() => {
    if (dialogOpen) return;
    draft.images.forEach((slot) => {
      if (slot.kind === "new") URL.revokeObjectURL(slot.previewUrl);
    });
    if (draft.video.kind === "new") URL.revokeObjectURL(draft.video.previewUrl);
    // Only run this cleanup on the open -> closed transition, not on every
    // draft change while the dialog is open (which would revoke previews
    // that are still on screen).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      toast({ variant: "error", title: "Product name is required" });
      return;
    }

    // Source of truth is the currently-loaded universeOptions (Supabase),
    // never an assumption that any particular id (e.g. "gaming") exists.
    // Catches both the empty-list case and an edited product whose
    // universe was deleted out from under it elsewhere (the Dropdown
    // falls back to displaying options[0] in that case without actually
    // changing draft.universe, so this check is what actually stops the
    // stale id from being saved).
    if (!universeOptions.some((u) => u.id === draft.universe)) {
      toast({ variant: "error", title: "Please select a valid universe." });
      return;
    }

    if (draft.colors.length === 0) {
      toast({ variant: "error", title: "Select at least one color" });
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const productId = editingId ?? `p${Date.now()}`;

    // Every file uploaded during this attempt — rolled back (deleted) if
    // the database write below fails, so a failed save never leaves
    // orphaned files behind in Storage.
    const uploadedThisAttempt: string[] = [];

    try {
      // 1. Upload any newly-picked images/video to Storage. Existing
      //    (already-saved) slots are left exactly as-is — nothing gets
      //    deleted yet, even for a slot the admin just replaced or
      //    removed, until the database write below actually succeeds.
      const finalImages: string[] = [];
      for (let i = 0; i < draft.images.length; i++) {
        const slot = draft.images[i];
        if (slot.kind === "new") {
          const url = await uploadProductImage(supabase, productId, i as 0 | 1 | 2, slot.file);
          uploadedThisAttempt.push(url);
          finalImages.push(url);
        } else if (slot.kind === "existing") {
          finalImages.push(slot.url);
        }
      }

      let finalVideo: string | null = null;
      if (draft.video.kind === "new") {
        finalVideo = await uploadProductVideo(supabase, productId, draft.video.file);
        uploadedThisAttempt.push(finalVideo);
      } else if (draft.video.kind === "existing") {
        finalVideo = draft.video.url;
      }

      // 2. Work out which previously-saved media is no longer referenced
      //    after this save (replaced or removed), so it can be cleaned up
      //    — but only once the database write below succeeds.
      const existing = editingId ? list.find((p) => p.id === editingId) : undefined;
      const existingImageUrls = existing
        ? existing.images && existing.images.length > 0
          ? existing.images
          : existing.image
            ? [existing.image]
            : []
        : [];
      const staleUrls: Array<string | null | undefined> = [
        ...existingImageUrls.filter((url) => !finalImages.includes(url)),
        existing?.video && existing.video !== finalVideo ? existing.video : undefined,
      ];

      // 3. Write the product row itself.
      const mediaPatch = {
        name: draft.name,
        category: draft.category,
        universe: draft.universe,
        price: draft.price,
        stock: draft.stock,
        artIcon: draft.artIcon,
        sizes: draft.sizes,
        colors: draft.colors,
        images: finalImages,
        image: finalImages[0],
        video: finalVideo,
      };

      if (editingId) {
        await updateProduct(editingId, mediaPatch);
        toast({ variant: "success", title: "Product updated", description: draft.name });
      } else {
        // Built explicitly from the form + sensible defaults — never
        // copied from an arbitrary existing product (see PROGRESS notes:
        // that used to borrow list[0]'s description/material/colors/tags,
        // which could silently attach a random product's data to a new
        // one). Colors now come from the admin's own selections in the
        // "Product colors" section (validated non-empty above) so
        // components that assume at least one color (e.g. the wishlist
        // "add all to cart") keep working without a hardcoded fallback.
        const newProduct: Product = {
          id: productId,
          slug: uniqueSlug(draft.name, list),
          name: draft.name,
          universe: draft.universe,
          category: draft.category,
          price: draft.price,
          compareAtPrice: undefined,
          description: "",
          material: "",
          sizes: draft.sizes,
          colors: draft.colors,
          rating: 0,
          reviewCount: 0,
          stock: draft.stock,
          tags: [],
          artIcon: draft.artIcon,
          images: finalImages,
          image: finalImages[0],
          video: finalVideo ?? undefined,
          createdAt: new Date().toISOString(),
        };
        await addProduct(newProduct);
        toast({ variant: "success", title: "Product added", description: draft.name });
      }

      // 4. Only now that the database write has actually succeeded, clean
      //    up any media that got replaced or removed. Best-effort — this
      //    never affects the product, which is already saved either way.
      if (staleUrls.length > 0) {
        void deleteProductMediaMany(supabase, staleUrls);
      }

      setDialogOpen(false);
    } catch (err) {
      console.error("[admin products] Failed to save product:", getErrorMessage(err), err);

      // The database write didn't happen (or we never got that far) —
      // don't leave this attempt's freshly-uploaded files stranded in
      // Storage.
      if (uploadedThisAttempt.length > 0) {
        void deleteProductMediaMany(supabase, uploadedThisAttempt);
      }

      toast({
        variant: "error",
        title: editingId ? "Couldn't save changes" : "Couldn't add product",
        description: getErrorMessage(err),
      });
      // Deliberately leave the dialog open so the admin doesn't lose their
      // draft and can retry — closing here would make a failed save look
      // like it succeeded.
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (p: Product) => {
    setDeleteTarget(p);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteProduct(deleteTarget.id);
    toast({ variant: "info", title: "Product removed", description: deleteTarget.name });
    setDeleteTarget(null);
  };

  const handleExportCSV = () => {
    if (list.length === 0) {
      toast({ variant: "error", title: "No products to export" });
      return;
    }
    downloadCSV(`fandomwear-products-${new Date().toISOString().slice(0, 10)}.csv`, productsToCSV(list));
    toast({ variant: "success", title: "Exported", description: `${list.length} products` });
  };

  const handleImportClick = () => csvInputRef.current?.click();

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (list.length === 0) {
      toast({ variant: "error", title: "Add at least one product first", description: "Import needs an existing product as a template for missing fields." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const rows = parseCSV(text);
      const { products: imported, errors } = rowsToProducts(rows, list[0]);
      if (imported.length > 0) {
        importProducts(imported);
        toast({ variant: "success", title: "Imported", description: `${imported.length} products` });
      }
      if (errors.length > 0) {
        toast({ variant: "error", title: "Some rows were skipped", description: errors.slice(0, 3).join(" ") });
      }
    };
    reader.onerror = () => toast({ variant: "error", title: "Couldn't read that file" });
    reader.readAsText(file);
  };

  const confirmReset = () => {
    resetToSeed();
    setResetConfirmOpen(false);
    toast({ variant: "info", title: "Catalog reset", description: "Products, universes, and categories restored to defaults." });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Products</h1>
          <p className="mt-1 text-sm text-ink-faint">{list.length} products in catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="h-10 w-56 rounded-full border border-line bg-surface pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImportFile}
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={handleImportClick}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setResetConfirmOpen(true)}>
            <RotateCcw className="h-4 w-4" /> Reset to defaults
          </Button>
          <Dialog open={optionsDialogOpen} onOpenChange={setOptionsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4" /> Save universes & categories
              </Button>
            </DialogTrigger>
            <DialogContent title="Universes & categories">
              <p className="text-xs text-ink-faint">
                Changes here save immediately — no need to add a product.
              </p>
              <div className="mt-3.5 grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-xs font-medium text-ink-dim">Universes</span>
                  <ManageOptionsList
                    items={universeOptions.map((u) => ({ value: u.id, label: u.label, color: u.color }))}
                    onAdd={addUniverseOption}
                    onRemove={removeUniverseOption}
                    addPlaceholder="Add universe..."
                  />
                </div>
                <div>
                  <span className="text-xs font-medium text-ink-dim">Categories</span>
                  <ManageOptionsList
                    items={categoryOptions.map((c) => ({ value: c, label: c }))}
                    onAdd={addCategoryOption}
                    onRemove={removeCategoryOption}
                    addPlaceholder="Add category..."
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="accent"
                size="md"
                className="mt-4"
                onClick={() => setOptionsDialogOpen(false)}
              >
                Done
              </Button>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="accent" size="sm" onClick={openNew}>
                <Plus className="h-4 w-4" /> Add product
              </Button>
            </DialogTrigger>
            <DialogContent title={editingId ? "Edit product" : "Add product"}>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                <label>
                  <span className="text-xs font-medium text-ink-dim">Name</span>
                  <input
                    required
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    className="mt-1.5 h-11 w-full rounded-xl border border-line bg-void px-4 text-sm text-ink focus:border-accent-cyan focus:outline-none"
                  />
                </label>

                <div>
                  <span className="text-xs font-medium text-ink-dim">Product images</span>
                  <p className="mt-1 text-[11px] text-ink-faint">
                    Up to 3 photos. Image 1 is the main/front photo shown across the storefront.
                  </p>
                  <div className="mt-1.5 grid grid-cols-3 gap-3">
                    {([0, 1, 2] as const).map((index) => {
                      const slot = draft.images[index];
                      const slotSrc = slotPreviewSrc(slot);
                      return (
                        <div key={index} className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-medium text-ink-faint">
                            {IMAGE_SLOT_LABELS[index]}
                          </span>
                          <ProductVisual
                            image={slotSrc}
                            color={resolveUniverseColor(draft.universe)}
                            icon={draft.artIcon}
                            className="aspect-square w-full"
                          />
                          <input
                            ref={imageInputRefs[index]}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange(index)}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => imageInputRefs[index].current?.click()}
                          >
                            <Upload className="h-3.5 w-3.5" /> {slot.kind !== "empty" ? "Replace" : "Upload"}
                          </Button>
                          {slot.kind !== "empty" && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeImage(index)}>
                              <X className="h-3.5 w-3.5" /> Remove
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[11px] text-ink-faint">
                    JPG or PNG, up to 4MB each. Slots left empty use a placeholder until a photo is uploaded.
                  </p>
                </div>

                <div>
                  <span className="text-xs font-medium text-ink-dim">Product video</span>
                  <p className="mt-1 text-[11px] text-ink-faint">Optional. One video max.</p>
                  <div className="mt-1.5 flex items-start gap-3">
                    {draft.video.kind !== "empty" ? (
                      <video
                        src={slotPreviewSrc(draft.video)}
                        controls
                        className="h-20 w-32 shrink-0 rounded-xl border border-line bg-void object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-xl border border-dashed border-line text-ink-faint">
                        <Film className="h-6 w-6" />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col gap-1.5">
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleVideoChange}
                        className="hidden"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => videoInputRef.current?.click()}
                        >
                          <Upload className="h-3.5 w-3.5" /> {draft.video.kind !== "empty" ? "Replace video" : "Upload video"}
                        </Button>
                        {draft.video.kind !== "empty" && (
                          <Button type="button" variant="ghost" size="sm" onClick={removeVideo}>
                            <X className="h-3.5 w-3.5" /> Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-faint">
                        MP4 or MOV, up to 20MB. {draft.video.kind !== "empty" ? "" : "No video yet — this is optional."}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <label>
                    <span className="text-xs font-medium text-ink-dim">Universe</span>
                    <Dropdown
                      className="mt-1.5"
                      fullWidth
                      ariaLabel="Universe"
                      value={draft.universe}
                      options={universeOptions.map((u) => ({ value: u.id, label: u.label }))}
                      onChange={(universe) => setDraft((d) => ({ ...d, universe }))}
                    />
                    <ManageOptionsList
                      items={universeOptions.map((u) => ({ value: u.id, label: u.label, color: u.color }))}
                      onAdd={addUniverseOption}
                      onRemove={removeUniverseOption}
                      addPlaceholder="Add universe..."
                    />
                  </label>
                  <label>
                    <span className="text-xs font-medium text-ink-dim">Category</span>
                    <Dropdown
                      className="mt-1.5"
                      fullWidth
                      ariaLabel="Category"
                      value={draft.category}
                      options={categoryOptions.map((c) => ({ value: c, label: c }))}
                      onChange={(category) => setDraft((d) => ({ ...d, category }))}
                    />
                    <ManageOptionsList
                      items={categoryOptions.map((c) => ({ value: c, label: c }))}
                      onAdd={addCategoryOption}
                      onRemove={removeCategoryOption}
                      addPlaceholder="Add category..."
                    />
                  </label>
                </div>
                <div>
                  <span className="text-xs font-medium text-ink-dim">Sizes available to customers</span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {ALL_SIZES.map((s) => {
                      const active = draft.sizes.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSize(s)}
                          aria-pressed={active}
                          className={cn(
                            "h-10 w-14 rounded-xl border text-sm font-semibold transition-colors",
                            active
                              ? "border-accent-purple bg-accent-purple/15 text-accent-purple"
                              : "border-line text-ink-faint hover:border-ink-faint hover:text-ink"
                          )}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[11px] text-ink-faint">
                    Only the sizes selected here will be choosable on the product page.
                  </p>
                </div>

                <div>
                  <span className="text-xs font-medium text-ink-dim">Product colors</span>
                  <p className="mt-1 text-[11px] text-ink-faint">
                    Choose from common colors or add any custom color with the picker below.
                  </p>

                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {PREDEFINED_COLORS.map((color) => {
                      const active = draft.colors.some(
                        (c) => c.hex.toUpperCase() === color.hex.toUpperCase()
                      );
                      return (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => addColor(color.hex, color.name)}
                          aria-pressed={active}
                          title={color.name}
                          className={cn(
                            "flex h-9 items-center gap-2 rounded-full border pl-2 pr-3 text-xs font-medium transition-colors",
                            active
                              ? "border-accent-purple bg-accent-purple/15 text-accent-purple"
                              : "border-line text-ink-faint hover:border-ink-faint hover:text-ink"
                          )}
                        >
                          <span
                            className="h-4 w-4 rounded-full border border-line/60"
                            style={{ backgroundColor: color.hex }}
                          />
                          {color.name}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium text-ink-faint">Custom color:</span>
                    <input
                      type="color"
                      value={HEX_COLOR_PATTERN.test(customColorHex.trim()) ? normalizeHex(customColorHex) : "#000000"}
                      onChange={(e) => setCustomColorHex(e.target.value.toUpperCase())}
                      aria-label="Custom color picker"
                      className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-void p-1"
                    />
                    <input
                      type="text"
                      value={customColorHex}
                      onChange={(e) => setCustomColorHex(e.target.value)}
                      placeholder="#7C5CFF"
                      maxLength={7}
                      className="h-10 w-28 rounded-xl border border-line bg-void px-3 text-sm font-mono uppercase text-ink focus:border-accent-cyan focus:outline-none"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddCustomColor}>
                      <Plus className="h-3.5 w-3.5" /> Add color
                    </Button>
                  </div>

                  {draft.colors.length > 0 && (
                    <div className="mt-3">
                      <span className="text-[11px] font-medium text-ink-faint">Selected colors:</span>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {draft.colors.map((color) => (
                          <span
                            key={color.hex}
                            className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1.5 pr-2.5 font-mono text-xs text-ink-dim"
                          >
                            <span
                              className="h-5 w-5 rounded-full border border-line/60"
                              style={{ backgroundColor: color.hex }}
                            />
                            {color.hex}
                            <button
                              type="button"
                              onClick={() => removeColor(color.hex)}
                              aria-label={`Remove color ${color.hex}`}
                              className="text-ink-faint hover:text-accent-red"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="mt-1.5 text-[11px] text-ink-faint">
                    At least one color is required. Duplicate colors are ignored.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <label>
                    <span className="text-xs font-medium text-ink-dim">Price (EGP)</span>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min={0}
                      value={draft.price}
                      onChange={(e) => setDraft((d) => ({ ...d, price: Number(e.target.value) }))}
                      className="mt-1.5 h-11 w-full rounded-xl border border-line bg-void px-4 text-sm text-ink focus:border-accent-cyan focus:outline-none"
                    />
                  </label>
                  <label>
                    <span className="text-xs font-medium text-ink-dim">Stock</span>
                    <input
                      required
                      type="number"
                      min={0}
                      value={draft.stock}
                      onChange={(e) => setDraft((d) => ({ ...d, stock: Number(e.target.value) }))}
                      className="mt-1.5 h-11 w-full rounded-xl border border-line bg-void px-4 text-sm text-ink focus:border-accent-cyan focus:outline-none"
                    />
                  </label>
                </div>
                <Button type="submit" variant="accent" size="md" className="mt-2" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Save changes" : "Add product"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-xs uppercase tracking-wider text-ink-faint">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Universe</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const universe = getUniverse(p.universe);
              const status = p.stock === 0 ? "out" : p.stock <= 30 ? "low" : "healthy";
              return (
                <tr key={p.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductVisual image={p.image} color={universe.color} icon={p.artIcon} className="h-10 w-10 shrink-0" />
                      <div>
                        <p className="font-medium text-ink">{p.name}</p>
                        <p className="text-xs text-ink-faint">{p.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-ink-dim">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: universe.color }} />
                      {universe.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-ink">{formatPrice(p.price)}</td>
                  <td className={cn("px-4 py-3 font-mono", p.stock <= 30 && "text-amber-400")}>{p.stock}</td>
                  <td className="px-4 py-3"><StatusBadge status={status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        aria-label={`Edit ${p.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5 hover:text-ink"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => requestDelete(p)}
                        aria-label={`Delete ${p.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5 hover:text-accent-red"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent title="Delete product">
          <p className="text-sm text-ink-dim">
            Delete <span className="font-medium text-ink">{deleteTarget?.name}</span>? This can&apos;t be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-accent-red text-accent-red hover:bg-accent-red/10"
              onClick={confirmDelete}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent title="Reset to default catalog">
          <p className="text-sm text-ink-dim">
            This replaces all products, universes, and categories with the original seed data. Anything
            you&apos;ve added or changed will be lost. This can&apos;t be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setResetConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-accent-red text-accent-red hover:bg-accent-red/10"
              onClick={confirmReset}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
