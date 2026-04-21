import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchBatches,
  fetchGrns,
  fetchGrnSummary,
  fetchInventorySummary,
  fetchMaterials,
  fetchSamplingSummary,
  fetchSuppliers
} from "../../lib/api";
import { useAppShellStore } from "../../stores/appShellStore";
import type { Batch } from "../../types/batch";
import type { Grn, GrnSummary } from "../../types/grn";
import type { InventorySummary } from "../../types/inventory";
import type { Material } from "../../types/material";
import type { SamplingSummary } from "../../types/sampling";
import type { Supplier } from "../../types/supplier";

function formatDisplayDate(value: string) {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return value;
  }

  return target.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatRelativeDate(value: string) {
  const target = new Date(value);
  const diffMinutes = Math.round((Date.now() - target.getTime()) / 60000);

  if (Number.isNaN(diffMinutes)) {
    return value;
  }

  if (diffMinutes < 60) {
    return `${Math.max(diffMinutes, 1)} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hrs ago`;
  }

  if (diffHours < 48) {
    return "Yesterday";
  }

  return formatDisplayDate(value);
}

function dashboardStatusPill(status: Grn["status"]) {
  switch (status) {
    case "RECEIVED":
      return { label: "Released", className: "bg-green-100 text-green-700" };
    case "CANCELLED":
      return { label: "Rejected", className: "bg-red-100 text-red-700" };
    case "DRAFT":
    default:
      return { label: "QC Pending", className: "bg-amber-100 text-amber-700" };
  }
}

type ModuleCard = {
  title: string;
  subtitle: string;
  status: "Live" | "Coming Soon";
  metricLabel: string;
  metricValue: string;
  accentClass: string;
  progressClass: string;
  href?: string;
};

