import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import {
  disposeRetentionSample,
  fetchRetentionSampleById,
  retrieveRetentionSample
} from "../../lib/api";
import type { DisposeRetentionSampleRequest, RetrieveRetentionSampleRequest } from "../../types/retention-sample";
import { useAuthStore } from "../../stores/authStore";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start">
      <span className="w-44 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-xs text-slate-700">{value ?? "—"}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TimelineStep({ label, actor, timestamp, done }: { label: string; actor?: string | null; timestamp?: string | null; done: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold ${done ? "border-teal-500 bg-teal-500 text-white" : "border-slate-200 bg-white text-slate-300"}`}>
        {done ? "✓" : "·"}
      </div>
      <div>
        <p className={`text-xs font-semibold ${done ? "text-slate-700" : "text-slate-300"}`}>{label}</p>
        {done && actor && <p className="text-[10px] text-slate-400">{actor}{timestamp ? ` · ${new Date(timestamp).toLocaleString()}` : ""}</p>}
      </div>
    </div>
  );
}

export function RetentionSampleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const isManager = authUser?.role === "QC_MANAGER" || authUser?.role === "SUPER_ADMIN";

  const [retrieveOpen, setRetrieveOpen] = useState(false);
  const [disposeOpen, setDisposeOpen] = useState(false);
  const [retrieveForm, setRetrieveForm] = useState<RetrieveRetentionSampleRequest>({ retrievalReason: "", testResultReference: "" });
  const [disposeForm, setDisposeForm] = useState<DisposeRetentionSampleRequest>({ disposalReason: "", disposalMethod: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: sample, isLoading, error } = useQuery({
    queryKey: ["retention-sample", id],
    queryFn: () => fetchRetentionSampleById(id!),
    enabled: !!id
  });

  const retrieveMutation = useMutation({
    mutationFn: (payload: RetrieveRetentionSampleRequest) => retrieveRetentionSample(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retention-sample", id] });
      queryClient.invalidateQueries({ queryKey: ["retention-samples"] });
      queryClient.invalidateQueries({ queryKey: ["retention-sample-summary"] });
      setRetrieveOpen(false);
    },
    onError: (err: Error) => setFormError(err.message)
  });

  const disposeMutation = useMutation({
    mutationFn: (payload: DisposeRetentionSampleRequest) => disposeRetentionSample(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retention-sample", id] });
      queryClient.invalidateQueries({ queryKey: ["retention-samples"] });
      queryClient.invalidateQueries({ queryKey: ["retention-sample-summary"] });
      setDisposeOpen(false);
    },
    onError: (err: Error) => setFormError(err.message)
  });

  function handleRetrieve(e: FormEvent) {
    e.preventDefault();
    if (!retrieveForm.retrievalReason.trim()) { setFormError("Retrieval reason is required"); return; }
    setFormError(null);
    retrieveMutation.mutate(retrieveForm);
  }

  function handleDispose(e: FormEvent) {
    e.preventDefault();
    if (!disposeForm.disposalReason.trim()) { setFormError("Disposal reason is required"); return; }
    if (!disposeForm.disposalMethod.trim()) { setFormError("Disposal method is required"); return; }
    setFormError(null);
    disposeMutation.mutate(disposeForm);
  }

  if (isLoading) return <div className="p-8 text-center text-xs text-slate-400">Loading…</div>;
  if (error || !sample) return <div className="p-8 text-center text-xs text-red-500">Failed to load retention sample.</div>;

  const daysLeft = sample.daysUntilExpiry;
  const daysClass = sample.status === "STORED"
    ? daysLeft < 0 ? "text-red-600" : daysLeft <= 30 ? "text-red-500" : daysLeft <= 60 ? "text-amber-500" : "text-green-600"
    : "text-slate-400";

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-xs text-slate-400 hover:text-slate-600">← Back</button>
        <div>
          <h1 className="text-lg font-bold text-slate-800">{sample.lotNumber}</h1>
          <p className="text-[10px] text-slate-400">Retention Sample · EU GMP Annex 19</p>
        </div>
        <span className="ml-auto text-xs font-semibold rounded-full px-3 py-1 bg-slate-100 text-slate-600">{sample.status}</span>
      </div>

      {/* Days indicator */}
      {sample.status === "STORED" && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${daysLeft < 0 ? "border-red-200 bg-red-50 text-red-600" : daysLeft <= 30 ? "border-red-100 bg-red-50 text-red-500" : daysLeft <= 60 ? "border-amber-100 bg-amber-50 text-amber-600" : "border-green-100 bg-green-50 text-green-600"}`}>
          {daysLeft < 0 ? `⚠ Overdue for disposal by ${Math.abs(daysLeft)} days` : `${daysLeft} days remaining until ${sample.retentionUntil}`}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Storage Details">
          <InfoRow label="Material" value={sample.materialName} />
          <InfoRow label="Lot Number" value={<span className="font-mono font-semibold">{sample.lotNumber}</span>} />
          <InfoRow label="Quantity" value={`${sample.quantity} ${sample.uom}`} />
          <InfoRow label="Container" value={sample.containerDescription} />
          <InfoRow label="Storage Location" value={sample.storageLocation} />
          <InfoRow label="Storage Condition" value={sample.storageCondition} />
          <InfoRow label="Retention Until" value={<span className={daysClass}>{sample.retentionUntil}</span>} />
          <InfoRow label="Received By" value={sample.receivedBy} />
          <InfoRow label="Received At" value={new Date(sample.receivedAt).toLocaleString()} />
        </SectionCard>

        <SectionCard title="Lifecycle Timeline">
          <div className="space-y-4">
            <TimelineStep label="Stored" actor={sample.receivedBy} timestamp={sample.receivedAt} done={true} />
            <TimelineStep label="Retrieved" actor={sample.retrievedBy} timestamp={sample.retrievedAt} done={!!sample.retrievedAt} />
            {sample.retrievedAt && sample.testResultReference && (
              <div className="ml-8 rounded-lg bg-slate-50 p-2 text-[10px] text-slate-500">
                Test ref: <span className="font-mono text-slate-700">{sample.testResultReference}</span>
              </div>
            )}
            <TimelineStep label="Disposed" actor={sample.disposedBy} timestamp={sample.disposedAt} done={!!sample.disposedAt} />
          </div>
        </SectionCard>

        {sample.retrievedAt && (
          <SectionCard title="Retrieval Record">
            <InfoRow label="Retrieved By" value={sample.retrievedBy} />
            <InfoRow label="Retrieved At" value={sample.retrievedAt ? new Date(sample.retrievedAt).toLocaleString() : null} />
            <InfoRow label="Reason" value={sample.retrievalReason} />
            <InfoRow label="Test Result Ref" value={sample.testResultReference} />
          </SectionCard>
        )}

        {sample.disposedAt && (
          <SectionCard title="Disposal Record">
            <InfoRow label="Disposed By" value={sample.disposedBy} />
            <InfoRow label="Disposed At" value={sample.disposedAt ? new Date(sample.disposedAt).toLocaleString() : null} />
            <InfoRow label="Reason" value={sample.disposalReason} />
            <InfoRow label="Method" value={sample.disposalMethod} />
          </SectionCard>
        )}
      </div>

      {/* Actions */}
      {sample.status === "STORED" && (
        <div className="flex gap-3">
          <button
            onClick={() => { setRetrieveOpen(true); setFormError(null); }}
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
          >
            Record Retrieval
          </button>
          {isManager && (
            <button
              onClick={() => { setDisposeOpen(true); setFormError(null); }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Record Disposal
            </button>
          )}
        </div>
      )}

      {sample.status === "RETRIEVED" && isManager && (
        <button
          onClick={() => { setDisposeOpen(true); setFormError(null); }}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Record Disposal
        </button>
      )}

      {/* Retrieval modal */}
      {retrieveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-sm font-bold text-slate-800">Record Retrieval</h2>
            <form onSubmit={handleRetrieve} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Retrieval Reason *</label>
                <textarea required rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-400"
                  value={retrieveForm.retrievalReason}
                  onChange={(e) => setRetrieveForm({ ...retrieveForm, retrievalReason: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Test Result Reference</label>
                <input type="text"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-400"
                  value={retrieveForm.testResultReference ?? ""}
                  onChange={(e) => setRetrieveForm({ ...retrieveForm, testResultReference: e.target.value })} />
              </div>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setRetrieveOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2 text-xs text-slate-600">Cancel</button>
                <button type="submit" disabled={retrieveMutation.isPending}
                  className="flex-1 rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {retrieveMutation.isPending ? "Saving…" : "Confirm Retrieval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disposal modal */}
      {disposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-sm font-bold text-slate-800">Record Disposal</h2>
            <p className="mb-4 text-xs text-slate-500">QC Manager authorization required. This action is permanent and auditable.</p>
            <form onSubmit={handleDispose} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Disposal Reason *</label>
                <textarea required rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-400"
                  value={disposeForm.disposalReason}
                  onChange={(e) => setDisposeForm({ ...disposeForm, disposalReason: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Disposal Method *</label>
                <input type="text" required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-400"
                  placeholder="e.g. Incineration, Chemical neutralisation…"
                  value={disposeForm.disposalMethod}
                  onChange={(e) => setDisposeForm({ ...disposeForm, disposalMethod: e.target.value })} />
              </div>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setDisposeOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2 text-xs text-slate-600">Cancel</button>
                <button type="submit" disabled={disposeMutation.isPending}
                  className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                  {disposeMutation.isPending ? "Saving…" : "Confirm Disposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
