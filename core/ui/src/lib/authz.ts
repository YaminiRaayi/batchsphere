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

  if (path.startsWith("/qms")) {
    return hasAnyRole(user, ["SUPER_ADMIN", "QC_ANALYST", "QC_MANAGER"]);
  }

  if (path.startsWith("/documents")) {
    return hasAnyRole(user, ["SUPER_ADMIN", "QC_ANALYST", "QC_MANAGER"]);
  }

  if (path.startsWith("/lims")) {
    return hasAnyRole(user, ["SUPER_ADMIN", "QC_ANALYST", "QC_MANAGER"]);
  }

  if (path.startsWith("/vendor-qualifications")) {
    return hasAnyRole(user, ["SUPER_ADMIN", "PROCUREMENT"]);
  }

  if (path.startsWith("/supplier-quality-agreements")) {
    return hasAnyRole(user, ["SUPER_ADMIN", "PROCUREMENT", "QC_MANAGER"]);
  }

  if (path.startsWith("/admin/users") || path.startsWith("/admin/security-audit") || path.startsWith("/hrms")) {
    return hasAnyRole(user, ["SUPER_ADMIN"]);
  }

  if (path.startsWith("/master-data/partners")) {
    return hasAnyRole(user, ["SUPER_ADMIN", "PROCUREMENT"]);
  }

  if (path.startsWith("/master-data")) {
    return hasAnyRole(user, ["SUPER_ADMIN", "WAREHOUSE_OP", "QC_ANALYST", "QC_MANAGER", "PROCUREMENT"]);
  }

  return false;
}
