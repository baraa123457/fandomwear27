"use client";

import { createContext, useCallback, useContext } from "react";
import { useAuth } from "@/context/auth-context";
import { createClient } from "@/lib/supabase/client";
import { fetchProfile } from "@/lib/supabase/queries/profiles";

interface AdminLoginResult {
  error?: string;
}

interface AdminAuthContextValue {
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AdminLoginResult>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

/**
 * Real Supabase Auth + profiles.role (see PHASE 4 — ADMIN). This is nested
 * inside AuthProvider and reuses the same session — an admin signs in with
 * an ordinary Supabase Auth account that just happens to have
 * profiles.role = 'admin'. There is deliberately no self-serve upgrade path
 * (see migration 008); a role is granted by updating the row directly.
 */
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading, signOut } = useAuth();
  const isAdmin = user?.role === "admin";

  const login = useCallback(async (email: string, password: string): Promise<AdminLoginResult> => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Sign-in failed. Please try again." };

    try {
      const profile = await fetchProfile(supabase, data.user.id);
      if (profile?.role !== "admin") {
        await supabase.auth.signOut();
        return { error: "This account does not have admin access." };
      }
      return {};
    } catch {
      await supabase.auth.signOut();
      return { error: "Failed to verify admin access. Please try again." };
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  return (
    <AdminAuthContext.Provider value={{ isAdmin, isLoading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
