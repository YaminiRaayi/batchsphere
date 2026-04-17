import { Navigate, Outlet, useLocation } from "react-router-dom";
import { hasAnyRole, type AppRole } from "../lib/authz";
import { useAuthStore } from "../stores/authStore";

type ProtectedRouteProps = {
  allowedRoles?: AppRole[];
};

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasAnyRole(user, allowedRoles)) {
    return <Navigate to="/forbidden" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
