import { NavLink, Outlet } from "react-router-dom";
import { SectionHeader } from "../../components/SectionHeader";
import { masterDataNavGroups } from "./masterDataNavigation";

export default function MasterDataLayout() {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Master Data"
        title="Reference entities drive every transaction downstream"
        description="The master-data area is now routed by domain so suppliers, materials, warehouse locations, and QC references can evolve independently."
      />

      <section className="grid gap-4 xl:grid-cols-3">
        {masterDataNavGroups.map((group) => (
          <article key={group.title} className="panel px-5 py-5">
            <span className={`status-pill ${group.accent}`}>
              {group.title}
            </span>
            <p className="mt-3 text-sm leading-6 text-slate">{group.description}</p>
            <div className="mt-5 grid gap-2">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      "rounded-2xl border px-4 py-3 text-sm transition",
                      isActive
                        ? "border-slate-300 bg-slate-50 text-ink"
                        : "border-ink/10 bg-white text-slate-700 hover:bg-slate-50"
                    ].join(" ")
                  }
                >
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 opacity-80">{item.description}</p>
                </NavLink>
              ))}
            </div>
          </article>
        ))}
      </section>

      <Outlet />
    </div>
  );
}
