import { NavLink, Outlet, useLocation } from "react-router-dom";
import { SectionHeader } from "../../components/SectionHeader";

// ─── Hub cards ────────────────────────────────────────────────────────────────

const hubCards = [
  {
    to: "/master-data/materials/materials",
    accent: "#0ea5e9",
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
    title: "Materials",
    description: "Raw materials, excipients, packaging, finished goods",
    pills: [
      { label: "API",        className: "bg-green-100 text-green-700"  },
      { label: "Excipients", className: "bg-blue-100 text-blue-700"    },
      { label: "Packaging",  className: "bg-violet-100 text-violet-700" }
    ],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" strokeWidth="2"/>
        <path strokeLinecap="round" strokeWidth="2" d="M12 2v3m0 14v3M2 12h3m14 0h3m-2.636-6.364-2.121 2.121M6.757 17.243l-2.121 2.121M17.243 17.243l2.121 2.121M6.757 6.757 4.636 4.636"/>
      </svg>
    )
  },
  {
    to: "/master-data/partners/vendors",
    accent: "#f97316",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    title: "Vendors",
    description: "Approved supplier list, qualification status, contacts",
    pills: [
      { label: "Approved",  className: "bg-green-100 text-green-700" },
      { label: "Review",    className: "bg-amber-100 text-amber-700" },
      { label: "Suspended", className: "bg-red-100 text-red-700"     }
    ],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/>
      </svg>
    )
  },
  {
    to: "/master-data/locations/warehouse",
    accent: "#6366f1",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    title: "Warehouse Locations",
    description: "Warehouses, rooms, racks, shelves, pallet positions",
    pills: [
      { label: "Warehouses", className: "bg-green-100 text-green-700"  },
      { label: "Rooms",      className: "bg-indigo-100 text-indigo-700" },
      { label: "Positions",  className: "bg-slate-100 text-slate-700"  }
    ],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/>
      </svg>
    )
  },
  {
    to: "/master-data/qc-refs/specs",
    accent: "#8b5cf6",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    title: "Specs & MoA",
    description: "Material specifications, Method of Analysis, STPs",
    pills: [
      { label: "Current", className: "bg-green-100 text-green-700" },
      { label: "Draft",   className: "bg-amber-100 text-amber-700" },
      { label: "Expired", className: "bg-red-100 text-red-700"     }
    ],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
    )
  },
  {
    to: "/master-data/qc-refs/sampling-tools",
    accent: "#10b981",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    title: "Sampling Tools",
    description: "QC tools used in sampling planning and execution",
    pills: [
      { label: "Active", className: "bg-emerald-100 text-emerald-700" }
    ],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6h18M3 12h18M3 18h18"/>
      </svg>
    )
  },
  {
    to: "/master-data/partners/suppliers",
    accent: "#f59e0b",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    title: "Suppliers",
    description: "Inbound partner records and approved supplier contacts",
    pills: [
      { label: "Active", className: "bg-amber-100 text-amber-700" }
    ],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/>
      </svg>
    )
  }
];

// ─── Secondary nav definition (per section) ───────────────────────────────────

type SectionNavItem = { to: string; label: string; icon: React.ReactNode };

const sectionNavMap: Record<string, { label: string; accent: string; items: SectionNavItem[] }> = {
  materials: {
    label: "Materials",
    accent: "#0ea5e9",
    items: [
      {
        to: "/master-data/materials/materials",
        label: "Materials List",
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
        )
      },
      {
        to: "/master-data/materials/new",
        label: "New Material",
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
          </svg>
        )
      }
    ]
  },
  locations: {
    label: "Warehouse Locations",
    accent: "#6366f1",
    items: [
      {
        to: "/master-data/locations/warehouse",
        label: "Warehouse Map",
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4"/>
          </svg>
        )
      }
    ]
  },
  partners: {
    label: "Partners",
    accent: "#f97316",
    items: [
      {
        to: "/master-data/partners/suppliers",
        label: "Suppliers",
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/>
          </svg>
        )
      },
      {
        to: "/master-data/partners/vendors",
        label: "Vendors",
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"/>
          </svg>
        )
      },
      {
        to: "/master-data/partners/vendor-business-units",
        label: "Vendor BUs",
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m7-11h2m-2 4h2m-8 0h2m-2-4h2"/>
          </svg>
        )
      }
    ]
  },
  "qc-refs": {
    label: "QC References",
    accent: "#8b5cf6",
    items: [
      {
        to: "/master-data/qc-refs/specs",
        label: "Specs",
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        )
      },
      {
        to: "/master-data/qc-refs/moa",
        label: "MoA",
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
          </svg>
        )
      },
      {
        to: "/master-data/qc-refs/sampling-tools",
        label: "Sampling Tools",
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6h18M3 12h18M3 18h18"/>
          </svg>
        )
      }
    ]
  }
};

// ─── MasterDataLayout ─────────────────────────────────────────────────────────

export default function MasterDataLayout() {
  const location = useLocation();

  // Detect if we're on the hub (exactly /master-data or /master-data/)
  const isHub =
    location.pathname === "/master-data" || location.pathname === "/master-data/";

  // Extract the section segment: /master-data/<section>/...
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const currentSection = pathSegments[1] ?? "";
  const sectionNav = sectionNavMap[currentSection];

  if (isHub) {
    return (
      <div className="space-y-6">
        <SectionHeader
          eyebrow="Master Data"
          title="Master Data"
          description="Central configuration for materials, vendors, locations, and reference data"
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {hubCards.map((card) => (
            <NavLink
              key={card.to}
              to={card.to}
              className="block rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
              style={{ borderTopWidth: 3, borderTopColor: card.accent }}
            >
              <div className="mb-3 flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg} ${card.iconColor}`}>
                  {card.icon}
                </div>
              </div>
              <p className="font-bold text-ink">{card.title}</p>
              <p className="mt-1 text-xs text-slate">{card.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {card.pills.map((pill) => (
                  <span key={pill.label} className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${pill.className}`}>
                    {pill.label}
                  </span>
                ))}
              </div>
            </NavLink>
          ))}
        </div>
      </div>
    );
  }

  // Sub-section layout: secondary left nav + content
  return (
    <div className="flex gap-5">

      {/* Secondary left nav */}
      <aside className="hidden w-48 shrink-0 flex-col xl:flex">
        <div className="overflow-hidden rounded-2xl border border-blue-900/20 bg-[#1e3a8a] text-white shadow-sm">

          {/* Back to hub */}
          <NavLink
            to="/master-data"
            className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-[11px] font-medium text-blue-200 transition hover:bg-white/10 hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Master Data Hub
          </NavLink>

          {/* Section label */}
          {sectionNav && (
            <>
              <div className="px-4 pt-3 pb-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-300">
                  {sectionNav.label}
                </p>
              </div>

              <nav className="space-y-0.5 px-2 pb-3">
                {sectionNav.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium transition",
                        isActive
                          ? "bg-white/15 text-white"
                          : "text-blue-200 hover:bg-white/10 hover:text-white"
                      ].join(" ")
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span
                            className="absolute left-0 h-4 w-0.5 rounded-r-full bg-white"
                            style={{ marginLeft: 8 }}
                          />
                        )}
                        <span className="shrink-0">{item.icon}</span>
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
