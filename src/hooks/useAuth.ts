import { useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/providers/trpc";

export function useAuth() {
  const utils = trpc.useUtils();
  const token = localStorage.getItem("corolar_token");
  const { data: me, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false, refetchOnWindowFocus: false, enabled: !!token,
  });

  useEffect(() => {
    if (!token) return;
    const check = () => {
      const exp = localStorage.getItem("corolar_exp");
      if (exp && Date.now() > parseInt(exp)) {
        logout();
        window.location.reload();
      }
    };
    check();
    const iv = setInterval(check, 60000);
    return () => clearInterval(iv);
  }, [token]);

  const logout = useCallback(() => {
    localStorage.removeItem("corolar_token");
    localStorage.removeItem("corolar_exp");
    supabase.auth.signOut();
    utils.invalidate();
    window.location.href = "/login";
  }, [utils]);

  return { isAuthenticated: !!me, isAdmin: !!me, isLoading: isLoading && !!token, logout };
}

export function setLoginSession(accessToken: string) {
  localStorage.setItem("corolar_token", accessToken);
  localStorage.setItem("corolar_exp", String(Date.now() + 24 * 60 * 60 * 1000));
}
