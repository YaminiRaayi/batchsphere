import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { request, type FullConfig } from "@playwright/test";

type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  employeeId: string | null;
};

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: AuthUser;
};

type RoleSeed = {
  username: string;
  password: string;
  role: "SUPER_ADMIN" | "WAREHOUSE_OP" | "QC_ANALYST" | "QC_MANAGER" | "PROCUREMENT";
  email: string;
  stateFile: string;
};

type ManagedUser = {
  id: string;
  username: string;
  email: string;
  role: "SUPER_ADMIN" | "WAREHOUSE_OP" | "QC_ANALYST" | "QC_MANAGER" | "PROCUREMENT" | "VIEWER";
  isActive: boolean;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(__dirname, ".auth");
const runIdFile = path.join(authDir, "run-id.json");
const backendBaseUrl = "http://127.0.0.1:8080";
const frontendOrigin = "http://127.0.0.1:5173";

const roleSeeds: RoleSeed[] = [
  { username: "admin", password: "Admin@123", role: "SUPER_ADMIN", email: "admin@batchsphere.local", stateFile: "admin.json" },
  { username: "qc.analyst", password: "Admin@123", role: "QC_ANALYST", email: "qc.analyst@batchsphere.local", stateFile: "qc-analyst.json" },
  { username: "qc.manager", password: "Admin@123", role: "QC_MANAGER", email: "qc.manager@batchsphere.local", stateFile: "qc-manager.json" },
  { username: "warehouse.op", password: "Admin@123", role: "WAREHOUSE_OP", email: "warehouse.op@batchsphere.local", stateFile: "warehouse-op.json" },
  { username: "procurement.user", password: "Admin@123", role: "PROCUREMENT", email: "procurement.user@batchsphere.local", stateFile: "procurement.json" }
];

function toInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function buildStorageState(payload: LoginResponse) {
  return {
    cookies: [],
    origins: [
      {
        origin: frontendOrigin,
        localStorage: [
          {
            name: "batchsphere-auth",
            value: JSON.stringify({
              state: {
                accessToken: payload.accessToken,
                refreshToken: payload.refreshToken,
                tokenType: payload.tokenType,
                user: payload.user,
                isAuthenticated: true
              },
              version: 0
            })
          },
          {
            name: "batchsphere-app-shell",
            value: JSON.stringify({
              state: {
                sidebarCollapsed: false,
                activeWarehouse: "Hyderabad",
                currentUser: {
                  name: payload.user.username,
                  role: payload.user.role.replace(/_/g, " "),
                  initials: toInitials(payload.user.username)
                },
                selectedBatchId: null
              },
              version: 0
            })
          }
        ]
      }
    ]
  };
}

async function loginSeed(apiBaseUrl: string, seed: RoleSeed) {
  const api = await request.newContext({
    baseURL: apiBaseUrl,
    extraHTTPHeaders: {
      Accept: "application/json",
      "Content-Type": "application/json"
    }
  });

  const response = await api.post("/api/auth/login", {
    data: {
      username: seed.username,
      password: seed.password
    }
  });

  if (!response.ok()) {
    throw new Error(`Failed to log in seeded user ${seed.username}: ${response.status()} ${response.statusText()}`);
  }

  const payload = (await response.json()) as LoginResponse;
  await api.dispose();
  return payload;
}

async function ensureManagedUsers(adminPayload: LoginResponse) {
  const api = await request.newContext({
    baseURL: backendBaseUrl,
    extraHTTPHeaders: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminPayload.accessToken}`
    }
  });

  const usersResponse = await api.get("/api/auth/users");
  if (!usersResponse.ok()) {
    throw new Error(`Failed to load managed users: ${usersResponse.status()} ${usersResponse.statusText()}`);
  }

  const users = (await usersResponse.json()) as ManagedUser[];
  const usersByUsername = new Map(users.map((user) => [user.username, user]));

  for (const seed of roleSeeds.filter((entry) => entry.role !== "SUPER_ADMIN")) {
    const existing = usersByUsername.get(seed.username);

    if (!existing) {
      const createResponse = await api.post("/api/auth/users", {
        data: {
          username: seed.username,
          email: seed.email,
          password: seed.password,
          role: seed.role,
          employeeId: null
        }
      });

      if (!createResponse.ok()) {
        throw new Error(`Failed to create E2E user ${seed.username}: ${createResponse.status()} ${createResponse.statusText()}`);
      }
      continue;
    }

    const updateResponse = await api.put(`/api/auth/users/${existing.id}`, {
      data: {
        email: seed.email,
        role: seed.role,
        isActive: true,
        password: seed.password,
        employeeId: null
      }
    });

    if (!updateResponse.ok()) {
      throw new Error(`Failed to normalize E2E user ${seed.username}: ${updateResponse.status()} ${updateResponse.statusText()}`);
    }
  }

  await api.dispose();
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (typeof baseURL !== "string") {
    throw new Error("Playwright baseURL must be configured.");
  }

  await mkdir(authDir, { recursive: true });

  const now = new Date();
  const runId =
    `E2E-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}` +
    `-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  await writeFile(runIdFile, JSON.stringify({ runId }, null, 2));

  const adminPayload = await loginSeed(backendBaseUrl, roleSeeds[0]);
  await ensureManagedUsers(adminPayload);

  for (const seed of roleSeeds) {
    const payload = await loginSeed(backendBaseUrl, seed);
    const storageState = buildStorageState(payload);
    await writeFile(path.join(authDir, seed.stateFile), JSON.stringify(storageState, null, 2));
  }
}
