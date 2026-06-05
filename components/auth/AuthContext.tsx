/**
 * File: components/auth/AuthContext.tsx
 *
 * Purpose:
 * - Central auth context for the app (session + userId).
 * - Pages should use this instead of calling supabase.auth.getSession() repeatedly.
 *
 * Why:
 * - Prevents "Ověřuji přihlášení…" stuck states during client-side navigation.
 */

"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { Session } from "@supabase/supabase-js";

type AuthContextValue = {
  session: Session | null;
  userId: string | null;
  isLoggedIn: boolean;
  isPrivilegedViewer: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  userId: null,
  isLoggedIn: false,
  isPrivilegedViewer: false,
});

export function AuthProvider({
  session,
  isPrivilegedViewer = false,
  children,
}: {
  session: Session | null;
  isPrivilegedViewer?: boolean;
  children: React.ReactNode;
}) {
  const value = useMemo<AuthContextValue>(() => {
    const userId = session?.user?.id ?? null;
    return { session, userId, isLoggedIn: !!userId, isPrivilegedViewer };
  }, [isPrivilegedViewer, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
