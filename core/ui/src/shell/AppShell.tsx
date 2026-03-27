import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

type NavLeaf = {
  to: string;
  label: string;
  description: string;
};

type NavGroup = {
  label: string;
  items: NavLeaf[];
};

const navGroups: NavGroup[] = [
  {
    label: "Operations",
    items: [
      {
        to: "/inventory",
        label: "Inventory Control",
        description: "Stock visibility, pallet traceability, and movements."
      },
      {
        to: "/inbound/grn",
        label: "GRN",
        description: "Goods receipt, inward processing, and receipt workflow."
      }
    ]
  },
  {
    label: "Quality",
    items: [
      {
        to: "/qc/sampling",
        label: "Sampling & QC",
        description: "Sampling plans, QC decisions, and release flow."
      }
    ]
  },
  {
    label: "Administration",
    items: [
      {
        to: "/",
        label: "Command Center",
        description: "Operational overview and cross-functional visibility."
      },
      {
        to: "/master-data",
        label: "Master Data",
        description: "Warehouse, materials, vendors, specs, and reference masters."
      }
    ]
  }
];

export function AppShell() {
  const location = useLocation();
  const [openMobileNav, setOpenMobileNav] = useState(false);

  useEffect(() => {
    setOpenMobileNav(false);
  }, [location.pathname]);

  const activeGroup = useMemo(
    () =>
      navGroups.find((group) =>
        group.items.some((item) =>
          item.to === "/"
            ? location.pathname === "/"
            : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
        )
      )?.label ?? null,
    [location.pathname]
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b border-ink/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setOpenMobileNav((current) => !current)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink/10 text-ink lg:hidden"
              aria-expanded={openMobileNav}
              aria-label="Toggle navigation"
            >
              <span className="text-xl leading-none">≡</span>
            </button>

            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-[0.34em] text-steel">
                BatchSphere
              </span>
              <span className="font-display text-2xl font-semibold leading-none text-ink">
                Operations Cloud
              </span>
            </div>
          </div>

          <div className="rounded-full border border-ink/10 bg-[#eef2f5] px-4 py-3 text-sm text-slate">
            Hyderabad Site
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1680px] gap-6 px-4 py-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-6">
        <aside
          className={[
            "lg:block",
            openMobileNav ? "block" : "hidden"
          ].join(" ")}
        >
          <div className="sticky top-[96px] space-y-4">
            <div className="rounded-[28px] bg-[#243041] px-5 py-5 text-white shadow-float">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">
                Navigation
              </p>
              <h3 className="mt-3 font-display text-2xl font-semibold">Modules</h3>
              <p className="mt-3 text-sm leading-6 text-white/72">
                All sections and links now live in the left-side navigation rail.
              </p>
            </div>

            {navGroups.map((group) => (
              <div key={group.label} className="rounded-[28px] border border-ink/10 bg-white px-5 py-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-steel">
                    {group.label}
                  </p>
                  {activeGroup === group.label ? (
                    <span className="rounded-full bg-[#13a7b8] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                      Active
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      className={({ isActive }) =>
                        [
                          "rounded-[22px] border px-4 py-4 transition",
                          isActive
                            ? "border-[#13a7b8]/20 bg-[#13a7b8]/10"
                            : "border-ink/8 bg-white hover:border-ink/12 hover:bg-[#f3f6f8]"
                        ].join(" ")
                      }
                    >
                      <p className="text-sm font-semibold text-ink">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate">{item.description}</p>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}

            <div className="rounded-[28px] border border-ink/10 bg-white px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-steel">
                Product Scope
              </p>
              <div className="mt-4 grid gap-3">
                {[
                  ["Live", "WMS, Sampling, Inventory, QC"],
                  ["Planned", "QMS, LIMS, DMS"],
                  ["Style", "Dark slate + teal action palette"]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[20px] bg-[#f3f6f8] px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate">
                      {label}
                    </p>
                    <p className="mt-2 text-sm text-ink">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