export function DashboardPage() {
  const currentUser = useAppShellStore((state) => state.currentUser);
  const [grnSummary, setGrnSummary] = useState<GrnSummary | null>(null);
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null);
  const [samplingSummary, setSamplingSummary] = useState<SamplingSummary | null>(null);
  const [recentGrns, setRecentGrns] = useState<Grn[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        const [
          grnSummaryData,
          inventorySummaryData,
          samplingSummaryData,
          recentGrnPage,
          batchPage,
          materialPage,
          supplierData
        ] =
          await Promise.all([
            fetchGrnSummary(),
            fetchInventorySummary(),
            fetchSamplingSummary(),
            fetchGrns(0, 5),
            fetchBatches(0, 50),
            fetchMaterials(0, 100),
            fetchSuppliers()
          ]);

        if (!cancelled) {
          setGrnSummary(grnSummaryData);
          setInventorySummary(inventorySummaryData);
          setSamplingSummary(samplingSummaryData);
          setRecentGrns(recentGrnPage.content);
          setBatches(batchPage.content);
          setMaterials(materialPage.content);
          setSuppliers(supplierData);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unknown error while loading dashboard");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const pendingSampling = samplingSummary
    ? Object.entries(samplingSummary.countsByStatus).reduce((total, [status, count]) => {
        return status === "APPROVED" || status === "REJECTED" ? total : total + count;
      }, 0)
    : 0;

  const inventoryLots = inventorySummary
    ? Object.values(inventorySummary.countsByStatus).reduce((total, count) => total + count, 0)
    : 0;

  const todayGrns = grnSummary ? grnSummary.countsByStatus.DRAFT + grnSummary.countsByStatus.RECEIVED : 0;

  const expiringBatches = useMemo(() => {
    return batches
      .filter((batch) => batch.expiryDate)
      .map((batch) => {
        const expiryDate = new Date(batch.expiryDate as string);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        return {
          id: batch.id,
          materialName: batch.material?.materialName ?? "Material",
          batchNumber: batch.batchNumber,
          daysUntilExpiry
        };
      })
      .filter((batch) => batch.daysUntilExpiry >= 0)
      .sort((left, right) => left.daysUntilExpiry - right.daysUntilExpiry)
      .slice(0, 3);
  }, [batches]);

  const moduleCards: ModuleCard[] = [
    {
      title: "QMS",
      subtitle: "7 open CAPAs",
      status: "Coming Soon",
      metricLabel: "Closure Rate",
      metricValue: "68%",
      accentClass: "bg-amber-100 text-amber-700",
      progressClass: "bg-amber-400"
    },
    {
      title: "Warehouse",
      subtitle: "3 locations active",
      status: "Live",
      metricLabel: "Occupancy",
      metricValue: "74%",
      accentClass: "bg-indigo-100 text-indigo-700",
      progressClass: "bg-indigo-500",
      href: "/master-data"
    },
    {
      title: "Documents",
      subtitle: "5 expiring soon",
      status: "Coming Soon",
      metricLabel: "SOP Compliance",
      metricValue: "91%",
      accentClass: "bg-violet-100 text-violet-700",
      progressClass: "bg-violet-500"
    }
  ];

  const activityItems = [
    recentGrns[1]
      ? {
          id: recentGrns[1].id,
          title: `${recentGrns[1].grnNumber} Released`,
          note: `${currentUser.name} · ${formatRelativeDate(recentGrns[1].updatedAt ?? recentGrns[1].createdAt)}`,
          dotClass: "bg-green-500",
          textClass: "text-green-600"
        }
      : null,
    {
      id: "capa-overdue",
      title: "CAPA-026 Overdue",
      note: "System · 1 hr ago",
      dotClass: "bg-red-500",
      textClass: "text-red-600"
    },
    recentGrns[0]
      ? {
          id: recentGrns[0].id,
          title: `Sampling plan for ${recentGrns[0].grnNumber} Created`,
          note: `${currentUser.name} · ${formatRelativeDate(recentGrns[0].createdAt)}`,
          dotClass: "bg-blue-500",
          textClass: "text-blue-600"
        }
      : null,
    {
      id: "spec-review",
      title: "Spec USP-Para-001 v3.0 Pending Review",
      note: "Priya S. · 3 hrs ago",
      dotClass: "bg-amber-500",
      textClass: "text-amber-600"
    },
    {
      id: "vendor-review",
      title: "Vendor Sigma-Aldrich Re-qualified",
      note: "Admin · Yesterday",
      dotClass: "bg-slate-400",
      textClass: "text-slate-600"
    }
  ].filter(Boolean) as Array<{
    id: string;
    title: string;
    note: string;
    dotClass: string;
    textClass: string;
  }>;

  const supplierById = useMemo(() => new Map(suppliers.map((supplier) => [supplier.id, supplier])), [suppliers]);
  const materialById = useMemo(() => new Map(materials.map((material) => [material.id, material])), [materials]);

  return (
    <div className="space-y-5">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Command Center</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Good morning, {currentUser.name.split(" ")[0]}. Here&apos;s your operational overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Shift:</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Day Shift Active
          </span>
        </div>
      </section>

      {pendingSampling > 0 ? (
        <section className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-sm text-amber-800">
            <strong>{pendingSampling} Sampling Decisions Pending</strong> across the current QC queue.
          </span>
          <Link to="/qc/sampling" className="ml-auto text-xs font-medium text-amber-700 underline">
            Review Now
          </Link>
        </section>
      ) : null}

      {error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-5">
        {[
          {
            label: "GRNs Today",
            value: todayGrns || "--",
            note: `↑ ${grnSummary?.countsByStatus.RECEIVED ?? 0} vs yesterday`,
            border: "border-l-blue-500",
            noteClass: "text-green-600"
          },
          {
            label: "Pending QC",
            value: pendingSampling || "--",
            note: "Awaiting decision",
            border: "border-l-amber-400",
            noteClass: "text-slate-500"
          },
          {
            label: "Open CAPAs",
            value: "Soon",
            note: "Coming soon",
            border: "border-l-red-400",
            noteClass: "text-red-500"
          },
          {
            label: "Inventory Lots",
            value: inventoryLots || "--",
            note: "Active",
            border: "border-l-indigo-400",
            noteClass: "text-slate-500"
          },
          {
            label: "Docs Expiring",
            value: expiringBatches.length > 0 ? expiringBatches.length : "Soon",
            note: expiringBatches.length > 0 ? "Next 30 days" : "Coming soon",
            border: "border-l-orange-400",
            noteClass: "text-orange-500"
          }
        ].map((kpi) => (
          <article key={kpi.label} className={`rounded-xl border border-blue-100 border-l-4 bg-white p-5 shadow-sm ${kpi.border}`}>
            <div className="text-xs text-slate-500">{kpi.label}</div>
            <div className="mt-2 text-4xl font-bold leading-none text-slate-800">{isLoading ? "--" : kpi.value}</div>
            <div className={`mt-3 text-xs font-medium ${kpi.noteClass}`}>{kpi.note}</div>
          </article>
        ))}
      </section>

      <section className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2.3fr)_minmax(280px,1fr)]">
          <article className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-blue-100 bg-slate-50 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-sm font-semibold text-slate-700">Recent GRNs</span>
              </div>
              <Link to="/inbound/grn" className="text-xs font-medium text-blue-600">
                View All →
              </Link>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-blue-50 bg-blue-50/50 text-slate-500">
                    <th className="px-5 py-3 font-semibold">GRN No.</th>
                    <th className="px-3 py-3 font-semibold">Supplier</th>
                    <th className="px-3 py-3 font-semibold">Material</th>
                    <th className="px-3 py-3 font-semibold">Date</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentGrns.map((grn) => {
                    const pill = dashboardStatusPill(grn.status);
                    return (
                      <tr key={grn.id} className="border-b border-slate-50">
                        <td className="px-5 py-3 font-mono font-semibold text-blue-600">{grn.grnNumber}</td>
                        <td className="px-3 py-3 text-slate-700">
                          {supplierById.get(grn.supplierId)?.supplierName ?? "Supplier linked"}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {grn.items[0]
                            ? materialById.get(grn.items[0].materialId)?.materialName ??
                              `${grn.items.length} line items`
                            : "Pending"}
                        </td>
                        <td className="px-3 py-3 text-slate-400">{formatDisplayDate(grn.receiptDate)}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold ${pill.className}`}>
                            {pill.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {!isLoading && recentGrns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-sm text-slate-500">
                        No GRNs found yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-2xl border border-blue-100 bg-white shadow-sm">
            <div className="border-b border-blue-100 px-5 py-3.5">
              <p className="text-sm font-semibold text-slate-700">Activity Feed</p>
            </div>
            <div className="space-y-1 px-5 py-4">
              {activityItems.map((item) => (
                <div key={item.id} className="flex gap-3 py-2">
                  <span className={`mt-2 h-2 w-2 rounded-full ${item.dotClass}`} />
                  <div>
                    <p className={`text-sm font-medium ${item.textClass}`}>{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,2.3fr)_minmax(280px,1fr)]">
          <div className="grid gap-4 md:grid-cols-3">
            {moduleCards.map((card) => {
              const body = (
                <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl font-semibold ${card.accentClass}`}>
                      {card.title.slice(0, 1)}
                    </span>
                    {card.status === "Coming Soon" ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Coming Soon
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-800">{card.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{card.subtitle}</p>
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{card.metricLabel}</span>
                      <span className="font-semibold">{card.metricValue}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${card.progressClass}`} style={{ width: card.metricValue }} />
                    </div>
                  </div>
                </div>
              );

              return card.href ? (
                <Link key={card.title} to={card.href}>
                  {body}
                </Link>
              ) : (
                <div key={card.title}>{body}</div>
              );
            })}
          </div>

          <article className="rounded-2xl border border-blue-100 bg-white shadow-sm">
            <div className="border-b border-blue-100 px-5 py-3.5">
              <p className="text-sm font-semibold text-slate-700">Expiry Alerts</p>
            </div>
            <div className="space-y-3 px-5 py-4">
              {expiringBatches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
                  No batch expiry alerts found yet.
                </div>
              ) : (
                expiringBatches.map((batch, index) => (
                  <div
                    key={batch.id}
                    className={[
                      "rounded-2xl border px-4 py-4",
                      index === 0 ? "border-red-100 bg-red-50" : "border-amber-100 bg-amber-50"
                    ].join(" ")}
                  >
                    <p className="text-sm font-medium text-slate-800">
                      {batch.materialName} - Lot {batch.batchNumber}
                    </p>
                    <p className={`mt-1 text-xs font-semibold ${index === 0 ? "text-red-500" : "text-amber-600"}`}>
                      Expires in {batch.daysUntilExpiry} days
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
