import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const token = localStorage.getItem("corolar_token");

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      if (!token) { if (mounted) setIsLoading(false); return; }
      const { data, error } = await supabase.auth.getUser(token);
      if (mounted) {
        if (error || !data.user) {
          setUser(null);
          localStorage.removeItem("corolar_token");
          localStorage.removeItem("corolar_exp");
        } else {
          setUser({ id: data.user.id, email: data.user.email });
        }
        setIsLoading(false);
      }
    };
    check();
    return () => { mounted = false; };
  }, [token]);

  // 24h auto-logout check
  useEffect(() => {
    if (!token) return;
    const checkExp = () => {
      const exp = localStorage.getItem("corolar_exp");
      if (exp && Date.now() > parseInt(exp)) {
        logout();
        window.location.reload();
      }
    };
    checkExp();
    const iv = setInterval(checkExp, 60000);
    return () => clearInterval(iv);
  }, [token]);

  const logout = useCallback(() => {
    localStorage.removeItem("corolar_token");
    localStorage.removeItem("corolar_exp");
    supabase.auth.signOut({ scope: 'local' });
    setUser(null);
    window.location.href = "/login";
  }, []);

  return {
    isAuthenticated: !!user,
    isAdmin: !!user,
    isLoading: isLoading && !!token,
    user,
    logout,
  };
}

export function setLoginSession(accessToken: string) {
  localStorage.setItem("corolar_token", accessToken);
  localStorage.setItem("corolar_exp", String(Date.now() + 24 * 60 * 60 * 1000));
}
