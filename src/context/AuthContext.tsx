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
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { firebaseConfigured, getFirebaseAuth, googleProvider } from "@/firebase/config";
import { loadProfile } from "@/firebase/userDoc";
import type { UserProfile } from "@/types/profile";

type AuthState = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  firebaseReady: boolean;
  refreshProfile: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const ready = firebaseConfigured();

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
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const p = await loadProfile(u.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [ready]);

  const loginWithGoogle = useCallback(async () => {
    if (!ready) return;
    const auth = getFirebaseAuth();
    await signInWithPopup(auth, googleProvider);
  }, [ready]);

  const logout = useCallback(async () => {
    if (!ready) return;
    await signOut(getFirebaseAuth());
    setProfile(null);
  }, [ready]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      firebaseReady: ready,
      refreshProfile,
      loginWithGoogle,
      logout,
    }),
    [user, profile, loading, ready, refreshProfile, loginWithGoogle, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
