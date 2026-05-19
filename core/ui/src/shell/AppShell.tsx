import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { SessionTimeoutModal } from "../components/SessionTimeoutModal";
import { canAccessNavPath } from "../lib/authz";
import { confirmTotpSetup, logout, notifySessionTimeout, setAccessToken, setupTotp } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { useAppShellStore } from "../stores/appShellStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type NavItem = {
  to: string;
  label: string;
  abbr: string;    // 2-letter module code shown in icon
  color: string;   // hex — module accent
  lightBg: string; // hex — subtle tinted background when active
  dimBorder: string; // hex — border tint
  soon?: boolean;  // true = "Coming Soon" — not navigable yet
  end?: boolean;   // true = exact-match for NavLink (for "/" route)
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

// ─── Navigation structure ─────────────────────────────────────────────────────
// To add a new module: add an entry here (with soon: true until built).
// Module colors map 1-to-1 with tailwind.config.js tokens.

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      {
        to: "/",
        label: "Command Center",
        abbr: "CC",
        color: "#475569",
        lightBg: "#F1F5F9",
        dimBorder: "#CBD5E1",
        end: true,
      },
      {
        to: "/inbound/grn",
        label: "Inbound GRN",
        abbr: "GR",
        color: "#2563EB",
        lightBg: "#EFF6FF",
        dimBorder: "#BFDBFE",
      },
      {
        to: "/inventory",
        label: "Inventory",
        abbr: "IN",
        color: "#059669",
        lightBg: "#ECFDF5",
        dimBorder: "#A7F3D0",
      },
      {
        to: "/warehouse",
        label: "Warehouse",
        abbr: "WH",
        color: "#4F46E5",
        lightBg: "#EEF2FF",
        dimBorder: "#C7D2FE",
      },
      {
        to: "/master-data/partners/vendors",
        label: "Vendor Management",
        abbr: "VQ",
        color: "#EA580C",
        lightBg: "#FFF7ED",
        dimBorder: "#FED7AA",
      },
      {
        to: "/supplier-quality-agreements",
        label: "Quality Agreements",
        abbr: "QA",
        color: "#C2410C",
        lightBg: "#FFF7ED",
        dimBorder: "#FED7AA",
      },
    ],
  },
  {
    label: "QMS",
    items: [
      {
        to: "/qms/deviations",
        label: "Deviations",
        abbr: "QM",
        color: "#D97706",
        lightBg: "#FFFBEB",
        dimBorder: "#FDE68A"
      },
      {
        to: "/qms/capas",
        label: "CAPAs",
        abbr: "CA",
        color: "#B45309",
        lightBg: "#FFFBEB",
        dimBorder: "#FDE68A"
      },
      {
        to: "/qms/analytics",
        label: "QMS Analytics",
        abbr: "AN",
        color: "#7C3AED",
        lightBg: "#F5F3FF",
        dimBorder: "#DDD6FE"
      },
      {
        to: "/qms/change-controls",
        label: "Change Control",
        abbr: "CC",
        color: "#0369A1",
        lightBg: "#F0F9FF",
        dimBorder: "#BAE6FD"
      },
      {
        to: "/qms/complaints",
        label: "Complaints",
        abbr: "CM",
        color: "#DC2626",
        lightBg: "#FEF2F2",
        dimBorder: "#FECACA"
      },
      {
        to: "/qms/risk-register",
        label: "Risk Register",
        abbr: "RA",
        color: "#9333EA",
        lightBg: "#FAF5FF",
        dimBorder: "#E9D5FF"
      },
      {
        to: "/qms/apqr",
        label: "APQR",
        abbr: "AP",
        color: "#2563EB",
        lightBg: "#EFF6FF",
        dimBorder: "#BFDBFE"
      },
      {
        to: "/qms/batch-release",
        label: "QP Batch Release",
        abbr: "BR",
        color: "#0F766E",
        lightBg: "#F0FDFA",
        dimBorder: "#99F6E4"
      },
      {
        to: "/qms/traceability",
        label: "Lot Traceability",
        abbr: "TR",
        color: "#6D28D9",
        lightBg: "#F5F3FF",
        dimBorder: "#DDD6FE"
      },
      {
        to: "/documents",
        label: "Documents",
        abbr: "DC",
        color: "#7C3AED",
        lightBg: "#F5F3FF",
        dimBorder: "#DDD6FE"
      },
    ],
  },
  {
    label: "LIMS",
    items: [
      {
        to: "/lims/dashboard",
        label: "Dashboard",
        abbr: "LD",
        color: "#0D9488",
        lightBg: "#F0FDFA",
        dimBorder: "#99F6E4"
      },
      {
        to: "/lims/sampling",
        label: "QC Sampling",
        abbr: "QC",
        color: "#0D9488",
        lightBg: "#F0FDFA",
        dimBorder: "#99F6E4"
      },
      {
        to: "/lims/worksheets",
        label: "Worksheets",
        abbr: "WS",
        color: "#2563EB",
        lightBg: "#EFF6FF",
        dimBorder: "#BFDBFE"
      },
      {
        to: "/lims/oos-investigations",
        label: "OOS Investigations",
        abbr: "OI",
        color: "#DC2626",
        lightBg: "#FEF2F2",
        dimBorder: "#FECACA"
      },
      {
        to: "/lims/specifications",
        label: "Specifications",
        abbr: "SP",
        color: "#475569",
        lightBg: "#F1F5F9",
        dimBorder: "#CBD5E1"
      },
      {
        to: "/lims/methods",
        label: "Methods / MoA",
        abbr: "MO",
        color: "#475569",
        lightBg: "#F1F5F9",
        dimBorder: "#CBD5E1"
      },
      {
        to: "/lims/sampling-tools",
        label: "Sampling Tools",
        abbr: "ST",
        color: "#475569",
        lightBg: "#F1F5F9",
        dimBorder: "#CBD5E1"
      },
      {
        to: "/lims/equipment",
        label: "Equipment",
        abbr: "EQ",
        color: "#0891B2",
        lightBg: "#ECFEFF",
        dimBorder: "#A5F3FC"
      },
      {
        to: "/lims/reagents",
        label: "Reagents",
        abbr: "RG",
        color: "#0D9488",
        lightBg: "#F0FDFA",
        dimBorder: "#99F6E4"
      },
      {
        to: "/lims/reference-standards",
        label: "Reference Standards",
        abbr: "RS",
        color: "#0E7490",
        lightBg: "#ECFEFF",
        dimBorder: "#A5F3FC"
      },
      {
        to: "/lims/logbook",
        label: "Instrument Logbook",
        abbr: "LB",
        color: "#0891B2",
        lightBg: "#ECFEFF",
        dimBorder: "#A5F3FC"
      },
      {
        to: "/lims/stability",
        label: "Stability",
        abbr: "ST",
        color: "#7C3AED",
        lightBg: "#F5F3FF",
        dimBorder: "#DDD6FE"
      },
      {
        to: "/lims/env-monitoring",
        label: "Env Monitoring",
        abbr: "EM",
        color: "#16A34A",
        lightBg: "#F0FDF4",
        dimBorder: "#BBF7D0"
      },
      {
        to: "/lims/retention-samples",
        label: "Retention Samples",
        abbr: "RS",
        color: "#0F766E",
        lightBg: "#F0FDFA",
        dimBorder: "#99F6E4"
      },
      {
        to: "/lims/coa",
        label: "CoA / Lab Certificates",
        abbr: "CO",
        color: "#0F766E",
        lightBg: "#F0FDFA",
        dimBorder: "#99F6E4"
      },
      {
        to: "/lims/reports",
        label: "Lab Reports",
        abbr: "LR",
        color: "#2563EB",
        lightBg: "#EFF6FF",
        dimBorder: "#BFDBFE"
      },
      {
        to: "/lims/compliance",
        label: "Lab Compliance",
        abbr: "LC",
        color: "#7C3AED",
        lightBg: "#F5F3FF",
        dimBorder: "#DDD6FE"
      },
    ],
  },
  {
    label: "Enterprise",
    items: [
      {
        to: "/hrms/employees",
        label: "Employees",
        abbr: "HR",
        color: "#E11D48",
        lightBg: "#FFF1F2",
        dimBorder: "#FECDD3"
      },
      {
        to: "/hrms/training",
        label: "Training",
        abbr: "TR",
        color: "#BE123C",
        lightBg: "#FFF1F2",
        dimBorder: "#FECDD3"
      },
      {
        to: "/master-data",
        label: "Master Data",
        abbr: "MD",
        color: "#475569",
        lightBg: "#F1F5F9",
        dimBorder: "#CBD5E1",
      },
      {
        to: "/admin/users",
        label: "User Management",
        abbr: "UM",
        color: "#0F766E",
        lightBg: "#F0FDFA",
        dimBorder: "#99F6E4",
      },
      {
        to: "/admin/security-audit",
        label: "Security Audit",
        abbr: "SA",
        color: "#B45309",
        lightBg: "#FFFBEB",
        dimBorder: "#FDE68A",
      },
    ],
  },
];

