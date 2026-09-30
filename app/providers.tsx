"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, apiFetch, refreshSession, registerAccessTokenListener } from "@/lib/api";
import type { AuthResponse, User } from "@/lib/types";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
});

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  organizationId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    organizationName: string;
    fullName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setSession = (response: AuthResponse) => {
    setUser(response.user);
    setAccessToken(response.access_token);
  };

  useEffect(() => {
    const unregister = registerAccessTokenListener(setAccessToken);
    let cancelled = false;

    void refreshSession()
      .then((response) => {
        if (!cancelled) setSession(response);
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setAccessToken(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      unregister();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      organizationId: user?.memberships[0]?.organization_id ?? null,
      loading,
      signIn: async (email, password) => {
        const response = await apiFetch<AuthResponse>("/auth/login", {
          method: "POST",
          body: { email, password },
          skipRefresh: true,
        });
        setSession(response);
      },
      signUp: async ({ organizationName, fullName, email, password }) => {
        const response = await apiFetch<AuthResponse>("/auth/signup", {
          method: "POST",
          body: {
            organization_name: organizationName,
            full_name: fullName,
            email,
            password,
          },
          skipRefresh: true,
        });
        setSession(response);
      },
      signOut: async () => {
        await apiFetch<void>("/auth/logout", { method: "POST" }, accessToken);
        setUser(null);
        setAccessToken(null);
        queryClient.clear();
      },
    }),
    [accessToken, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside Providers");
  return context;
}
