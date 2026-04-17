import { useEffect } from "react";
import { fetchCurrentUser, setAccessToken } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { useAppShellStore } from "../stores/appShellStore";

function toInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AuthBootstrap() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setCurrentUser = useAppShellStore((state) => state.setCurrentUser);
  const resetCurrentUser = useAppShellStore((state) => state.resetCurrentUser);

  useEffect(() => {
    setAccessToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!user) {
      resetCurrentUser();
      return;
    }

    setCurrentUser({
      name: user.username,
      role: user.role.replace(/_/g, " "),
      initials: toInitials(user.username)
    });
  }, [resetCurrentUser, setCurrentUser, user]);

  useEffect(() => {
    if (!accessToken || !isAuthenticated) {
      return;
    }

    let cancelled = false;
    async function loadCurrentUser() {
      try {
        const currentUser = await fetchCurrentUser();
        if (!cancelled) {
          setSession({
            accessToken: accessToken ?? "",
            refreshToken,
            user: currentUser
          });
        }
      } catch {
        if (!cancelled) {
          clearSession();
          resetCurrentUser();
        }
      }
    }

    void loadCurrentUser();
    return () => {
      cancelled = true;
    };
  }, [accessToken, clearSession, isAuthenticated, refreshToken, resetCurrentUser, setSession]);

  return null;
}
