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
import { CloudDataSync } from "@/components/CloudDataSync";
import {
  getCurrentUser,
  upsertUserProfile,
  type UserProfile,
} from "@/lib/supabase/auth";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getArahDanaStorageUser,
  setArahDanaStorageUser,
} from "@/lib/storage/localStorage";
import {
  hasUserFinancialData,
  loadCloudUserData,
  readLocalUserDataSnapshot,
  syncUserDataSnapshotToCloud,
  writeUserDataSnapshotToLocal,
} from "@/lib/supabase/sync";

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
      setArahDanaStorageUser(null);
      setUser(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const previousStorageUser = getArahDanaStorageUser();
    const preLoginLocalSnapshot = previousStorageUser
      ? null
      : readLocalUserDataSnapshot();
    try {
      const currentUser = await getCurrentUser();
      setArahDanaStorageUser(currentUser?.id ?? null);
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        return;
      }

      try {
        setProfile(await upsertUserProfile(currentUser));
      } catch {
        setProfile(null);
      }

      try {
        const cloudSnapshot = await loadCloudUserData(currentUser);
        if (hasUserFinancialData(cloudSnapshot)) {
          writeUserDataSnapshotToLocal(cloudSnapshot);
          return;
        }

        const scopedLocalSnapshot = readLocalUserDataSnapshot();
        const migrationSnapshot = hasUserFinancialData(scopedLocalSnapshot)
          ? scopedLocalSnapshot
          : preLoginLocalSnapshot && hasUserFinancialData(preLoginLocalSnapshot)
            ? preLoginLocalSnapshot
            : cloudSnapshot;

        writeUserDataSnapshotToLocal(migrationSnapshot);
        await syncUserDataSnapshotToCloud(currentUser, migrationSnapshot);
      } catch {
        // If cloud sync is temporarily unavailable, local user-scoped data remains isolated.
      }
    } catch {
      setArahDanaStorageUser(null);
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

  return (
    <AuthContext.Provider value={value}>
      <CloudDataSync user={user} />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  return value;
}
