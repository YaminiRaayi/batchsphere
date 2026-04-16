import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Breadcrumbs } from "../components/Breadcrumbs";
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
        soon: true,
      },
      {
        to: "/vendor-qualifications",
        label: "Vendor Qualifications",
        abbr: "VQ",
        color: "#EA580C",
        lightBg: "#FFF7ED",
        dimBorder: "#FED7AA",
        soon: true,
      },
    ],
  },
  {
    label: "Quality",
    items: [
      {
        to: "/qc/sampling",
        label: "Sampling & QC",
        abbr: "QC",
        color: "#0D9488",
        lightBg: "#F0FDFA",
        dimBorder: "#99F6E4",
      },
      {
        to: "/qms",
        label: "QMS",
        abbr: "QM",
        color: "#D97706",
        lightBg: "#FFFBEB",
        dimBorder: "#FDE68A",
        soon: true,
      },
      {
        to: "/lims",
        label: "LIMS",
        abbr: "LI",
        color: "#7C3AED",
        lightBg: "#F5F3FF",
        dimBorder: "#DDD6FE",
        soon: true,
      },
    ],
  },
  {
    label: "Enterprise",
    items: [
      {
        to: "/hrms",
        label: "HRMS",
        abbr: "HR",
        color: "#E11D48",
        lightBg: "#FFF1F2",
        dimBorder: "#FECDD3",
        soon: true,
      },
      {
        to: "/master-data",
        label: "Master Data",
        abbr: "MD",
        color: "#475569",
        lightBg: "#F1F5F9",
        dimBorder: "#CBD5E1",
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
        backgroundColor: soon ? "#CBD5E1" : active ? color : "#E2E8F0",
        color: soon || !active ? "#94A3B8" : "#FFFFFF",
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
    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold
                     uppercase tracking-wider text-slate-400">
      Soon
    </span>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export function AppShell() {
  const location = useLocation();
  const collapsed = useAppShellStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useAppShellStore((state) => state.setSidebarCollapsed);
  const activeWarehouse = useAppShellStore((state) => state.activeWarehouse);
  const currentUser = useAppShellStore((state) => state.currentUser);

  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Which module is currently active
  const activeItem = useMemo(() => findActiveItem(location.pathname), [location.pathname]);

  // Sidebar widths
  const sidebarW = collapsed ? "72px" : "272px";

  // ── Sidebar inner ───────────────────────────────────────────────────────────
  const sidebarInner = (
    <div className="flex h-full flex-col">

      {/* Logo row */}
      <div
        className="flex h-16 shrink-0 items-center border-b border-slate-100"
        style={{ padding: collapsed ? "0 16px" : "0 16px", justifyContent: collapsed ? "center" : "space-between" }}
      >
        {collapsed ? (
          // Collapsed: show BS mark only
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white"
            style={{ backgroundColor: "#0F172A" }}
          >
            BS
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: "#0F172A" }}
              >
                BS
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-400">
                  BatchSphere
                </p>
                <p className="text-sm font-semibold leading-none text-slate-900">
                  Operations Cloud
                </p>
              </div>
            </div>
            {/* Collapse button — desktop only */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              className="hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100
                         hover:text-slate-600 lg:flex"
              aria-label="Collapse sidebar"
            >
              <ChevronLeftIcon />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} style={{ marginBottom: collapsed ? 16 : 24 }}>

            {/* Group label (hidden when collapsed) */}
            {!collapsed && (
              <p className="mb-1 px-4 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                {group.label}
              </p>
            )}

            {/* Divider dot when collapsed */}
            {collapsed && gi > 0 && (
              <div className="mx-auto mb-3 h-px w-8 bg-slate-100" />
            )}

            {/* Nav items */}
            <div style={{ padding: collapsed ? "0 8px" : "0 8px" }} className="space-y-0.5">
              {group.items.map((item) => {

                // ── Coming Soon item ────────────────────────────────────
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
                          <span className="flex-1 truncate text-sm text-slate-500">
                            {item.label}
                          </span>
                          <SoonBadge />
                        </>
                      )}
                    </div>
                  );
                }

                // ── Live nav item ───────────────────────────────────────
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={collapsed ? item.label : undefined}
                    className="relative block rounded-xl outline-none transition-colors
                               focus-visible:ring-2 focus-visible:ring-blue-500"
                    style={({ isActive }) => ({
                      backgroundColor: isActive ? item.lightBg : "transparent",
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active left-edge bar */}
                        {isActive && (
                          <div
                            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                            style={{ backgroundColor: item.color }}
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
                              style={{ color: isActive ? item.color : "#475569" }}
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

      {/* Sidebar footer */}
      <div className="shrink-0 border-t border-slate-100">
        {/* Site selector */}
        {!collapsed && (
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">
              Site
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-700">Hyderabad</p>
          </div>
        )}

        {/* Expand button (desktop, when collapsed) */}
        {collapsed && (
          <div className="flex justify-center py-3">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400
                         transition hover:bg-slate-100 hover:text-slate-600"
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
    <div className="flex min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>

      {/* ── Mobile overlay ───────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white",
          "shadow-bar transition-all duration-200",
          // Mobile: hidden by default, shown when mobileOpen
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
        style={{ width: sidebarW }}
        aria-label="Sidebar navigation"
      >
        {sidebarInner}
      </aside>

      {/* ── Main area (shifts right to make space for sidebar on desktop) ─────── */}
      <div
        className="flex min-h-screen flex-1 flex-col transition-all duration-200"
        style={{ paddingLeft: `max(0px, ${sidebarW})` }}
      >

        {/* ── Top bar ────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-slate-200
                           bg-white/95 px-5 backdrop-blur">

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200
                       text-slate-500 transition hover:bg-slate-50 lg:hidden"
            aria-label="Open navigation"
          >
            <MenuIcon />
          </button>

          {/* Active module indicator */}
          {activeItem ? (
            <div className="flex items-center gap-2.5">
              {/* Module color dot */}
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: activeItem.color }}
              />
              <span className="text-sm font-semibold text-slate-900">
                {activeItem.label}
              </span>
              {/* Module abbr badge */}
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: activeItem.color }}
              >
                {activeItem.abbr}
              </span>
            </div>
          ) : (
            <span className="text-sm font-semibold text-slate-700">BatchSphere</span>
          )}

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            {/* Environment badge */}
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1
                             text-[11px] font-semibold text-slate-500">
              {activeWarehouse} Site
            </span>

            {/* User avatar placeholder */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full
                            bg-slate-900 text-[11px] font-bold text-white">
              {currentUser.initials}
            </div>
          </div>
        </header>

        {/* ── Page content ───────────────────────────────────────────────────── */}
        <main className="flex-1 p-5 lg:p-6">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
