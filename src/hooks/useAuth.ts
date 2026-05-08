import { useCallback } from "react";
import { trpc } from "@/providers/trpc";

export function useAuth() {
  const utils = trpc.useUtils();
  const { data: me, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("agent_token");
      localStorage.removeItem("auth_type");
      localStorage.removeItem("agent_permissions");
      utils.auth.me.invalidate();
      window.location.href = "/login";
    },
  });

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  const hasPermission = useCallback(
    (perm: string) => {
      if (me?.type === "admin") return true;
      if (me?.type === "agent") {
        const perms = me.permissions || {};
        return perms[perm] === true;
      }
      return false;
    },
    [me],
  );

  return {
    isAuthenticated: !!me,
    isAdmin: me?.type === "admin",
    isAgent: me?.type === "agent",
    permissions: me?.permissions,
    isLoading,
    logout,
    hasPermission,
  };
}
