import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { firebaseConfigured, getFirebaseAuth, googleProvider } from "@/firebase/config";
import { loadProfile } from "@/firebase/userDoc";
import type { UserProfile } from "@/types/profile";
import { isAdminEmail } from "@/lib/admin";

type AuthState = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  firebaseReady: boolean;
  isAdmin: boolean;
  authNotice: string | null;
  clearAuthNotice: () => void;
  refreshProfile: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

function isMissingRedirectStateError(err: unknown): boolean {
  const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
  const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
  return (
    msg.includes("missing initial state") ||
    code === "auth/argument-error" ||
    code === "auth/no-auth-event"
  );
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const ready = firebaseConfigured();

  const clearAuthNotice = useCallback(() => setAuthNotice(null), []);

  const refreshProfile = useCallback(async () => {
    if (!ready || !user) {
      setProfile(null);
      return;
    }
    const p = await loadProfile(user.uid);
    setProfile(p);
  }, [ready, user]);

  useEffect(() => {
    if (!ready) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    let unsub: (() => void) | undefined;

    getRedirectResult(auth)
      .catch((err: unknown) => {
        if (isMissingRedirectStateError(err)) return;
        console.warn("getRedirectResult:", err);
      })
      .finally(() => {
        unsub = onAuthStateChanged(auth, async (u) => {
          setUser(u);
          if (u) {
            const p = await loadProfile(u.uid);
            setProfile(p);
          } else {
            setProfile(null);
          }
          setLoading(false);
        });
      });

    return () => unsub?.();
  }, [ready]);

  const loginWithGoogle = useCallback(async () => {
    if (!ready) return;
    setAuthNotice(null);
    const auth = getFirebaseAuth();
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: unknown) {
      const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment" ||
        code === "auth/cancelled-popup-request"
      ) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      if (isMissingRedirectStateError(e)) {
        setAuthNotice(
          "Sign-in state was lost (often in private mode or strict privacy settings). Close extra tabs, try again, or use Safari/Chrome outside “preview” in-app browsers.",
        );
        return;
      }
      throw e;
    }
  }, [ready]);

  const logout = useCallback(async () => {
    if (!ready) return;
    await signOut(getFirebaseAuth());
    setProfile(null);
  }, [ready]);

  const isAdmin = useMemo(() => isAdminEmail(user?.email ?? undefined), [user?.email]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      firebaseReady: ready,
      isAdmin,
      authNotice,
      clearAuthNotice,
      refreshProfile,
      loginWithGoogle,
      logout,
    }),
    [user, profile, loading, ready, isAdmin, authNotice, clearAuthNotice, refreshProfile, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
