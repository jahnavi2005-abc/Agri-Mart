import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/database";

type ApiErrorBody = { error?: string };

export interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  district: string | null;
  state: string | null;
  address: string | null;
  language: string;
  is_verified: boolean;
  is_banned: boolean;
  seller_trust_level: number;
  fcm_token: string | null;
  created_at: string;
  updated_at: string;
}

export type RegisterInput = {
  role: Exclude<UserRole, "admin">;
  name: string;
  email: string;
  password: string;
  phone: string;
  district: string;
  state: string;
};

/** Get the current Supabase access token */
export function getAuthToken(): string | null {
  // Supabase stores the session in localStorage under 'agrimart-auth'
  try {
    const raw = localStorage.getItem("agrimart-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token ?? null;
  } catch {
    return null;
  }
}

export function getStoredUser(): UserProfile | null {
  const userStr = localStorage.getItem("agrimart-user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as UserProfile;
  } catch {
    localStorage.removeItem("agrimart-user");
    return null;
  }
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function signInWithEmail(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(err.error || "Login failed");
  }
  const data = await res.json();
  // Store user profile in localStorage for fast access
  localStorage.setItem("agrimart-user", JSON.stringify(data.session.user));
  return data;
}

export async function registerWithEmail(input: RegisterInput) {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(err.error || "Failed to create account");
  }
  const data = await res.json();
  localStorage.setItem("agrimart-user", JSON.stringify(data.session.user));
  return data;
}

export function logout() {
  supabase.auth.signOut();
  localStorage.removeItem("agrimart-user");
  window.location.href = "/login";
}

export async function sendForgotPasswordEmail(email: string): Promise<void> {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("Failed to send reset email");
}

export function dashboardPathForRole(role: UserRole) {
  if (role === "farmer") return "/dashboard/farmer";
  if (role === "admin") return "/admin/dashboard";
  return "/dashboard/buyer";
}

export function friendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : "Sign in failed.";
  if (/invalid credentials/i.test(message)) {
    return "The email or password is incorrect. Please try again.";
  }
  if (/already exists/i.test(message)) {
    return "An account with this email already exists. Sign in instead.";
  }
  return message;
}
