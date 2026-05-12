export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  employeeId: string | null;
  forcePasswordChange: boolean;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  refreshExpiresInSeconds: number;
  user: AuthUser;
};
