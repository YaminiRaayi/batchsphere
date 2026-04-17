import { Link } from "react-router-dom";

export function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] px-6 py-12">
      <div className="mx-auto flex max-w-3xl flex-col items-center rounded-[32px] border border-white/70 bg-white/90 px-10 py-16 text-center shadow-card backdrop-blur">
        <span className="rounded-full bg-redoxide/10 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-redoxide">
          Access Denied
        </span>
        <h1 className="mt-6 text-4xl font-semibold leading-tight text-ink">
          Your account is authenticated, but this module is outside your current role access.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">
          This screen is protected by frontend route checks that mirror the backend role rules. If you need this area,
          update the assigned role or switch to an authorized account.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
          >
            Go to command center
          </Link>
          <Link
            to="/login"
            className="rounded-2xl border border-ink/10 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-slate-50"
          >
            Switch account
          </Link>
        </div>
      </div>
    </div>
  );
}
