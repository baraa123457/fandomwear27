"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { Button } from "@/components/ui/button";
import { AuthShell, AuthField } from "@/components/account/auth-shell";
import { SocialAuthButtons } from "@/components/account/social-auth-buttons";

export default function LoginPage() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) {
      setError(signInError);
      return;
    }
    toast({ variant: "success", title: "Welcome back", description: email });
    router.push("/account/orders");
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your orders, wishlist, and saved addresses."
      footer={
        <>
          New here?{" "}
          <Link href="/account/register" className="font-medium text-ink underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AuthField
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
          <div>
            <AuthField
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <Link
              href="/account/forgot-password"
              className="mt-1.5 inline-block text-xs text-ink-faint hover:text-ink"
            >
              Forgot password?
            </Link>
          </div>
          {error && <p className="text-xs text-accent-red">{error}</p>}
          <Button type="submit" size="lg" variant="accent" className="mt-2 w-full" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <SocialAuthButtons action="Sign in" />
      </div>
    </AuthShell>
  );
}