// ─── Helper: find the active nav item ────────────────────────────────────────

function findActiveItem(pathname: string): NavItem | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.soon) continue;
      const match = item.end
        ? pathname === item.to
        : pathname === item.to || pathname.startsWith(`${item.to}/`);
      if (match) return item;
    }
  }
  return null;
}

function navItemTestId(path: string) {
  const slug = path
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9/]+/g, "-")
    .replace(/\//g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
  return `nav-item-${slug || "root"}`;
}

// ─── Chevron icon (collapse / expand) ────────────────────────────────────────

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M9 2.5L4.5 7L9 11.5" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M5 2.5L9.5 7L5 11.5" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" />
    </svg>
  );
}

// ─── Module icon ──────────────────────────────────────────────────────────────

interface ModIconProps {
  abbr: string;
  color: string;
  size?: number;
  active?: boolean;
  soon?: boolean;
}

function ModIcon({ abbr, color, size = 32, active = false, soon = false }: ModIconProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg font-bold leading-none text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        backgroundColor: soon ? "rgba(255,255,255,0.14)" : active ? "#FFFFFF" : "rgba(255,255,255,0.08)",
        color: soon ? "#BFDBFE" : active ? "#1D4ED8" : "#BFDBFE",
        transition: "background-color 150ms, color 150ms",
      }}
    >
      {abbr}
    </div>
  );
}

