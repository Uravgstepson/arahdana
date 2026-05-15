"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getCurrentUser, getUserProfile, type UserProfile } from "@/lib/supabase/cloudStorage";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthContextValue = {
  isConfigured: boolean;
  isLoading: boolean;
  user: User | null;
  profile: UserProfile | null;
  refreshAuth(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const configured = isSupabaseConfigured();

  const refreshAuth = useCallback(async () => {
    if (!configured) {
      setUser(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        return;
      }

      try {
        setProfile(await getUserProfile(currentUser));
      } catch {
        setProfile(null);
      }
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshAuth();
    });

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshAuth();
    });

    return () => subscription.unsubscribe();
  }, [refreshAuth]);

  const value = useMemo(
    () => ({
      isConfigured: configured,
      isLoading,
      user,
      profile,
      refreshAuth,
    }),
    [configured, isLoading, profile, refreshAuth, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  return value;
}
