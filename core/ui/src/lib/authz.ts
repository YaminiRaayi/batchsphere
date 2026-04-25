import type { AuthUser } from "../types/auth";

export type AppRole =
  | "SUPER_ADMIN"
  | "WAREHOUSE_OP"
  | "QC_ANALYST"
  | "QC_MANAGER"
  | "PROCUREMENT"
  | "VIEWER";

export function hasAnyRole(user: AuthUser | null, allowedRoles?: AppRole[]) {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  if (!user) {
    return false;
  }

  return allowedRoles.includes(user.role as AppRole);
}

export function canAccessNavPath(user: AuthUser | null, path: string) {
  if (path === "/") {
    return true;
  }

  if (path.startsWith("/inbound/grn") || path.startsWith("/inventory") || path.startsWith("/warehouse")) {
    return hasAnyRole(user, ["SUPER_ADMIN", "WAREHOUSE_OP"]);
  }

  if (path.startsWith("/qc/sampling")) {
    return hasAnyRole(user, ["SUPER_ADMIN", "QC_ANALYST", "QC_MANAGER"]);
  }

  if (path.startsWith("/vendor-qualifications")) {
    return hasAnyRole(user, ["SUPER_ADMIN", "PROCUREMENT"]);
  }

  if (path.startsWith("/master-data")) {
    return hasAnyRole(user, ["SUPER_ADMIN", "WAREHOUSE_OP", "QC_ANALYST", "QC_MANAGER", "PROCUREMENT"]);
  }

  return false;
}