// ─── "Coming Soon" badge ──────────────────────────────────────────────────────

function SoonBadge() {
  return (
    <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-bold
                     uppercase tracking-wider text-blue-100">
      Soon
    </span>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useAppShellStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useAppShellStore((state) => state.setSidebarCollapsed);
  const activeWarehouse = useAppShellStore((state) => state.activeWarehouse);
  const currentUser = useAppShellStore((state) => state.currentUser);
  const resetCurrentUser = useAppShellStore((state) => state.resetCurrentUser);
  const authUser = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [showTotpModal, setShowTotpModal] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpError, setTotpError] = useState<string | null>(null);
  const [totpSuccess, setTotpSuccess] = useState(false);
  const [totpBusy, setTotpBusy] = useState(false);
  const totpCodeRef = useRef<HTMLInputElement>(null);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Which module is currently active
  const activeItem = useMemo(() => findActiveItem(location.pathname), [location.pathname]);

  // Sidebar widths
  const sidebarW = collapsed ? "72px" : "272px";

  async function handleSignOut() {
    try {
      await logout();
    } catch {
      // Client logout still proceeds if the backend token is already invalid.
    } finally {
      setAccessToken(null);
      clearSession();
      resetCurrentUser();
      navigate("/login", { replace: true });
    }
  }

  async function handleOpenTotpSetup() {
    setTotpError(null);
    setTotpSuccess(false);
    setTotpCode("");
    setTotpSetupData(null);
    setShowTotpModal(true);
    try {
      const data = await setupTotp();
      setTotpSetupData({ secret: data.secret, qrCodeDataUrl: data.qrCodeDataUrl });
      setTimeout(() => totpCodeRef.current?.focus(), 100);
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : "Setup failed");
    }
  }

  async function handleConfirmTotpSetup() {
    if (totpCode.length !== 6) {
      setTotpError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setTotpBusy(true);
    setTotpError(null);
    try {
      await confirmTotpSetup(totpCode);
      setTotpSuccess(true);
      setTotpCode("");
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setTotpBusy(false);
    }
  }

  async function handleSessionTimeout() {
    try {
      await notifySessionTimeout();
    } catch {
      // ignore — best-effort audit record
    } finally {
      setAccessToken(null);
      clearSession();
      resetCurrentUser();
      navigate("/login?reason=timeout", { replace: true });
    }
  }

  // ── Sidebar inner ───────────────────────────────────────────────────────────
  const sidebarInner = (
    <div className="flex h-full flex-col">
      <div
        className="flex h-16 shrink-0 items-center border-b border-blue-800"
        style={{ padding: collapsed ? "0 16px" : "0 16px", justifyContent: collapsed ? "center" : "space-between" }}
      >
        {collapsed ? (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white"
            style={{ backgroundColor: "#FFFFFF", color: "#1D4ED8" }}
          >
            BS
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: "#FFFFFF", color: "#1D4ED8" }}
              >
                BS
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-blue-200">
                  BatchSphere
                </p>
                <p className="text-sm font-semibold leading-none text-white">
                  Pharma ERP v2.1
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              className="hidden rounded-lg p-1.5 text-blue-200 transition hover:bg-white/10
                         hover:text-white lg:flex"
              aria-label="Collapse sidebar"
            >
              <ChevronLeftIcon />
            </button>
          </>
        )}
      </div>

      {!collapsed && (
        <div className="border-b border-blue-800 p-3">
          <div className="flex items-center gap-2 rounded-xl bg-white/10 p-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
              {currentUser.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-white">{currentUser.name}</div>
              <div className="text-[10px] text-blue-200">{currentUser.role}</div>
            </div>
            <div className="h-2 w-2 rounded-full bg-green-400" />
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} style={{ marginBottom: collapsed ? 16 : 24 }}>
            {!collapsed && (
              <p className="mb-1 px-4 text-[10px] font-bold uppercase tracking-[0.3em] text-blue-300">
                {group.label}
              </p>
            )}

            {collapsed && gi > 0 && (
              <div className="mx-auto mb-3 h-px w-8 bg-blue-800" />
            )}

            <div style={{ padding: collapsed ? "0 8px" : "0 8px" }} className="space-y-0.5">
              {group.items
                .filter((item) => item.soon || canAccessNavPath(authUser, item.to))
                .map((item) => {
                if (item.soon) {
                  return (
                    <div
                      key={item.to}
                      title={collapsed ? `${item.label} — Coming Soon` : undefined}
                      className="flex cursor-default items-center rounded-xl opacity-50"
                      style={{
                        gap: 10,
                        padding: collapsed ? "6px" : "6px 8px",
                        justifyContent: collapsed ? "center" : undefined,
                      }}
                    >
                      <ModIcon abbr={item.abbr} color={item.color} size={30} soon />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate text-sm text-blue-100">
                            {item.label}
                          </span>
                          <SoonBadge />
                        </>
                      )}
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={collapsed ? item.label : undefined}
                    data-testid={navItemTestId(item.to)}
                    className="relative block rounded-xl outline-none transition-colors
                               focus-visible:ring-2 focus-visible:ring-blue-500"
                    style={({ isActive }) => ({
                      backgroundColor: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <div
                            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                            style={{ backgroundColor: "#FFFFFF" }}
                          />
                        )}

                        <div
                          className="flex items-center"
                          style={{
                            gap: 10,
                            padding: collapsed ? "7px" : "7px 8px",
                            justifyContent: collapsed ? "center" : undefined,
                          }}
                        >
                          <ModIcon
                            abbr={item.abbr}
                            color={item.color}
                            size={30}
                            active={isActive}
                          />
                          {!collapsed && (
                            <span
                              className="flex-1 truncate text-sm font-medium"
                              style={{ color: isActive ? "#FFFFFF" : "#BFDBFE" }}
                            >
                              {item.label}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-blue-800">
        {!collapsed && (
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-blue-300">
              Site
            </p>
            <p className="mt-0.5 text-sm font-medium text-white">Hyderabad</p>
            <button
              data-testid="btn-logout"
              type="button"
              onClick={() => {
                void handleSignOut();
              }}
              className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200 transition hover:text-white"
            >
              Sign out
            </button>
          </div>
        )}

        {collapsed && (
          <div className="flex justify-center py-3">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-200
                         transition hover:bg-white/10 hover:text-white"
              aria-label="Expand sidebar"
            >
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#F0F4FF" }}>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-blue-800",
          "shadow-bar transition-all duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
        style={{ width: sidebarW, backgroundColor: "#1E3A8A" }}
        aria-label="Sidebar navigation"
      >
        {sidebarInner}
      </aside>

      <div
        className="flex min-h-screen flex-1 flex-col transition-all duration-200"
        style={{ paddingLeft: `max(0px, ${sidebarW})` }}
      >
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-blue-100 bg-white px-6 shadow-sm">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-100
                       text-slate-500 transition hover:bg-blue-50 lg:hidden"
            aria-label="Open navigation"
          >
            <MenuIcon />
          </button>

          <div className="min-w-0 flex-1 text-xs text-slate-400">
            <Breadcrumbs />
            {!activeItem ? (
              <span className="font-medium text-blue-700">Command Center</span>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => { void handleOpenTotpSetup(); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
              title="Set up two-factor authentication"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              2FA
            </button>
            <button
              type="button"
              onClick={() => {
                void handleSignOut();
              }}
              className="inline-flex items-center rounded-xl border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
            >
              Sign out
            </button>

            <div className="hidden items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs text-slate-400 md:flex">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeWidth="2" d="m21 21-4.35-4.35" />
              </svg>
              Search anything... Ctrl+K
            </div>

            <button
              type="button"
              className="relative rounded-xl p-2 text-slate-500 transition hover:bg-blue-50"
              aria-label="Notifications"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full border border-white bg-red-500" />
            </button>

            <span className="hidden rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs text-slate-500 md:inline-flex">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric"
              })}
            </span>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      <SessionTimeoutModal onTimeout={() => { void handleSessionTimeout(); }} />

      {showTotpModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Set Up Two-Factor Authentication</h2>
                <p className="mt-0.5 text-xs text-slate-500">Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to confirm.</p>
              </div>
              <button type="button" onClick={() => setShowTotpModal(false)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50">✕</button>
            </div>

            {totpSuccess ? (
              <div className="mt-5 rounded-xl bg-green-50 p-4 text-center">
                <div className="text-2xl">✓</div>
                <p className="mt-2 text-sm font-semibold text-green-700">Two-factor authentication is now enabled.</p>
                <p className="mt-1 text-xs text-green-600">You will be prompted for a code on your next login.</p>
                <button type="button" onClick={() => setShowTotpModal(false)} className="mt-4 rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700">
                  Done
                </button>
              </div>
            ) : totpSetupData ? (
              <div className="mt-5 space-y-4">
                <div className="flex justify-center">
                  <img src={totpSetupData.qrCodeDataUrl} alt="TOTP QR Code" className="h-48 w-48 rounded-xl border border-slate-200 p-1" />
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Manual entry key</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-700 break-all">{totpSetupData.secret}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Verification code
                    <input
                      ref={totpCodeRef}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={totpCode}
                      onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ""))}
                      onKeyDown={(event) => { if (event.key === "Enter") { void handleConfirmTotpSetup(); } }}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-center font-mono text-xl font-semibold text-slate-800 outline-none focus:border-blue-500"
                      placeholder="000000"
                    />
                  </label>
                </div>
                {totpError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{totpError}</p> : null}
                <button
                  type="button"
                  disabled={totpCode.length !== 6 || totpBusy}
                  onClick={() => { void handleConfirmTotpSetup(); }}
                  className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {totpBusy ? "Verifying..." : "Enable 2FA"}
                </button>
              </div>
            ) : (
              <div className="mt-5 flex items-center justify-center py-8">
                {totpError ? (
                  <p className="text-sm font-semibold text-red-600">{totpError}</p>
                ) : (
                  <p className="text-sm text-slate-400">Loading QR code...</p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
