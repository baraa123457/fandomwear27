"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchProfile, updateProfileRow } from "@/lib/supabase/queries/profiles";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
}

interface AuthResult {
  error?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, name: string) => Promise<AuthResult>;
  signInWithOAuth: (provider: "google" | "facebook") => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updateProfile: (patch: { name?: string; email?: string }) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Real Supabase Auth, backed by the `profiles` table (see PHASE 4 —
 * AUTHENTICATION). Supports email/password and OAuth (Google & Facebook).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function hydrate(authUser: { id: string; email?: string } | null) {
      if (!authUser) {
        if (!cancelled) setUser(null);
        return;
      }
      try {
        const profile = await fetchProfile(supabase, authUser.id);
        if (cancelled) return;
        setUser({
          id: authUser.id,
          email: profile?.email ?? authUser.email ?? "",
          name: profile?.name ?? "",
          role: (profile?.role as "customer" | "admin") ?? "customer",
        });
      } catch (err) {
        console.error("[auth] Failed to load profile:", err);
        if (!cancelled) {
          setUser({ id: authUser.id, email: authUser.email ?? "", name: "", role: "customer" });
        }
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      hydrate(data.session?.user ?? null).finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrate(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string): Promise<AuthResult> => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      try {
        await updateProfileRow(supabase, data.user.id, { name });
      } catch {
        /* non-fatal */
      }
    }
    return {};
  }, []);

  const signInWithOAuth = useCallback(async (provider: "google" | "facebook"): Promise<AuthResult> => {
    const supabase = createClient();
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/account/orders` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/account/login` : undefined,
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const updateProfile = useCallback(
    async (patch: { name?: string; email?: string }): Promise<AuthResult> => {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return { error: "Not signed in." };

      try {
        if (patch.email && patch.email !== authUser.email) {
          const { error } = await supabase.auth.updateUser({ email: patch.email });
          if (error) return { error: error.message };
        }
        const row = await updateProfileRow(supabase, authUser.id, patch);
        setUser((prev) => (prev ? { ...prev, name: row.name, email: row.email } : prev));
        return {};
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Failed to update profile." };
      }
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signUp,
        signInWithOAuth,
        signOut,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
