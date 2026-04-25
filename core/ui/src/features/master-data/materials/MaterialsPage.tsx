import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMaterials } from "../../../lib/api";
import type { Material, MaterialCategory } from "../../../types/material";
import type { PageResponse } from "../../../types/grn";

// ─── Constants ────────────────────────────────────────────────────────────────

const categoryMeta: Record<string, { label: string; bg: string; text: string }> = {
  API:                { label: "API",          bg: "bg-sky-100",     text: "text-sky-700"     },
  EXCIPIENT:          { label: "Excipient",    bg: "bg-emerald-100", text: "text-emerald-700" },
  SOLVENT:            { label: "Solvent",      bg: "bg-cyan-100",    text: "text-cyan-700"    },
  PACKAGING_MATERIAL: { label: "Packaging",   bg: "bg-violet-100",  text: "text-violet-700"  },
  FINISHED_GOODS:     { label: "Finished Goods", bg: "bg-rose-100", text: "text-rose-700"    },
  REFERENCE_STANDARD: { label: "Ref. Std.",   bg: "bg-amber-100",   text: "text-amber-700"   }
};

const storageLabels: Record<string, string> = {
  AMBIENT: "Ambient, 15–30°C",
  ROOM_TEMPERATURE: "Room Temp",
  CONTROLLED_ROOM_TEMPERATURE: "Cool / Controlled",
  REFRIGERATED_2_TO_8C: "Refrigerated 2–8°C",
  COLD: "Frozen –20°C",
  DEEP_FREEZER: "Deep Frozen –80°C"
};

const filterTabs = [
  { key: "all",               label: "All"          },
  { key: "API",               label: "API"          },
  { key: "EXCIPIENT",         label: "Excipients"   },
  { key: "PACKAGING_MATERIAL",label: "Packaging"    },
  { key: "FINISHED_GOODS",    label: "Finished Goods" }
];

// ─── MaterialsPage ────────────────────────────────────────────────────────────

export default function MaterialsPage() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    fetchMaterials(0, 100)
      .then((res: PageResponse<Material>) => setMaterials(res.content))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const filtered =
    activeFilter === "all"
      ? materials
      : materials.filter((m) => m.materialCategory === activeFilter);

  function getCount(key: string) {
    if (key === "all") return materials.length;
    return materials.filter((m) => m.materialCategory === key).length;
  }

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Materials Master</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {materials.length} material{materials.length !== 1 ? "s" : ""} · API, Excipients, Packaging, Finished Goods
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate("/master-data/materials/new")}
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New Material
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import CSV
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition",
              activeFilter === tab.key
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-sky-200 bg-white text-sky-700 hover:bg-sky-50"
            ].join(" ")}
          >
            {tab.label} ({getCount(tab.key)})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">Loading materials…</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            No materials found. Click <strong>New Material</strong> to add one.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-sky-100 bg-sky-50/60">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Material Code
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Material Name
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  UOM
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Storage
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((material) => {
                const catKey = material.materialCategory ?? "";
                const catMeta = categoryMeta[catKey];
                return (
                  <tr
                    key={material.id}
                    className="cursor-pointer border-b border-sky-50 transition hover:bg-sky-50/50"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-sky-700">
                      {material.materialCode}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{material.materialName}</div>
                      {material.genericNames && (
                        <div className="text-[10px] text-slate-400">{material.genericNames}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {catMeta ? (
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${catMeta.bg} ${catMeta.text}`}>
                          {catMeta.label}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {material.uom.toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {storageLabels[material.storageCondition] ?? material.storageCondition}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                          material.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "h-1.5 w-1.5 rounded-full",
                            material.isActive ? "bg-green-500" : "bg-slate-400"
                          ].join(" ")}
                        />
                        {material.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            navigate("/master-data/materials/new", { state: { material } })
                          }
                          className="rounded-md border border-sky-200 px-2 py-1 text-[10px] font-medium text-sky-600 hover:bg-sky-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-sky-50 bg-sky-50/30 px-5 py-3">
            <span className="text-xs text-slate-400">
              Showing {filtered.length} of {materials.length} materials
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
