"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ApiError, api } from "@/lib/api-client";
import type { AuthUser } from "@/types/auth";

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: "BUYER" | "SELLER";
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** Latest auth failure code (e.g. ACCOUNT_PENDING) for the UI to explain. */
  errorCode: string | null;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function roleHome(role: AuthUser["role"]): string {
  switch (role) {
    case "BUYER":
      return "/buyer";
    case "SELLER":
      return "/seller";
    case "ADMIN":
      return "/admin";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: AuthUser }>("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (input: LoginInput) => {
    setErrorCode(null);
    try {
      const data = await api<{ user: AuthUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setUser(data.user);
      return data.user;
    } catch (error) {
      if (error instanceof ApiError) setErrorCode(error.code);
      throw error;
    }
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    setErrorCode(null);
    try {
      const data = await api<{ user: AuthUser }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setUser(data.user);
      return data.user;
    } catch (error) {
      if (error instanceof ApiError) setErrorCode(error.code);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, errorCode, login, register, logout, refresh }),
    [user, loading, errorCode, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
