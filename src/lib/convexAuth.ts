import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

/**
 * `useAuth` for <ConvexProviderWithAuth> — hands Convex the current Supabase
 * access token, which Convex verifies itself (convex/auth.config.ts).
 * Subscribes to the Supabase client directly rather than AuthContext, since
 * the Convex provider sits above <AuthProvider> in the tree (src/main.tsx).
 */
export function useSupabaseAuthForConvex() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchAccessToken = useCallback(async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
    if (forceRefreshToken) {
      const { data } = await supabase.auth.refreshSession();
      return data.session?.access_token ?? null;
    }
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  return useMemo(
    () => ({ isLoading, isAuthenticated, fetchAccessToken }),
    [isLoading, isAuthenticated, fetchAccessToken],
  );
}
