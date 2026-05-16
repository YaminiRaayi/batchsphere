import { useCallback, useEffect, useRef, useState } from "react";

const IDLE_MS = 30 * 60 * 1000;      // 30 min → sign out
const WARN_MS = 25 * 60 * 1000;      // 25 min → show warning
const TICK_MS = 1_000;

type Props = { onTimeout: () => void };

export function SessionTimeoutModal({ onTimeout }: Props) {
  const lastActivityRef = useRef(Date.now());
  const [warnSecondsLeft, setWarnSecondsLeft] = useState<number | null>(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setWarnSecondsLeft(null);
  }, []);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetActivity, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, resetActivity));
  }, [resetActivity]);

  useEffect(() => {
    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= IDLE_MS) {
        clearInterval(interval);
        onTimeout();
      } else if (idle >= WARN_MS) {
        const remaining = Math.ceil((IDLE_MS - idle) / 1000);
        setWarnSecondsLeft(remaining);
      } else {
        setWarnSecondsLeft(null);
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [onTimeout]);

  if (warnSecondsLeft === null) return null;

  const mins = Math.floor(warnSecondsLeft / 60);
  const secs = warnSecondsLeft % 60;
  const display = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-amber-200 bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Session Expiring</p>
            <p className="mt-1 text-xs text-slate-500">
              Your session will expire in <span className="font-semibold text-amber-600">{display}</span> due to inactivity.
              For compliance with 21 CFR Part 11, unattended sessions are automatically terminated.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={resetActivity}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
          >
            Stay Logged In
          </button>
          <button
            onClick={onTimeout}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-500 hover:bg-slate-50"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
