import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types/database";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string, userObj?: { email?: string }) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      setProfile(data);
    } else {
      // Profile missing (e.g. created before migration or insert failed during sign-up).
      // Auto-create a default profile so FK constraints on other tables don't break.
      const email = userObj?.email ?? "";
      const fallbackName = email.split("@")[0].replace(/[._-]/g, " ") || "User";
      const { data: created } = await supabase
        .from("profiles")
        .upsert({ id: userId, full_name: fallbackName, role: "lawyer", organization: "", jurisdiction: "", avatar_url: "" } as any)
        .select()
        .maybeSingle();
      if (created) setProfile(created);
    }
  }

  useEffect(() => {
    let mounted = true;
    let hadUser = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      hadUser = Boolean(session?.user);
      if (session?.user) fetchProfile(session.user.id, session.user);
      setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    // onAuthStateChange handles future state changes only (sign-in, sign-out, token refresh).
    // INITIAL_SESSION is skipped — getSession() above already handles the initial load.
    // setLoading is never called here: if INITIAL_SESSION fires with null before getSession()
    // resolves it would set user=null and loading=false, causing a spurious redirect to /login.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (event === 'INITIAL_SESSION') return;

        if (!session?.user && hadUser) {
          // We previously had a confirmed session on this tab. Don't trust a
          // single ambiguous null-session event enough to bounce an
          // already-signed-in user back to /login — re-check directly first.
          console.warn(`[auth] ${event} fired with no session while signed in — re-confirming`, {
            event,
            timestamp: new Date().toISOString(),
          });
          const { data: { session: confirmed } } = await supabase.auth.getSession();
          if (!mounted) return;
          if (confirmed?.user) {
            console.warn(`[auth] re-confirm found a valid session — ignoring the ${event} event`, { event });
            return;
          }
          console.warn(`[auth] re-confirm found no session — signing out`, { event });
        }

        setSession(session);
        setUser(session?.user ?? null);
        hadUser = Boolean(session?.user);
        if (session?.user) {
          fetchProfile(session.user.id, session.user);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    role: string
  ) {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { full_name: fullName }
      }
    });
    if (error) {
      return { error: error.message };
    }
    if (data.user) {
      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName,
        role,
        organization: "",
        jurisdiction: "",
        avatar_url: "",
      } as any);
      if (profileErr) {
        return { error: `Account created but profile setup failed: ${profileErr.message}` };
      }
    }
    return { error: null };
  }

  async function signOut() {
    try {
      // Clear Supabase session FIRST (before clearing state)
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Supabase signOut error:", error);
    }
    
    // Clear local state
    setUser(null);
    setSession(null);
    setProfile(null);
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  async function sendPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        sendPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
