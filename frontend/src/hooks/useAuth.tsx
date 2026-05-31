import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { UserProfile } from "@/types/database";
import { supabase } from "@/lib/supabase";

import { signInWithEmail as apiSignIn, registerWithEmail as apiRegister } from "@/lib/auth";
import type { RegisterInput } from "@/lib/auth";
import { getCartItems, clearCart } from "@/lib/cart";

type AuthContextValue = {
  session: null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserProfile>;
  signUp: (input: RegisterInput) => Promise<UserProfile>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /** Fetch the latest profile from the backend /me endpoint */
  const refreshProfile = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setProfile(null);
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const user = await res.json();
        setProfile(user);
        localStorage.setItem("agrimart-user", JSON.stringify(user));
      } else {
        setProfile(null);
        localStorage.removeItem("agrimart-user");
      }
    } catch {
      setProfile(null);
    }
  }, []);

  // On mount: load config safely, then check if there's already an active Supabase session
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        // Use cached user first for instant load, then refresh
        const cached = localStorage.getItem("agrimart-user");
        if (cached) {
          try {
            setProfile(JSON.parse(cached));
          } catch {
            /* ignore */
          }
        }
        await refreshProfile();
      }
      setLoading(false);
    };
    init();

    // Listen for Supabase auth state changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        await refreshProfile();
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
        localStorage.removeItem("agrimart-user");
      } else if (event === "TOKEN_REFRESHED" && session) {
        // Silently update session — no need to re-fetch profile
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshProfile]);

  /** Sign in — updates React state atomically before navigation */
  const signIn = useCallback(async (email: string, password: string): Promise<UserProfile> => {
    const data = await apiSignIn(email, password);
    const user: UserProfile = data.session.user;
    setProfile(user);

    // Also sign in via Supabase client so the session is stored and auto-refreshed
    await supabase.auth.signInWithPassword({ email, password });

    return user;
  }, []);

  /** Register — updates React state atomically before navigation */
  const signUp = useCallback(async (input: RegisterInput): Promise<UserProfile> => {
    const data = await apiRegister(input);
    const user: UserProfile = data.session.user;
    setProfile(user);

    // Sign in via Supabase client to establish persistent session
    try {
      const {
        data: { session },
      } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });

      if (session) {
        // Merge local cart into DB
        const localCart = getCartItems();
        if (localCart.length > 0) {
          await fetch("/api/cart/merge", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ items: localCart }),
          }).catch((e) => console.error("Failed to merge cart", e));
          clearCart();
        }
      }
    } catch (signInErr) {
      console.error("Supabase client sign-in after signup failed:", signInErr);
      // User was created, they may need to log in manually
    }

    return user;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    localStorage.removeItem("agrimart-user");
    window.location.href = "/login";
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session: null, profile, loading, signIn, signUp, refreshProfile, signOut }),
    [profile, loading, signIn, signUp, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be within AuthProvider");
  return value;
}
