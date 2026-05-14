import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createESignature } from "../lib/api";
import type { ESignatureRecord } from "../types/sampling";

interface ESignatureDialogProps {
  entityType: string;
  entityId: string;
  action: string;
  defaultMeaning?: string;
  reason?: string;
  onSigned: (signature: ESignatureRecord) => void;
  visible: boolean;
  onClose: () => void;
}

export function ESignatureDialog({
  entityType,
  entityId,
  action,
  defaultMeaning = "",
  reason = "",
  onSigned,
  visible,
  onClose,
}: ESignatureDialogProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [meaning, setMeaning] = useState(defaultMeaning);
  const [inputReason, setInputReason] = useState(reason);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await createESignature({ entityType, entityId, action, meaning, reason: inputReason, username, password });
      queryClient.invalidateQueries({ queryKey: ["e-signatures", entityType, entityId] });
      onSigned(result);
      setUsername("");
      setPassword("");
      setMeaning(defaultMeaning);
      setInputReason(reason);
      setError(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsPending(false);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-50 w-full max-w-md rounded-2xl border border-ink/10 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-ink">Electronic Signature</h3>
            <p className="text-xs text-slate mt-0.5">21 CFR Part 11 / EU GMP Annex 11 compliant</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate hover:bg-ink/5 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form className="p-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="esig-username" className="block text-sm font-medium text-ink mb-1.5">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              id="esig-username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="w-full rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink shadow-sm placeholder:text-slate/50 focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel transition-colors"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="esig-password" className="block text-sm font-medium text-ink mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="esig-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink shadow-sm placeholder:text-slate/50 focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="esig-meaning" className="block text-sm font-medium text-ink mb-1.5">
              Meaning / Intent <span className="text-red-500">*</span>
            </label>
            <input
              id="esig-meaning"
              name="meaning"
              type="text"
              autoComplete="off"
              required
              placeholder="e.g. I approve this document"
              className="w-full rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink shadow-sm placeholder:text-slate/50 focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel transition-colors"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="esig-reason" className="block text-sm font-medium text-ink mb-1.5">
              Reason {reason || inputReason ? <span className="text-red-500">*</span> : "(optional)"}
            </label>
            <textarea
              id="esig-reason"
              name="reason"
              rows={3}
              placeholder="Explain the reason for this action..."
              className="w-full rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink shadow-sm placeholder:text-slate/50 focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel transition-colors resize-none"
              value={inputReason}
              onChange={(e) => setInputReason(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-500">
              Action: <span className="font-medium text-slate-800">{action}</span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-ink/10 px-4 py-2.5 text-sm font-medium text-ink hover:bg-ink/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !username || !password || !meaning}
                className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Sign
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
