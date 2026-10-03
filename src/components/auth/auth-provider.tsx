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
  /** Unread notification count, resolved on the server for the first paint. */
  unread: number;
  setUnread: (count: number) => void;
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

/**
 * `initialUser` is resolved in the root layout (a server component), so the
 * first paint already knows who is signed in and how many notifications are
 * unread. Pass `undefined` only where the session was not resolved.
 */
export function AuthProvider({
  children,
  initialUser,
  initialUnread = 0,
}: {
  children: ReactNode;
  initialUser?: AuthUser | null;
  initialUnread?: number;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser ?? null);
  const [unread, setUnread] = useState(initialUnread);
  const [loading, setLoading] = useState(initialUser === undefined);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const resolvedOnServer = initialUser !== undefined;

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
    if (!resolvedOnServer) {
      void refresh();
    }
  }, [refresh, resolvedOnServer]);

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
    setUnread(0);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      errorCode,
      unread,
      setUnread,
      login,
      register,
      logout,
      refresh,
    }),
    [user, loading, errorCode, unread, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
