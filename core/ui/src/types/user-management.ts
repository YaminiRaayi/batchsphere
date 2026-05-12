export type UserRole =
  | "SUPER_ADMIN"
  | "WAREHOUSE_OP"
  | "QC_ANALYST"
  | "QC_MANAGER"
  | "PROCUREMENT"
  | "VIEWER";

export type ManagedUser = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  employeeId: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  passwordChangedAt: string | null;
  forcePasswordChange: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type CreateManagedUserRequest = {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  employeeId: string | null;
};

export type UpdateManagedUserRequest = {
  email: string;
  role: UserRole;
  isActive: boolean;
  password?: string;
  employeeId: string | null;
  forcePasswordChange: boolean;
};
