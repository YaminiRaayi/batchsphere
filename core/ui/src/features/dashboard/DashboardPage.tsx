import { SectionHeader } from "../../components/SectionHeader";

const kpis = [
  { label: "Inbound receipts", value: "12", tone: "bg-amber/15 text-amber", note: "Awaiting dock and document confirmation" },
  { label: "Quarantine containers", value: "184", tone: "bg-steel/15 text-steel", note: "Material isolated until QC disposition" },
  { label: "Sampling worklist", value: "09", tone: "bg-teal/15 text-teal", note: "Plans pending definition or completion" },
  { label: "Released stock lots", value: "67", tone: "bg-moss/15 text-moss", note: "Available to production and dispatch" }
];

const commandLanes = [
  {
    title: "Warehouse execution",
    accent: "bg-amber/15 text-amber",
    items: [
      ["GRN-2048", "Citric Acid", "Receive before 14:00"],
      ["GRN-2051", "Lactose Monohydrate", "Storage validation pending"]
    ]
  },
  {
    title: "Quality orchestration",
    accent: "bg-teal/15 text-teal",
    items: [
      ["SMP-114", "Magnesium Stearate", "Sampling request will be created"],
      ["SMP-118", "MCC", "COA-based review awaiting analyst signoff"]
    ]
  },
  {
    title: "Inventory control",
    accent: "bg-steel/15 text-steel",
    items: [
      ["INV-07", "RM-A-14 pallet", "Relocate from quarantine to released zone"],
      ["INV-09", "Cold chain shelf", "Temperature trace ready for review"]
    ]
  }
];

const roadmap = [
  ["Current operating domains", "Warehouse master, GRN intake, pallet traceability, QC sampling, inventory status."],
  ["Near-term expansion", "QMS events, CAPA, change control, supplier quality, audit readiness."],
  ["Strategic platform layer", "LIMS, controlled documents, training, analytics, and enterprise quality connectivity."]
];

const movements = [
  ["INV", "GRN receipt posted for BAT-001", "5 minutes ago"],
  ["QC", "Sampling plan approved for 2 containers", "28 minutes ago"],
  ["LOC", "Pallet RM-A-14 linked to room cold chain", "1 hour ago"],
  ["DOC", "COA attached to inbound lot documentation", "2 hours ago"]
];

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Platform Overview"
        title="A modular GMP operations workspace, not a single-purpose warehouse screen"
        description="The visual model now follows a platform pattern: a strong parent identity with multiple regulated capability areas underneath. That is a better fit for your roadmap than a TrackWise-only style product page."
      />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="panel-dark overflow-hidden px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">
            Platform Narrative
          </p>
          <h4 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight text-white">
            Build one regulated operations layer now, then expand it into quality, lab, and
            document ecosystems later.
          </h4>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Warehouse Management", "Sampling", "Inventory", "QC", "QMS", "LIMS", "DMS"].map(
              (item) => (
                <span key={item} className="module-chip border-white/14 bg-white/6 text-white/76">
                  {item}
                </span>
              )
            )}
          </div>
        </article>

        <article className="panel px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate">
            Design Recommendation
          </p>
          <div className="mt-4 space-y-4 text-sm leading-6 text-slate">
            <p>
              Keep the TrackWise inspiration at the platform-architecture level: capability-led,
              enterprise, regulated, expandable.
            </p>
            <p>
              Do not mimic the marketing site literally. Your product UI should feel like an
              operations cockpit with clear queues, compliance state, and module boundaries.
            </p>
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="panel px-5 py-5">
            <span className={`status-pill ${kpi.tone}`}>{kpi.label}</span>
            <p className="mt-5 text-4xl font-semibold text-ink">{kpi.value}</p>
            <p className="mt-3 text-sm leading-6 text-slate">{kpi.note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="panel px-6 py-6">
          <h4 className="font-display text-2xl font-semibold text-ink">Operational command lanes</h4>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {commandLanes.map((lane) => (
              <div key={lane.title} className="rounded-[24px] border border-ink/10 bg-white p-4">
                <span className={`status-pill ${lane.accent}`}>{lane.title}</span>
                <div className="mt-4 space-y-3">
                  {lane.items.map(([id, material, note]) => (
                    <div key={id} className="rounded-2xl border border-ink/10 bg-mist/50 px-4 py-4">
                      <p className="text-sm font-semibold text-ink">{id}</p>
                      <p className="mt-1 text-sm text-slate">{material}</p>
                      <p className="mt-3 text-sm leading-6 text-slate">{note}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel px-6 py-6">
          <h4 className="font-display text-2xl font-semibold text-ink">Expansion map</h4>
          <div className="mt-5 space-y-4">
            {roadmap.map(([title, note]) => (
              <div key={title} className="rounded-[24px] border border-ink/10 px-4 py-4">
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate">{note}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="panel px-6 py-6">
          <h4 className="font-display text-2xl font-semibold text-ink">Why this direction fits</h4>
          <div className="mt-5 grid gap-4">
            {[
              ["TrackWise-like strength", "Capability-led enterprise framing, not page-by-page clutter."],
              ["Better for product growth", "New domains can arrive as first-class modules instead of ad hoc menu additions."],
              ["Better for users", "Warehouse users, QC analysts, and compliance teams can share one platform language."]
            ].map(([title, note]) => (
              <div key={title} className="rounded-[22px] border border-ink/10 bg-cloud px-4 py-4">
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate">{note}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel px-6 py-6">
          <h4 className="font-display text-2xl font-semibold text-ink">Recent activity</h4>
          <div className="mt-5 space-y-4">
            {movements.map(([type, message, when]) => (
              <div key={message} className="flex gap-4 rounded-[22px] border border-ink/10 px-4 py-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy text-xs font-semibold text-white">
                  {type}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{message}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate">{when}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
