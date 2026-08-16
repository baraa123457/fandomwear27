"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Profile</h1>
      <p className="mt-1 text-sm text-ink-faint">Update your name and email address.</p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-md rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-col gap-4">
          <label>
            <span className="text-xs font-medium text-ink-dim">Full name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-void px-4 text-sm text-ink focus:border-accent-cyan focus:outline-none"
            />
          </label>
          <label>
            <span className="text-xs font-medium text-ink-dim">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-void px-4 text-sm text-ink focus:border-accent-cyan focus:outline-none"
            />
          </label>
        </div>
        <Button type="submit" variant="accent" size="md" className="mt-6" disabled={submitting}>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
