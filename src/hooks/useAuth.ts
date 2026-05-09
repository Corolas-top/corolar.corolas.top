import { useCallback } from "react";
import { trpc } from "@/providers/trpc";

export function useAuth() {
  const utils = trpc.useUtils();
  const { data: me, isLoading } = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const logoutMut = trpc.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("corolar_token");
      utils.invalidate();
      window.location.href = "/login";
    },
  });
  return {
    isAuthenticated: !!me,
    isAdmin: me?.type === "admin",
    isAgent: me?.type === "agent",
    isLoading,
    logout: useCallback(() => logoutMut.mutate(), [logoutMut]),
  };
}
