"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, User, Mail, ShieldAlert } from "lucide-react";

export default function ProfilePage() {
  const { user, updateProfile, deleteAccount } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [submitting, setSubmitting] = useState(false);

  // Delete account dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await updateProfile({ name, email });
    setSubmitting(false);
    if (error) {
      toast({ variant: "error", title: "Couldn't update profile", description: error });
      return;
    }
    toast({ variant: "success", title: "Profile updated" });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    const { error } = await deleteAccount();
    setDeleting(false);
    if (error) {
      toast({ variant: "error", title: "Couldn't delete account", description: error });
      setShowDeleteDialog(false);
      return;
    }
    toast({ variant: "success", title: "Account deleted", description: "We're sorry to see you go." });
    router.push("/");
  };

  return (
    <div className="space-y-10">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Profile</h1>
        <p className="mt-1 text-sm text-ink-faint">Update your name and email address.</p>
      </div>

      {/* ── Profile Form ────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className="max-w-md rounded-2xl border border-line bg-surface p-6"
      >
        <div className="flex flex-col gap-4">
          <label>
            <span className="flex items-center gap-1.5 text-xs font-medium text-ink-dim">
              <User className="h-3.5 w-3.5" />
              Full name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-void px-4 text-sm text-ink focus:border-accent-cyan focus:outline-none"
            />
          </label>
          <label>
            <span className="flex items-center gap-1.5 text-xs font-medium text-ink-dim">
              <Mail className="h-3.5 w-3.5" />
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-void px-4 text-sm text-ink focus:border-accent-cyan focus:outline-none"
            />
          </label>
        </div>
        <Button
          type="submit"
          variant="accent"
          size="md"
          className="mt-6"
          disabled={submitting}
        >
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </form>

      {/* ── Danger Zone ─────────────────────────────────────────── */}
      <div className="max-w-md">
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-500" />
          <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wider">
            Danger Zone
          </h2>
        </div>

        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-ink">Delete my account</p>
              <p className="mt-1 text-sm text-ink-faint">
                Permanently delete your account and all associated data.
                This action <span className="font-semibold text-red-400">cannot be undone</span>.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ───────────────────────────── */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-surface p-6 shadow-2xl">
            {/* Icon */}
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>

            <h3 className="text-center text-lg font-bold text-ink">
              Delete your account?
            </h3>
            <p className="mt-2 text-center text-sm text-ink-faint">
              All your orders, wishlist, and profile data will be permanently removed.
              This <strong className="text-ink">cannot be undone</strong>.
            </p>

            {/* Confirm input */}
            <div className="mt-5">
              <label className="text-xs font-medium text-ink-dim">
                Type{" "}
                <span className="font-mono font-bold text-red-400">DELETE</span>{" "}
                to confirm
              </label>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="mt-1.5 h-11 w-full rounded-xl border border-red-500/40 bg-void px-4 text-sm text-ink placeholder:text-ink-faint/50 focus:border-red-500 focus:outline-none"
              />
            </div>

            {/* Buttons */}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirm("");
                }}
                className="flex-1 rounded-xl border border-line bg-surface py-2.5 text-sm font-medium text-ink transition hover:bg-void"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== "DELETE" || deleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
